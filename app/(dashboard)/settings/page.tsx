"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Settings, Bell, Users, Puzzle, CreditCard,
  Upload, X, Download, CheckCircle, Globe,
  Package, Lock, Eye, EyeOff, Palette,
  Mail, Webhook, UserPlus, Trash2, ChevronDown,
  Activity, RefreshCw, ChevronLeft, ChevronRight,
  Check, AlertCircle, Tag, Zap, HardDrive, Brain, Receipt, ExternalLink,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useBranding } from "@/contexts/BrandingContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useSites } from "@/hooks/useSites";
import { setAgency } from "@/lib/auth";
import api from "@/lib/api";
import { PLAN_LABELS, PLAN_LIMITS, PLAN_SEATS, PLAN_PRICES, PLAN_FEATURES, PLAN_STORAGE_LIMITS, API_BASE_URL } from "@/lib/constants";
import { isValidEmail } from "@/lib/utils";
import type { AlertSettings, TeamMember, TeamRole, Site } from "@/types";

// ── Shared helpers ─────────────────────────────────────────────────────────────

type Tab = "general" | "branding" | "notifications" | "activity" | "team" | "integrations" | "billing";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general",       label: "General",            icon: Settings   },
  { id: "branding",      label: "Branding",           icon: Palette    },
  { id: "notifications", label: "Notifications",      icon: Bell       },
  { id: "activity",      label: "Activity Log",       icon: Activity   },
  { id: "team",          label: "Team",               icon: Users      },
  { id: "integrations",  label: "API & Integrations", icon: Puzzle     },
  { id: "billing",       label: "Billing",            icon: CreditCard },
];

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  owner:   { bg: "#7c3aed15", text: "#7c3aed" },
  admin:   { bg: "#2563eb15", text: "#2563eb" },
  manager: { bg: "#16a34a15", text: "#16a34a" },
  analyst: { bg: "#71717a15", text: "#52525b" },
  viewer:  { bg: "#0ea5e915", text: "#0284c7" },
};

const ROLE_STYLE: Record<TeamRole, string> = {
  owner:   "bg-purple-100 text-purple-700",
  admin:   "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  analyst: "bg-gray-100 text-gray-600",
  viewer:  "bg-sky-100 text-sky-700",
};

const ROLE_OPTIONS: { value: Exclude<TeamRole, "owner">; label: string }[] = [
  { value: "admin",   label: "Admin"   },
  { value: "manager", label: "Manager" },
  { value: "analyst", label: "Analyst" },
  { value: "viewer",  label: "Viewer"  },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  site_added:        { label: "Site Added",       color: "bg-green-100 text-green-700"   },
  site_deleted:      { label: "Site Deleted",     color: "bg-red-100 text-red-700"       },
  bulk_run_audit:    { label: "Bulk Audit",        color: "bg-indigo-100 text-indigo-700" },
  bulk_trigger_scan: { label: "Bulk Scan",         color: "bg-purple-100 text-purple-700" },
  bulk_send_report:  { label: "Bulk Report",       color: "bg-blue-100 text-blue-700"    },
  audit_triggered:   { label: "Audit Triggered",  color: "bg-indigo-100 text-indigo-700" },
  report_sent:       { label: "Report Sent",       color: "bg-blue-100 text-blue-700"    },
  plugin_connected:  { label: "Plugin Connected",  color: "bg-green-100 text-green-700"  },
};

const PLANS = ["free", "freemium", "premium", "agency_plus"] as const;
type PlanKey = typeof PLANS[number];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_STYLE[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function ThresholdSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgb(229 231 235) ${value}%, rgb(229 231 235) 100%)` }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>0</span>
        <span>Alert when score drops below {value}</span>
        <span>100</span>
      </div>
    </div>
  );
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total >= 9999 ? 0 : Math.min(100, (used / total) * 100);
  const isNearLimit = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{used} / {total >= 9999 ? "∞" : total}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        {total < 9999 && (
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: isNearLimit ? "var(--score-bad)" : "var(--accent)" }} />
        )}
      </div>
    </div>
  );
}

// ── GENERAL TAB ────────────────────────────────────────────────────────────────

function GeneralTab() {
  const { agency, updateAgency } = useAuth();
  const { role } = useRole();
  const isOwner = role === "owner";

  const displayName = isOwner ? (agency?.name ?? "") : (agency?.member_name ?? agency?.name ?? "");
  const [name, setName]               = useState(displayName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [pwSaving, setPwSaving]       = useState(false);

  async function saveProfile() {
    if (!name.trim()) return;
    setProfileSaving(true);
    try {
      const { data } = await api.put<{ name: string }>("/auth/profile", { name: name.trim() });
      if (isOwner) updateAgency({ name: data.name });
      else updateAgency({ member_name: data.name });
      toast.success("Profile updated.");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to save.");
    } finally { setProfileSaving(false); }
  }

  async function changePassword() {
    if (!currentPw || !newPw || !confirmPw) { toast.error("All fields are required."); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match."); return; }
    setPwSaving(true);
    try {
      await api.put("/auth/password", { current_password: currentPw, new_password: newPw });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password changed.");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to change password.");
    } finally { setPwSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Agency info */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{isOwner ? "Agency Information" : "Your Profile"}</h3>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{isOwner ? "Agency Name" : "Your Name"}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isOwner ? "Acme Agency" : "Jane Smith"}
            onKeyDown={(e) => e.key === "Enter" && saveProfile()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
          <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground select-all">{agency?.email ?? "—"}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Plan</label>
          <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground capitalize flex items-center justify-between">
            <span>{agency?.plan ?? "free"}</span>
            <button onClick={() => (document.querySelector('[data-tab="billing"]') as HTMLButtonElement)?.click()}
              className="text-xs font-medium text-accent hover:underline">Upgrade</button>
          </div>
        </div>
        <Button onClick={saveProfile} loading={profileSaving} disabled={!name.trim() || name.trim() === displayName} className="w-full">
          Save Changes
        </Button>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock size={14} className="text-muted-foreground" /> Change Password
        </h3>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current password</label>
          <div className="relative">
            <Input type={showCurrent ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password" className="pr-10" />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">New password</label>
          <div className="relative">
            <Input type={showNew ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="Minimum 8 characters" className="pr-10" />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm new password</label>
          <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Re-enter new password" onKeyDown={(e) => e.key === "Enter" && changePassword()} />
        </div>
        <Button onClick={changePassword} loading={pwSaving} variant="outline" className="w-full">Update Password</Button>
      </div>
    </div>
  );
}

// ── BRANDING TAB ───────────────────────────────────────────────────────────────

interface BrandPreviewProps { logoUrl: string | null; brandName: string; tagline: string; accentColor: string; }

function BrandPreview({ logoUrl, brandName, tagline, accentColor }: BrandPreviewProps) {
  return (
    <div className="relative bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md select-none" style={{ aspectRatio: "210/297", maxWidth: 280, margin: "0 auto" }}>
      <div className="h-12 flex items-center px-5 gap-3" style={{ backgroundColor: accentColor }}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-7 object-contain brightness-0 invert" />
        ) : (
          <div className="h-7 w-20 rounded bg-white/30" />
        )}
        <span className="text-white font-semibold text-sm truncate">{brandName}</span>
      </div>
      <div className="flex flex-col items-center justify-center px-8 text-center" style={{ paddingTop: "10%" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${accentColor}18` }}>
          <div className="w-8 h-8 rounded-full border-4" style={{ borderColor: accentColor }} />
        </div>
        <p className="text-sm font-bold text-gray-800 mb-1">Website Performance Report</p>
        <p className="text-[10px] text-gray-500 mb-6">example.com · {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <div className="w-full bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2 font-semibold">Overall Health Score</p>
          <div className="text-3xl font-bold" style={{ color: accentColor }}>87</div>
          <p className="text-[9px] text-gray-400 mt-0.5">Healthy</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 w-full">
          {["Performance · 91", "Security · 85", "SEO · 88", "Malware · 100"].map((label) => (
            <div key={label} className="bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
              <p className="text-[8px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-3 left-0 right-0 px-5 flex justify-between items-center">
        <p className="text-[8px] text-gray-400">{tagline}</p>
        <p className="text-[8px] text-gray-400">Confidential</p>
      </div>
    </div>
  );
}

function BrandingTab() {
  const { agency } = useAuth();
  const { roleCanDo, loading: roleLoading } = useRole();
  const { setBranding } = useBranding();

  const [logoUrl, setLogoUrl]               = useState<string | null>(agency?.logo_url ?? null);
  const [logoPreview, setLogoPreview]       = useState<string | null>(agency?.logo_url ?? null);
  const [faviconUrl, setFaviconUrl]         = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [brandName, setBrandName]           = useState(agency?.brand_name ?? "");
  const [tagline, setTagline]               = useState(agency?.brand_tagline ?? "");
  const [accentColor, setAccentColor]       = useState(agency?.accent_color ?? "#6366f1");
  const [showPicker, setShowPicker]         = useState(false);
  const [hexInput, setHexInput]             = useState(agency?.accent_color ?? "#6366f1");
  const [logoUploading, setLogoUploading]   = useState(false);
  const [logoDragging, setLogoDragging]     = useState(false);
  const [saving, setSaving]                 = useState(false);

  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconRef  = useRef<HTMLInputElement>(null);
  const pickerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ logo_url?: string | null; brand_name?: string; brand_tagline?: string; accent_color?: string; favicon_url?: string | null }>("/settings")
      .then(({ data }) => {
        if (data.logo_url)      { setLogoUrl(data.logo_url);       setLogoPreview(data.logo_url); }
        if (data.brand_name)    setBrandName(data.brand_name);
        if (data.brand_tagline) setTagline(data.brand_tagline);
        if (data.accent_color)  { setAccentColor(data.accent_color); setHexInput(data.accent_color); }
        if (data.favicon_url)   { setFaviconUrl(data.favicon_url);   setFaviconPreview(data.favicon_url); }
      }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    if (showPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  async function uploadLogo(file: File) {
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) { toast.error("Only PNG, SVG, or JPG."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("File must be under 2MB."); return; }
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const { data } = await api.post<{ logo_url: string }>("/settings/logo", form, { headers: { "Content-Type": "multipart/form-data" } });
      setLogoUrl(data.logo_url);
      if (agency) setAgency({ ...agency, logo_url: data.logo_url });
    } catch { toast.error("Logo upload failed."); setLogoPreview(logoUrl); }
    finally { setLogoUploading(false); }
  }

  async function uploadFavicon(file: File) {
    const allowed = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"];
    if (!allowed.includes(file.type)) { toast.error("Only PNG, ICO, or SVG for favicons."); return; }
    if (file.size > 512 * 1024) { toast.error("Favicon must be under 512KB."); return; }
    setFaviconPreview(URL.createObjectURL(file));
    setFaviconUploading(true);
    try {
      const form = new FormData();
      form.append("favicon", file);
      const { data } = await api.post<{ favicon_url: string }>("/settings/favicon", form, { headers: { "Content-Type": "multipart/form-data" } });
      setFaviconUrl(data.favicon_url);
    } catch { toast.error("Favicon upload failed."); setFaviconPreview(faviconUrl); }
    finally { setFaviconUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put<{ logo_url?: string | null; brand_name?: string; brand_tagline?: string; accent_color?: string; favicon_url?: string | null }>("/settings", {
        logo_url: logoUrl, brand_name: brandName, brand_tagline: tagline, accent_color: accentColor, favicon_url: faviconUrl,
      });
      if (agency) {
        setAgency({ ...agency, logo_url: data.logo_url ?? agency.logo_url, brand_name: data.brand_name ?? agency.brand_name, brand_tagline: data.brand_tagline ?? agency.brand_tagline, accent_color: data.accent_color ?? agency.accent_color });
      }
      setBranding({ logoUrl: data.logo_url ?? null, brandName: data.brand_name ?? null, accentColor: data.accent_color ?? null, faviconUrl: data.favicon_url ?? null });
      toast.success("Brand settings saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  if (!roleLoading && !roleCanDo("edit_white_label")) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-xl border border-border bg-muted/20 max-w-2xl">
        <Lock size={20} className="text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Access restricted</p>
        <p className="text-xs text-muted-foreground max-w-xs">Brand settings can only be changed by the account owner.</p>
      </div>
    );
  }

  const previewName = brandName || agency?.name || "Your Agency";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — form */}
      <div className="space-y-5">
        {/* Logo upload */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Agency Logo</h3>
          <input ref={logoFileRef} type="file" accept=".png,.svg,.jpg,.jpeg" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
          <div
            onClick={() => logoFileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
            onDragLeave={() => setLogoDragging(false)}
            onDrop={(e) => { e.preventDefault(); setLogoDragging(false); const f = e.dataTransfer.files?.[0]; if (f) uploadLogo(f); }}
            className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
              logoDragging ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-border hover:border-border-strong hover:bg-muted/30"}`}
          >
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Logo" className="max-h-16 max-w-[160px] object-contain" />
                <button onClick={(e) => { e.stopPropagation(); setLogoPreview(null); setLogoUrl(null); }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background border border-border hover:bg-muted text-muted-foreground">
                  <X size={12} />
                </button>
              </>
            ) : (
              <Upload size={24} className="text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{logoUploading ? "Uploading…" : "Drag & drop or click to upload"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">PNG, SVG or JPG — max 2MB</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Appears on PDF report covers, client portal, and email headers.</p>
        </div>

        {/* Favicon upload */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Browser Favicon</h3>
          <input ref={faviconRef} type="file" accept=".png,.ico,.svg" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFavicon(f); e.target.value = ""; }} />
          <div className="flex items-center gap-4">
            <button onClick={() => faviconRef.current?.click()}
              className="relative w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-border-strong hover:bg-muted/40 flex items-center justify-center shrink-0 transition-colors overflow-hidden">
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon" className="w-8 h-8 object-contain" />
              ) : (
                <Upload size={18} className="text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{faviconUploading ? "Uploading…" : faviconPreview ? "Favicon uploaded" : "Upload a favicon"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">PNG, ICO, or SVG — max 512KB. Shown in browser tabs.</p>
            </div>
            {faviconPreview && (
              <button onClick={() => { setFaviconPreview(null); setFaviconUrl(null); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Brand identity */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Brand Identity</h3>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Agency Display Name</label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={agency?.name || "Your Agency Name"} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cover Page Tagline</label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Website performance & security experts" />
            <p className="text-xs text-muted-foreground mt-1">Shown on PDF report cover pages.</p>
          </div>
        </div>

        {/* Accent color */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Accent Color</h3>
          <div className="flex items-center gap-3">
            <div ref={pickerRef} className="relative">
              <button onClick={() => setShowPicker((v) => !v)}
                className="w-10 h-10 rounded-lg border-2 border-border shadow-sm"
                style={{ backgroundColor: accentColor }} />
              {showPicker && (
                <div className="absolute top-12 left-0 z-20 shadow-xl rounded-xl overflow-hidden border border-border">
                  <HexColorPicker color={accentColor} onChange={(c) => { setAccentColor(c); setHexInput(c); }} />
                </div>
              )}
            </div>
            <Input value={hexInput}
              onChange={(e) => { setHexInput(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setAccentColor(e.target.value); }}
              placeholder="#6366f1" className="w-32 font-mono text-sm" />
            <p className="text-xs text-muted-foreground flex-1">Applied to report headers, score gauges, and portal accent elements.</p>
          </div>
        </div>

        <Button onClick={save} loading={saving} className="w-full">Save Brand Settings</Button>
      </div>

      {/* Right — live preview */}
      <div className="sticky top-6">
        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF report cover page</p>
          </div>
          <div className="p-4">
            <BrandPreview
              logoUrl={logoPreview}
              brandName={previewName}
              tagline={tagline || "Website performance & security experts"}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS TAB ──────────────────────────────────────────────────────────

interface ActivityLog {
  id: string; site_id: string | null; site_name: string | null; site_url: string | null;
  actor_email: string | null; action: string; details: Record<string, unknown> | null; created_at: string;
}

const PAGE_SIZE = 20;

function NotificationsTab() {
  const { roleCanDo, loading: roleLoading } = useRole();
  const { sites, loading: sitesLoading } = useSites();
  type Channel = "email" | "slack";

  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [thresholds, setThresholds]         = useState({ performance: 70, seo: 70, security: 70 });
  const [channel, setChannel]               = useState<Channel>("email");
  const [alertEmail, setAlertEmail]         = useState("");
  const [slackWebhook, setSlackWebhook]     = useState("");
  const [alertLoading, setAlertLoading]     = useState(false);
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) setSelectedSiteId(sites[0].id);
  }, [sites, selectedSiteId]);

  useEffect(() => {
    if (!selectedSiteId) return;
    setAlertLoading(true);
    api.get<AlertSettings>(`/alerts/${selectedSiteId}`)
      .then(({ data }) => {
        setThresholds({ performance: data.performance_threshold ?? 70, seo: data.seo_threshold ?? 70, security: data.security_threshold ?? 70 });
        setChannel(data.channel ?? "email");
        setAlertEmail(data.alert_email ?? "");
        setSlackWebhook(data.slack_webhook_url ?? "");
      })
      .catch(() => {})
      .finally(() => setAlertLoading(false));
  }, [selectedSiteId]);

  async function saveAlerts() {
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      await api.put<AlertSettings>(`/alerts/${selectedSiteId}`, {
        performance_threshold: thresholds.performance, seo_threshold: thresholds.seo,
        security_threshold: thresholds.security, malware_alerts: true,
        channel,
        alert_email: channel === "email" ? alertEmail : undefined,
        slack_webhook_url: channel === "slack" ? slackWebhook : undefined,
      });
      toast.success("Alert settings saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const canManage    = roleLoading ? true : roleCanDo("manage_alerts");

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-xl border border-border bg-muted/20 max-w-4xl">
        <Lock size={20} className="text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Access restricted</p>
        <p className="text-xs text-muted-foreground">Alert settings can only be changed by admins and the account owner.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Site selector */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Site</p>
          {sitesLoading ? (
            <div className="h-9 bg-muted animate-pulse rounded-lg" />
          ) : (
            <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {selectedSite && <p className="text-xs text-muted-foreground truncate">{selectedSite.url}</p>}
        </div>

        {/* Thresholds */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score Thresholds</p>
          {alertLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <div className="space-y-4">
              <ThresholdSlider label="Performance" value={thresholds.performance} onChange={(v) => setThresholds(t => ({ ...t, performance: v }))} />
              <ThresholdSlider label="SEO"         value={thresholds.seo}         onChange={(v) => setThresholds(t => ({ ...t, seo: v }))}         />
              <ThresholdSlider label="Security"    value={thresholds.security}    onChange={(v) => setThresholds(t => ({ ...t, security: v }))}    />
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">Malware <Lock size={11} className="text-muted-foreground" /></span>
                  <p className="text-[10px] text-muted-foreground">Always on — cannot be disabled</p>
                </div>
                <span className="text-xs text-emerald-600 font-semibold">Always On</span>
              </div>
            </div>
          )}
        </div>

        {/* Channel */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notification Channel</p>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(["email", "slack"] as const).map((ch) => (
              <button key={ch} onClick={() => setChannel(ch)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  channel === ch ? "bg-white text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                {ch === "email" ? <Mail size={12} /> : <Webhook size={12} />}
                {ch === "email" ? "Email" : "Slack"}
              </button>
            ))}
          </div>
          {channel === "email" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Alert Email</label>
              <Input type="email" value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} placeholder="alerts@youragency.com" />
              <p className="text-[10px] text-muted-foreground mt-1">Sent within 5 minutes of a threshold breach.</p>
            </div>
          )}
          {channel === "slack" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Slack Webhook URL</label>
              <Input type="url" value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
              <p className="text-[10px] text-muted-foreground mt-1">Create an Incoming Webhook in your Slack workspace.</p>
            </div>
          )}
          <Button onClick={saveAlerts} loading={saving} disabled={!selectedSiteId} className="w-full">Save Alert Settings</Button>
        </div>
      </div>
    </div>
  );
}

// ── ACTIVITY LOG TAB ───────────────────────────────────────────────────────────

function ActivityTab() {
  const [logs, setLogs]         = useState<ActivityLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError]     = useState<string | null>(null);

  const fetchLogs = useCallback(async (offset: number) => {
    setLogLoading(true); setLogError(null);
    try {
      const { data } = await api.get<{ logs: ActivityLog[]; total: number }>(`/activity?limit=${PAGE_SIZE}&offset=${offset}`);
      setLogs(data.logs); setTotal(data.total);
    } catch { setLogError("Failed to load activity log."); }
    finally { setLogLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(page * PAGE_SIZE); }, [fetchLogs, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">All significant actions across your agency account</p>
        <button onClick={() => fetchLogs(page * PAGE_SIZE)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-gray-50 transition-colors">
          <RefreshCw size={12} className={logLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {logLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : logError ? (
          <p className="text-sm text-destructive px-5 py-8">{logError}</p>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Activity size={18} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const meta = ACTION_LABELS[log.action] ?? { label: log.action.replace(/_/g, " "), color: "bg-gray-100 text-gray-600" };
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${meta.color}`}>{meta.label}</span>
                  <div className="flex-1 min-w-0">
                    {log.site_name ? (
                      <Link href={log.site_id ? `/sites/${log.site_id}` : "#"}
                        className="text-sm font-medium text-foreground hover:text-accent hover:underline truncate block">{log.site_name}</Link>
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {log.details && typeof log.details === "object" && "name" in log.details ? String(log.details.name) : "—"}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {log.site_url && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe size={9} />{log.site_url.replace(/^https?:\/\//, "")}</span>}
                      {log.actor_email && <span className="text-[10px] text-muted-foreground">by {log.actor_email}</span>}
                      {log.details && "count" in log.details && <span className="text-[10px] text-muted-foreground">{String(log.details.count)} site{Number(log.details.count) !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">{timeAgo(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-foreground">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TEAM TAB ───────────────────────────────────────────────────────────────────

interface TeamData { members: TeamMember[]; seats_used: number; seats_limit: number; }

function TeamTab() {
  const { agency } = useAuth();
  const { roleCanDo, loading: roleLoading } = useRole();

  const isPaidPlan = agency?.plan !== "free";
  const seatLimit  = agency ? (PLAN_SEATS[agency.plan] ?? 1) : 1;

  const [data, setData]           = useState<TeamData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName]   = useState("");
  const [inviteRole, setInviteRole]   = useState<Exclude<TeamRole, "owner">>("analyst");
  const [inviting, setInviting]       = useState(false);

  const canManage = roleLoading ? true : roleCanDo("manage_team");

  useEffect(() => {
    if (roleLoading || !canManage || !isPaidPlan) return;
    api.get<TeamData>("/team")
      .then(({ data }) => setData(data))
      .catch(() => setData({ members: [], seats_used: 1, seats_limit: seatLimit }))
      .finally(() => setLoading(false));
  }, [seatLimit, roleLoading, canManage, isPaidPlan]);

  if (!roleLoading && !canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-border bg-muted/20 max-w-2xl">
        <Lock size={20} className="text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Access restricted</p>
        <p className="text-xs text-muted-foreground">Team management is only available to admins and the account owner.</p>
      </div>
    );
  }

  if (!isPaidPlan) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 flex flex-col items-center gap-3 text-center max-w-2xl">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Users size={20} className="text-amber-600" />
        </div>
        <p className="font-semibold text-amber-900">Team management requires a paid plan</p>
        <p className="text-sm text-amber-700 max-w-sm">
          You&apos;re on the <strong>{PLAN_LABELS[agency?.plan ?? "free"]}</strong> plan. Upgrade to Starter or above to invite team members.
        </p>
        <button className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--accent)" }}
          onClick={() => (document.querySelector('[data-tab="billing"]') as HTMLButtonElement)?.click()}>
          View Plans
        </button>
      </div>
    );
  }

  const atSeatLimit = data ? data.seats_used >= data.seats_limit : false;

  async function handleInvite() {
    if (!inviteEmail || !isValidEmail(inviteEmail)) { toast.error("Please enter a valid email address."); return; }
    setInviting(true);
    try {
      const { data: res } = await api.post<{ member: TeamMember }>("/team/invite", { email: inviteEmail, name: inviteName || undefined, role: inviteRole });
      setData(prev => prev ? { ...prev, members: [...prev.members, res.member], seats_used: prev.seats_used + 1 } : prev);
      setShowInvite(false); setInviteEmail(""); setInviteName(""); setInviteRole("analyst");
      toast.success(`Invite sent to ${inviteEmail}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to send invite.");
    } finally { setInviting(false); }
  }

  async function handleRemove(id: string, email: string) {
    try {
      await api.delete(`/team/${id}`);
      setData(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== id), seats_used: prev.seats_used - 1 } : prev);
      toast.success(`${email} removed.`);
    } catch { toast.error("Failed to remove member."); }
  }

  async function handleRoleChange(id: string, role: Exclude<TeamRole, "owner">) {
    try {
      const { data: res } = await api.put<{ member: TeamMember }>(`/team/${id}`, { role });
      setData(prev => prev ? { ...prev, members: prev.members.map(m => m.id === id ? res.member : m) } : prev);
    } catch { toast.error("Failed to update role."); }
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{data?.seats_used ?? 1}</span> of{" "}
            <span className="font-semibold text-foreground">{data?.seats_limit === 9999 ? "∞" : data?.seats_limit}</span> seats used
          </p>
          {data && data.seats_limit < 9999 && (
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ((data.seats_used / data.seats_limit) * 100))}%`, background: atSeatLimit ? "var(--score-bad)" : "var(--accent)" }} />
            </div>
          )}
        </div>
        <Button onClick={() => setShowInvite(true)} disabled={atSeatLimit}>
          <UserPlus size={15} className="mr-1.5" /> Invite member
        </Button>
      </div>

      {atSeatLimit && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-amber-600" />
          Seat limit reached.{" "}
          <button onClick={() => (document.querySelector('[data-tab="billing"]') as HTMLButtonElement)?.click()}
            className="underline font-semibold">Upgrade your plan</button> to invite more members.
        </div>
      )}

      {/* Invite panel (inline instead of modal) */}
      {showInvite && (
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Invite Team Member</p>
            <button onClick={() => setShowInvite(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email address *</label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name (optional)</label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
              <div className="relative">
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Exclude<TeamRole, "owner">)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail}>Send invite</Button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Member", "Role", "Status", ""].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-5 py-3.5"><p className="font-medium text-foreground">{agency?.name}</p><p className="text-xs text-muted-foreground">{agency?.email}</p></td>
                  <td className="px-5 py-3.5"><RoleBadge role="owner" /></td>
                  <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active</span></td>
                  <td className="px-5 py-3.5" />
                </tr>
                {data?.members.length === 0 && (
                  <tr><td colSpan={4}><EmptyState icon={<Users size={18} />} title="No team members yet" description="Invite a colleague to collaborate on your sites." /></td></tr>
                )}
                {data?.members.map(member => (
                  <tr key={member.id}>
                    <td className="px-5 py-3.5"><p className="font-medium text-foreground">{member.name || "—"}</p><p className="text-xs text-muted-foreground">{member.email}</p></td>
                    <td className="px-5 py-3.5">
                      <div className="relative inline-block">
                        <select value={member.role} onChange={(e) => handleRoleChange(member.id, e.target.value as Exclude<TeamRole, "owner">)}
                          className="appearance-none pl-2 pr-6 py-0.5 text-xs rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer">
                          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {member.invite_accepted
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Invited</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleRemove(member.id, member.email)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors" title="Remove member">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── API & INTEGRATIONS TAB ─────────────────────────────────────────────────────

function IntegrationsTab() {
  const apiBase = API_BASE_URL;
  const [downloading, setDownloading] = useState(false);

  async function downloadPlugin() {
    setDownloading(true);
    try {
      const res = await fetch(`${apiBase}/plugin/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "brandbees-snapshot.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Plugin download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Plugin download */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Package size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">BrandBees Snapshot Plugin</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">WordPress</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Install on each WordPress site you want to monitor. Enables full data collection and dashboard connectivity.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border p-4 space-y-2">
            {[
              "Pushes 53 site data points every hour via WP Cron",
              "Enables plugin vulnerability scanning",
              "Powers the WooCommerce analytics tab",
              "Required for uptime and security monitoring",
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <CheckCircle size={12} className="text-green-500 shrink-0" /> {item}
              </div>
            ))}
          </div>

          <Button onClick={downloadPlugin} loading={downloading} className="w-full flex items-center gap-2 mt-auto">
            <Download size={14} /> Download Plugin (.zip)
          </Button>
        </div>

        {/* Connection instructions */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">How to connect a site</p>
            <p className="text-xs text-muted-foreground">API keys and site tokens are managed per-site — no global key needed.</p>
          </div>

          <ol className="space-y-4 flex-1">
            {[
              { title: "Add your site", desc: "Go to the Sites page and add a new site — you'll get an API key and site token." },
              { title: "Install the plugin", desc: "Download the zip above and upload via WordPress Admin → Plugins → Add New → Upload Plugin." },
              { title: "Connect in plugin settings", desc: "Enter your API key and site token in the plugin settings page, then click Save & Connect." },
              { title: "Data starts flowing", desc: "The plugin verifies the connection and begins pushing data within the hour via WP Cron." },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="pt-3 border-t border-border">
            <Link href="/sites" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              <Globe size={13} /> Go to Sites page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BILLING TAB ────────────────────────────────────────────────────────────────

interface TokenPackage  { tokens: number; price_cents: number; label: string; }
interface StoragePackage { bytes: number; price_cents: number; label: string; }
interface PlanLimits    { tokens: number; storage: number; }
interface BillingEvent  {
  id: string; type: "subscription" | "token_topup" | "storage_addon";
  plan: string | null; tokens: number | null; bytes: number | null;
  amount_cents: number; currency: string; created_at: string; stripe_session_id: string | null;
}
interface TokenState { tokens_used: number; tokens_limit: number; tokens_extra: number; monthly_limit: number; }

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function fmtCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

const TX_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  subscription:  { label: "Plan",      color: "bg-blue-100 text-blue-700",     icon: CreditCard },
  token_topup:   { label: "AI Tokens", color: "bg-purple-100 text-purple-700", icon: Brain },
  storage_addon: { label: "Storage",   color: "bg-emerald-100 text-emerald-700", icon: HardDrive },
};

function BillingContent() {
  const { agency, refreshAgency } = useAuth();
  const searchParams = useSearchParams();

  const [sites, setSites]           = useState<Site[]>([]);
  const [seatsUsed, setSeatsUsed]   = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [redeemLoading, setRedeemLoading]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [addonLoading, setAddonLoading]       = useState<string | null>(null);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);

  // Live data from backend
  const [tokenPkgs, setTokenPkgs]     = useState<Record<string, TokenPackage>>({});
  const [storagePkgs, setStoragePkgs] = useState<Record<string, StoragePackage>>({});
  const [planLimits, setPlanLimits]   = useState<Record<string, PlanLimits>>({});
  const [history, setHistory]         = useState<BillingEvent[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const currentPlan = (agency?.plan ?? "free") as PlanKey;
  const sitesLimit  = PLAN_LIMITS[currentPlan] ?? 1;
  const seatsLimit  = PLAN_SEATS[currentPlan] ?? 1;

  // Dynamic storage limit — live from API, fallback to constant
  const dynStorageLimit = planLimits[currentPlan]?.storage ?? 524_288_000;

  useEffect(() => {
    api.get<{ sites: Site[] }>("/sites").then(({ data }) => setSites(data.sites ?? [])).catch(() => {});
    api.get<{ seats_used: number }>("/team").then(({ data }) => setSeatsUsed(data.seats_used)).catch(() => {});
    api.get<TokenState>("/agent/tokens").then(({ data }) => setTokenState(data)).catch(() => {});
    api.get<{ packages: Record<string, TokenPackage> }>("/billing/tokens/packages")
      .then(({ data }) => setTokenPkgs(data.packages)).catch(() => {});
    api.get<{ packages: Record<string, StoragePackage> }>("/billing/storage/packages")
      .then(({ data }) => setStoragePkgs(data.packages)).catch(() => {});
    api.get<{ limits: Record<string, PlanLimits> }>("/billing/limits")
      .then(({ data }) => setPlanLimits(data.limits)).catch(() => {});
    api.get<{ history: BillingEvent[] }>("/billing/history")
      .then(({ data }) => { setHistory(data.history); setHistoryLoaded(true); }).catch(() => setHistoryLoaded(true));
    refreshAgency();

    const sessionId     = searchParams.get("session_id");
    const tokensSuccess = searchParams.get("tokens") === "success";
    const storageSuccess = searchParams.get("storage") === "success";
    const planSuccess   = searchParams.get("plan") === "success";

    if ((tokensSuccess || storageSuccess || planSuccess) && sessionId) {
      // Verify the Stripe session — credits the purchase if the webhook hasn't fired yet
      api.post("/billing/verify-session", { session_id: sessionId })
        .then(async () => {
          if (tokensSuccess) {
            const { data: ts } = await api.get<TokenState>("/agent/tokens");
            setTokenState(ts);
            toast.success("AI tokens added to your account! Your balance has been updated.");
          } else if (storageSuccess) {
            await refreshAgency();
            toast.success("Storage added to your account! Your limit has been increased.");
          } else if (planSuccess) {
            await refreshAgency();
            toast.success("Plan upgraded successfully! Welcome to your new plan.");
          }
        })
        .catch(() => {
          // Webhook may have already processed it — still show confirmation
          if (tokensSuccess)  toast.success("AI tokens added to your account! Your balance has been updated.");
          if (storageSuccess) toast.success("Storage added to your account! Your limit has been increased.");
          if (planSuccess)    toast.success("Plan upgraded successfully! Welcome to your new plan.");
        });
    } else if (tokensSuccess) {
      toast.success("AI tokens added to your account! Your balance has been updated.");
    } else if (storageSuccess) {
      toast.success("Storage added to your account! Your limit has been increased.");
    } else if (planSuccess) {
      toast.success("Plan upgraded successfully! Welcome to your new plan.");
    }
  }, []);

  async function handleAddonCheckout(type: "tokens" | "storage", pkg: string) {
    setAddonLoading(pkg);
    try {
      const endpoint = type === "tokens" ? "/billing/tokens/checkout" : "/billing/storage/checkout";
      const { data } = await api.post<{ url: string }>(endpoint, { package: pkg });
      window.location.href = data.url;
    } catch { toast.error("Failed to start checkout. Please try again."); setAddonLoading(null); }
  }

  async function handleUpgrade(plan: string) {
    setCheckoutLoading(plan);
    try {
      const { data } = await api.post<{ url: string }>("/billing/checkout", { plan });
      window.location.href = data.url;
    } catch { toast.error("Failed to start checkout. Please try again."); setCheckoutLoading(null); }
  }

  async function handleCouponRedeem() {
    if (!couponCode.trim()) return;
    setRedeemLoading(true);
    try {
      const { data } = await api.post<{ plan: string; sites_limit: number }>("/billing/coupons/redeem", { code: couponCode.trim() });
      toast.success(`Coupon applied! Plan upgraded to ${PLAN_LABELS[data.plan]}.`);
      setCouponCode("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Invalid coupon code.");
    } finally { setRedeemLoading(false); }
  }

  const tokenPkgList   = Object.entries(tokenPkgs).map(([key, pkg]) => ({ key, ...pkg }));
  const storagePkgList = Object.entries(storagePkgs).map(([key, pkg]) => ({ key, ...pkg }));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Current plan + usage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3 sm:col-span-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Plan</p>
          <div>
            <p className="text-2xl font-bold text-foreground">{PLAN_LABELS[currentPlan]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {PLAN_PRICES[currentPlan].monthly === 0 ? "Free forever" : `$${PLAN_PRICES[currentPlan].monthly}/month`}
            </p>
          </div>
          {currentPlan !== "free" && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">Active</span>
          )}
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4 sm:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usage</p>
          <UsageBar used={sites.length} total={sitesLimit} label="Sites" />
          <UsageBar used={seatsUsed} total={seatsLimit} label="Team seats" />
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Available Plans</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent   = plan === currentPlan;
            const price       = PLAN_PRICES[plan].monthly;
            const isDowngrade = PLANS.indexOf(plan) < PLANS.indexOf(currentPlan);
            const limits      = planLimits[plan];
            return (
              <div key={plan} className={`rounded-2xl border p-4 flex flex-col gap-3 ${isCurrent ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-border bg-white"}`}>
                {isCurrent && <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--accent)] text-white">Current</span>}
                <div>
                  <p className="font-bold text-sm text-foreground">{PLAN_LABELS[plan]}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">
                    {price === 0 ? "Free" : `$${price}`}
                    {price > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                  </p>
                  {limits && (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Brain size={10} /> {fmtTokens(limits.tokens)} AI tokens/mo
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <HardDrive size={10} /> {formatBytes(limits.storage)} storage
                      </p>
                    </div>
                  )}
                </div>
                <ul className="space-y-1 flex-1">
                  {PLAN_FEATURES[plan].map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check size={11} className="text-green-500 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && !isDowngrade && plan !== "free" && (
                  <Button className="w-full" onClick={() => handleUpgrade(plan)} loading={checkoutLoading === plan}>Upgrade</Button>
                )}
                {isCurrent   && <div className="text-center text-xs text-muted-foreground py-0.5">Your current plan</div>}
                {isDowngrade && !isCurrent && <div className="text-center text-xs text-muted-foreground py-0.5">Lower tier</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick feature stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Globe, title: `${sitesLimit >= 9999 ? "Unlimited" : sitesLimit} sites`, sub: "Monitored and audited" },
          { icon: Users, title: `${seatsLimit >= 9999 ? "Unlimited" : seatsLimit} seats`, sub: "Team members included" },
          { icon: Zap,   title: "Scheduled audits", sub: currentPlan === "free" ? "Upgrade to enable" : "Weekly & monthly" },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="rounded-xl border border-border bg-muted/20 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon size={16} className="text-muted-foreground" /></div>
            <div><p className="text-sm font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
          </div>
        ))}
      </div>

      {/* AI Token Top-up */}
      {currentPlan !== "free" && (
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain size={15} className="text-[var(--accent)]" />
            <p className="text-sm font-semibold text-foreground">AI Assistant Tokens</p>
          </div>
          {tokenState && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Monthly usage</span>
                <span className="font-medium text-foreground">
                  {fmtTokens(tokenState.tokens_used)} / {fmtTokens(tokenState.tokens_limit)}
                  {tokenState.tokens_extra > 0 && (
                    <span className="ml-2 text-[var(--accent)] font-semibold">+{fmtTokens(tokenState.tokens_extra)} extra</span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${Math.min(100, (tokenState.tokens_used / Math.max(tokenState.tokens_limit, 1)) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">Extra tokens never expire and are used after your monthly allowance runs out.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tokenPkgList.length > 0 ? tokenPkgList.map(({ key, tokens, price_cents, label }) => (
              <div key={key} className="rounded-xl border border-border bg-white p-4 flex flex-col gap-3">
                <div>
                  <p className="text-lg font-bold text-foreground">{fmtCents(price_cents)}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{fmtTokens(tokens)} tokens</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
                <Button className="w-full mt-auto" onClick={() => handleAddonCheckout("tokens", key)}
                  loading={addonLoading === key} disabled={addonLoading !== null && addonLoading !== key}>Buy</Button>
              </div>
            )) : [1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-border bg-white p-4 h-28 animate-pulse bg-muted/30" />
            ))}
          </div>
        </div>
      )}

      {/* Storage */}
      {currentPlan !== "free" && (() => {
        const storageExtra = agency?.storage_extra_bytes ?? 0;
        const storageUsed  = agency?.storage_used_bytes  ?? 0;
        const storageTotal = dynStorageLimit + storageExtra;
        const storagePct   = Math.min(100, (storageUsed / Math.max(storageTotal, 1)) * 100);
        const storageWarn  = storagePct >= 80;
        return (
          <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive size={15} className="text-[var(--accent)]" />
              <p className="text-sm font-semibold text-foreground">Storage</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Used</span>
                <span className="font-medium text-foreground">
                  {formatBytes(storageUsed)} / {formatBytes(storageTotal)}
                  {storageExtra > 0 && <span className="ml-2 text-[var(--accent)] font-semibold">+{formatBytes(storageExtra)} extra</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${storagePct}%`, background: storageWarn ? "var(--score-bad)" : "var(--accent)" }} />
              </div>
              {storageWarn && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle size={11} /> Storage almost full — buy more to keep saving reports and backups.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">Extra storage never expires and is applied on top of your plan allowance.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {storagePkgList.length > 0 ? storagePkgList.map(({ key, bytes, price_cents, label }) => (
                <div key={key} className="rounded-xl border border-border bg-white p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">{fmtCents(price_cents)}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{formatBytes(bytes)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                  <Button className="w-full mt-auto" onClick={() => handleAddonCheckout("storage", key)}
                    loading={addonLoading === key} disabled={addonLoading !== null && addonLoading !== key}>Buy</Button>
                </div>
              )) : [1,2,3].map(i => (
                <div key={i} className="rounded-xl border border-border bg-white p-4 h-28 animate-pulse bg-muted/30" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Purchase History */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt size={15} className="text-[var(--accent)]" />
          <p className="text-sm font-semibold text-foreground">Purchase History</p>
        </div>
        {!historyLoaded ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <div className="text-center py-6">
            <Receipt size={26} className="text-muted-foreground/25 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No purchases yet — token and storage top-ups will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Details</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => {
                  const meta = TX_META[tx.type] ?? TX_META.subscription;
                  const Icon = meta.icon;
                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          <Icon size={10} />{meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {tx.type === "token_topup"   && tx.tokens && `+${fmtTokens(tx.tokens)} tokens`}
                        {tx.type === "storage_addon"  && tx.bytes  && `+${formatBytes(tx.bytes)} storage`}
                        {tx.type === "subscription"   && tx.plan   && `${PLAN_LABELS[tx.plan] ?? tx.plan} plan`}
                      </td>
                      <td className="py-2.5 text-right text-xs font-semibold text-foreground">
                        {fmtCents(tx.amount_cents, tx.currency)}
                      </td>
                      <td className="py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {tx.stripe_session_id && (
                          <a href={`https://dashboard.stripe.com/payments/${tx.stripe_session_id}`}
                            target="_blank" rel="noreferrer"
                            className="ml-1.5 inline-flex items-center opacity-40 hover:opacity-100 transition-opacity" title="View in Stripe">
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coupon */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">Redeem Coupon</p>
        <div className="flex gap-3 items-start">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="ENTER-COUPON-CODE" className="pl-8 font-mono uppercase tracking-widest"
              onKeyDown={(e) => e.key === "Enter" && handleCouponRedeem()} />
          </div>
          <Button onClick={handleCouponRedeem} loading={redeemLoading} disabled={!couponCode.trim()}>Apply</Button>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  return <Suspense fallback={<div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}><BillingContent /></Suspense>;
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { agency } = useAuth();
  const { role }   = useRole();

  const getValidTab = (): Tab => {
    const t = searchParams.get("tab") as Tab;
    return TABS.some(x => x.id === t) ? t : "general";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getValidTab);

  useEffect(() => {
    setActiveTab(getValidTab());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleTabChange(id: Tab) {
    setActiveTab(id);
    router.replace(`/settings?tab=${id}`, { scroll: false });
  }

  const accentColor = agency?.accent_color ?? "#6366f1";
  const displayName = agency?.member_name ?? agency?.name ?? "";
  const roleColors  = ROLE_COLOR[role ?? "analyst"] ?? ROLE_COLOR.analyst;

  return (
    <div className="space-y-5">
      {/* Profile hero */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-14 w-full" style={{ background: `linear-gradient(135deg, ${accentColor}28 0%, ${accentColor}08 100%)` }} />
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-7 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold ring-4 ring-white shadow-sm shrink-0" style={{ background: accentColor }}>
              {initials(displayName || "?")}
            </div>
            <div className="pb-0.5 flex-1 min-w-0">
              <p className="text-base font-bold text-foreground leading-tight truncate">{displayName || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{agency?.email}</p>
            </div>
            <div className="pb-0.5 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                style={{ background: roleColors.bg, color: roleColors.text }}>{role ?? "analyst"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed panel */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1.5 border-b border-border overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-tab={id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === id ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              style={activeTab === id ? { background: accentColor } : undefined}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "general"       && <GeneralTab />}
          {activeTab === "branding"      && <BrandingTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "activity"      && <ActivityTab />}
          {activeTab === "team"          && <TeamTab />}
          {activeTab === "integrations"  && <IntegrationsTab />}
          {activeTab === "billing"       && <BillingTab />}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>}>
      <SettingsPageInner />
    </Suspense>
  );
}
