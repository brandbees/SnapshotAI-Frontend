"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Globe, Save, RefreshCw, Check, Settings2,
  Mail, Shield, Sliders, CreditCard, Image, Upload, X,
  Sparkles, Trash2, Plus, Key, Lock, Eye, EyeOff,
  Zap, HardDrive, Brain, Cloud,
} from "lucide-react";
import masterApi from "@/lib/masterApi";
import { useMasterPlatform } from "@/context/MasterPlatformContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface Setting {
  key:        string;
  value:      string;
  label:      string;
  type:       "string" | "number" | "boolean" | "secret" | "json";
  section:    string;
  updated_at: string;
  is_secret?: boolean;
}

interface ChangelogEntry {
  id:         string;
  version:    string;
  date:       string;
  highlights: string[];
  created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";

const TABS = [
  { key: "general",      label: "General",      icon: Globe      },
  { key: "plans",        label: "Plans",        icon: CreditCard },
  { key: "integrations", label: "Integrations", icon: Key        },
  { key: "platform",     label: "Platform",     icon: Sliders    },
  { key: "email",        label: "Email",        icon: Mail       },
  { key: "security",     label: "Security",     icon: Shield     },
  { key: "changelog",    label: "Changelog",    icon: Sparkles   },
];

const PLAN_DEFS = [
  { key: "freemium",    label: "Starter",  color: "#3b82f6", desc: "Solo freelancers & small sites" },
  { key: "premium",     label: "Growth",   color: "#8b5cf6", desc: "Growing agencies" },
  { key: "agency",      label: "Agency",   color: "#64748b", desc: "Mid-size agencies" },
  { key: "agency_plus", label: "Agency+",  color: "#f59e0b", desc: "Large agencies & power users" },
];

// Integrations groupings — keys must match platform_settings.key values in DB
const INTEGRATION_GROUPS: { label: string; icon: React.ElementType; color: string; keys: string[] }[] = [
  {
    label: "Stripe",
    icon:  CreditCard,
    color: "#635BFF",
    keys: [
      "stripe_secret_key",
      "stripe_webhook_secret",
      "stripe_price_freemium",
      "stripe_price_premium",
      "stripe_price_agency_plus",
    ],
  },
  {
    label: "AI / GROQ",
    icon:  Brain,
    color: "#8b5cf6",
    keys: [
      "groq_api_key",
      "groq_model_agent",
      "groq_model_narrative",
    ],
  },
  {
    label: "Cloudflare R2",
    icon:  Cloud,
    color: "#f6821f",
    keys: [
      "r2_account_id",
      "r2_access_key_id",
      "r2_secret_access_key",
      "r2_bucket_name",
      "r2_public_url",
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-amber-400" : "bg-gray-200"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        on ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

function SaveBtn({ saving, saved, dirty, onClick }: {
  saving: boolean; saved: boolean; dirty: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!dirty || saving}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 whitespace-nowrap ${
        saved ? "bg-green-50 text-green-600 border border-green-200"
               : "text-white border border-transparent"
      }`}
      style={!saved ? { background: dirty ? AMBER : "#e5e7eb", color: dirty ? "#fff" : "#9ca3af" } : undefined}
    >
      {saving ? <RefreshCw size={11} className="animate-spin" /> :
       saved   ? <><Check size={11} /> Saved</>                   :
                 <><Save  size={11} /> Save</>}
    </button>
  );
}

function SettingRow({ s, value, onChange, onSave, saving, saved }: {
  s: Setting;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved:  boolean;
}) {
  const dirty = value !== s.value;
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-5 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{s.label}</p>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5 leading-none">{s.key}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {s.type === "boolean" ? (
          <>
            <span className="text-xs text-muted-foreground mr-1">{value === "true" ? "On" : "Off"}</span>
            <Toggle on={value === "true"} onChange={v => onChange(v ? "true" : "false")} />
            <SaveBtn saving={saving} saved={saved} dirty={dirty} onClick={onSave} />
          </>
        ) : (
          <>
            <input
              type={s.type === "number" ? "number" : "text"}
              value={value}
              onChange={e => onChange(e.target.value)}
              className={`px-3 py-1.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono transition-colors ${
                dirty ? "border-amber-300 bg-amber-50/30" : "border-border"
              } ${s.type === "number" ? "w-24 text-right" : "w-56"}`}
            />
            <SaveBtn saving={saving} saved={saved} dirty={dirty} onClick={onSave} />
          </>
        )}
      </div>
    </div>
  );
}

// ── SecretRow ─────────────────────────────────────────────────────────────────

function SecretRow({ s, editValue, onChange, onSave, onClear, saving, saved, revealed, onToggleReveal }: {
  s:              Setting;
  editValue:      string;
  onChange:       (v: string) => void;
  onSave:         () => void;
  onClear:        () => void;
  saving:         boolean;
  saved:          boolean;
  revealed:       boolean;
  onToggleReveal: () => void;
}) {
  const isSet  = s.value === "••••••••";
  const dirty  = editValue.trim() !== "";

  return (
    <div className="py-4 px-5 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{s.label}</p>
            {isSet ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Set in DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Using .env fallback
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{s.key}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type={revealed ? "text" : "password"}
            value={editValue}
            onChange={e => onChange(e.target.value)}
            placeholder={isSet ? "Enter new value to change…" : "Paste secret key…"}
            className={`w-full pr-9 px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono transition-colors ${
              dirty ? "border-amber-300 bg-amber-50/30" : "border-border"
            }`}
          />
          <button
            type="button"
            onClick={onToggleReveal}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>

        <SaveBtn saving={saving} saved={saved} dirty={dirty} onClick={onSave} />

        {isSet && (
          <button
            type="button"
            onClick={onClear}
            title="Clear DB value — .env fallback will be used"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground border border-border hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── JsonRow ───────────────────────────────────────────────────────────────────

function JsonRow({ s, value, onChange, onSave, saving, saved }: {
  s: Setting; value: string;
  onChange: (v: string) => void; onSave: () => void;
  saving: boolean; saved: boolean;
}) {
  const [jsonError, setJsonError] = useState("");
  const dirty = value !== s.value;

  function handleChange(v: string) {
    onChange(v);
    try { JSON.parse(v); setJsonError(""); } catch { setJsonError("Invalid JSON"); }
  }

  return (
    <div className="py-4 px-5 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{s.label}</p>
          <p className="text-[11px] font-mono text-muted-foreground">{s.key}</p>
        </div>
        <SaveBtn saving={saving} saved={saved} dirty={dirty && !jsonError} onClick={onSave} />
      </div>
      <textarea
        rows={6}
        value={value}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
        className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono resize-none transition-colors ${
          jsonError ? "border-red-300 bg-red-50/20" : dirty ? "border-amber-300 bg-amber-50/30" : "border-border"
        }`}
      />
      {jsonError && <p className="mt-1 text-[11px] text-red-500 font-semibold">{jsonError}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterSettingsPage() {
  const { refresh: refreshPlatform } = useMasterPlatform();
  const [settings,     setSettings]     = useState<Setting[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("general");
  const [edits,        setEdits]        = useState<Record<string, string>>({});
  const [saving,       setSaving]       = useState<Record<string, boolean>>({});
  const [saved,        setSaved]        = useState<Record<string, boolean>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploaded,  setLogoUploaded]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Changelog tab state
  const [clEntries,    setClEntries]    = useState<ChangelogEntry[]>([]);
  const [clLoading,    setClLoading]    = useState(false);
  const [clVersion,    setClVersion]    = useState("");
  const [clDate,       setClDate]       = useState(new Date().toISOString().slice(0, 10));
  const [clHighlights, setClHighlights] = useState("");
  const [clSaving,     setClSaving]     = useState(false);
  const [clDeleting,   setClDeleting]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get<{ settings: Setting[] }>("/master/settings");
      setSettings(data.settings);
      const init: Record<string, string> = {};
      data.settings.forEach(s => {
        // Secrets: init edit to '' so the input is blank (ready for new value)
        init[s.key] = s.is_secret ? "" : s.value;
      });
      setEdits(init);
      const existingUrl = data.settings.find(s => s.key === "platform_logo_url")?.value;
      if (existingUrl) setEdits(e => ({ ...e, platform_logo_url: existingUrl }));
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadChangelog = useCallback(async () => {
    setClLoading(true);
    try {
      const { data } = await masterApi.get<{ entries: ChangelogEntry[] }>("/master/changelog");
      setClEntries(data.entries ?? []);
    } catch { /* interceptor */ }
    finally { setClLoading(false); }
  }, []);

  useEffect(() => { if (tab === "changelog") loadChangelog(); }, [tab, loadChangelog]);

  async function publishEntry() {
    const version = clVersion.trim();
    const lines   = clHighlights.split("\n").map(l => l.trim()).filter(Boolean);
    if (!version || !clDate || lines.length === 0) return;
    setClSaving(true);
    try {
      await masterApi.post("/master/changelog", { version, date: clDate, highlights: lines });
      setClVersion(""); setClHighlights("");
      await loadChangelog();
      toast.success(`v${version} published.`);
    } catch { toast.error("Failed to publish entry."); }
    finally { setClSaving(false); }
  }

  async function deleteEntry(id: string) {
    setClDeleting(id);
    try {
      await masterApi.delete(`/master/changelog/${id}`);
      setClEntries(prev => prev.filter(e => e.id !== id));
      toast.success("Entry deleted.");
    } catch { toast.error("Failed to delete entry."); }
    finally { setClDeleting(null); }
  }

  function get(key: string) { return edits[key] ?? ""; }
  function set(key: string, val: string) { setEdits(e => ({ ...e, [key]: val })); }

  const PLATFORM_KEYS = new Set(["platform_name", "platform_tagline", "platform_logo_url"]);

  async function saveSetting(key: string) {
    const s = settings.find(x => x.key === key);
    if (s?.is_secret && edits[key].trim() === "") return; // nothing new to save
    setSaving(v => ({ ...v, [key]: true }));
    try {
      const { data } = await masterApi.patch<{ setting: Setting }>(`/master/settings/${key}`, { value: edits[key] });
      setSaved(v => ({ ...v, [key]: true }));
      setTimeout(() => setSaved(v => ({ ...v, [key]: false })), 2000);

      // Update settings state with the server response
      setSettings(prev => prev.map(x => x.key === key ? data.setting : x));

      // For secrets: clear the input after save
      if (s?.is_secret) setEdits(e => ({ ...e, [key]: "" }));

      if (PLATFORM_KEYS.has(key)) refreshPlatform();
      toast.success("Setting saved.");
    } catch { toast.error("Failed to save setting."); }
    finally { setSaving(v => ({ ...v, [key]: false })); }
  }

  async function clearSecret(key: string) {
    try {
      await masterApi.delete(`/master/settings/${key}/value`);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: "" } : s));
      setEdits(e => ({ ...e, [key]: "" }));
      toast.success("Secret cleared — .env fallback is now active.");
    } catch { toast.error("Failed to clear secret."); }
  }

  function toggleReveal(key: string) {
    setRevealedKeys(v => ({ ...v, [key]: !v[key] }));
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setLogoUploaded(false);
    try {
      const form = new FormData();
      form.append("logo", file);
      const { data } = await masterApi.post<{ url: string }>("/master/settings/upload-logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEdits(e => ({ ...e, platform_logo_url: data.url }));
      setSettings(prev => prev.map(s => s.key === "platform_logo_url" ? { ...s, value: data.url } : s));
      setLogoUploaded(true);
      setTimeout(() => setLogoUploaded(false), 3000);
      refreshPlatform();
      toast.success("Logo uploaded.");
    } catch { toast.error("Failed to upload logo."); }
    finally { setLogoUploading(false); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadLogo(file);
    e.target.value = "";
  }

  function rowProps(key: string) {
    return {
      value:   get(key),
      onChange: (v: string) => set(key, v),
      onSave:  () => saveSetting(key),
      saving:  saving[key] ?? false,
      saved:   saved[key]  ?? false,
    };
  }

  function secretRowProps(key: string) {
    const s = settings.find(x => x.key === key);
    return {
      editValue:      get(key),
      onChange:       (v: string) => set(key, v),
      onSave:         () => saveSetting(key),
      onClear:        () => clearSecret(key),
      saving:         saving[key]       ?? false,
      saved:          saved[key]        ?? false,
      revealed:       revealedKeys[key] ?? false,
      onToggleReveal: () => toggleReveal(key),
      s: s ?? { key, value: "", label: key, type: "secret" as const, section: "integrations", updated_at: "", is_secret: true },
    };
  }

  function jsonRowProps(key: string) {
    const s = settings.find(x => x.key === key);
    return {
      value:   get(key),
      onChange: (v: string) => set(key, v),
      onSave:  () => saveSetting(key),
      saving:  saving[key] ?? false,
      saved:   saved[key]  ?? false,
      s: s ?? { key, value: "", label: key, type: "json" as const, section: "plans", updated_at: "" },
    };
  }

  const bySec = (sec: string) => settings.filter(s => s.section === sec);
  const byKey = (key: string) => settings.find(s => s.key === key);

  if (loading) return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border h-24 animate-pulse" />
      <div className="bg-white rounded-2xl border border-border h-72 animate-pulse" />
    </div>
  );

  const logoUrl = get("platform_logo_url");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl border border-border bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Settings2 size={22} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {get("platform_name") || "Settings"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {get("platform_tagline") || "Platform-wide configuration"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {get("maintenance_mode") === "true" && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-600">
                Maintenance Mode ON
              </span>
            )}
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-muted-foreground hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border px-2 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? "border-amber-400 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── GENERAL TAB ─────────────────────────────────────────────────────── */}
      {tab === "general" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Image size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Branding</p>
            </div>

            {/* Logo upload */}
            <div className="px-5 py-5 flex items-start gap-5 border-b border-border">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden group hover:border-amber-400 transition-colors"
              >
                {get("platform_logo_url") && !logoUploading ? (
                  <>
                    <img src={get("platform_logo_url")} alt="logo" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                      <Upload size={18} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-300 group-hover:text-amber-400 transition-colors">
                    {logoUploading
                      ? <RefreshCw size={22} className="animate-spin text-amber-400" />
                      : <Upload size={22} />}
                    <span className="text-[10px] font-semibold">{logoUploading ? "Uploading…" : "Upload"}</span>
                  </div>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-foreground">Platform Logo</p>
                  {logoUploading && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                      <RefreshCw size={10} className="animate-spin" /> Uploading…
                    </span>
                  )}
                  {logoUploaded && !logoUploading && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                      <Check size={10} /> Uploaded &amp; saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">PNG, SVG, WebP — max 2 MB. Click the box to upload, or paste a URL below.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={get("platform_logo_url")}
                    onChange={e => set("platform_logo_url", e.target.value)}
                    className={`flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      get("platform_logo_url") !== (settings.find(s => s.key === "platform_logo_url")?.value ?? "")
                        ? "border-amber-300 bg-amber-50/30" : "border-border"
                    }`}
                  />
                  {get("platform_logo_url") && (
                    <button type="button" onClick={() => set("platform_logo_url", "")}
                      className="p-2 rounded-xl border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  )}
                  <SaveBtn
                    saving={saving["platform_logo_url"] ?? false}
                    saved={saved["platform_logo_url"] ?? false}
                    dirty={get("platform_logo_url") !== (settings.find(s => s.key === "platform_logo_url")?.value ?? "")}
                    onClick={() => saveSetting("platform_logo_url")}
                  />
                </div>
              </div>
            </div>

            {bySec("general").filter(s => s.key !== "platform_logo_url").map(s => (
              <SettingRow key={s.key} s={s} {...rowProps(s.key)} />
            ))}
          </div>
        </div>
      )}

      {/* ── PLANS TAB ───────────────────────────────────────────────────────── */}
      {tab === "plans" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLAN_DEFS.map(plan => {
              const priceKey   = `plan_${plan.key}_price_usd`;
              const sitesKey   = `plan_${plan.key}_sites`;
              const tokensKey  = `plan_${plan.key}_tokens`;
              const storageKey = `plan_${plan.key}_storage`;
              const priceSetting   = byKey(priceKey);
              const sitesSetting   = byKey(sitesKey);
              const tokensSetting  = byKey(tokensKey);
              const storageSetting = byKey(storageKey);

              return (
                <div key={plan.key} className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col">
                  <div className="h-1.5" style={{ background: plan.color }} />

                  <div className="px-5 pt-4 pb-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-bold text-foreground">{plan.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-gray-50 border border-border px-1.5 py-0.5 rounded-md">{plan.key}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{plan.desc}</p>
                  </div>

                  <div className="p-4 flex-1 space-y-3">
                    {/* Price */}
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Price (USD/month)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">$</span>
                        <input
                          type="number" min={0}
                          value={get(priceKey)}
                          onChange={e => set(priceKey, e.target.value)}
                          className={`w-full pl-7 pr-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono ${
                            get(priceKey) !== (priceSetting?.value ?? "") ? "border-amber-300 bg-amber-50/30" : "border-border"
                          }`}
                        />
                      </div>
                      {priceSetting && get(priceKey) !== priceSetting.value && (
                        <div className="mt-1.5">
                          <SaveBtn saving={saving[priceKey] ?? false} saved={saved[priceKey] ?? false}
                            dirty={get(priceKey) !== priceSetting.value} onClick={() => saveSetting(priceKey)} />
                        </div>
                      )}
                    </div>

                    {/* Sites limit */}
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Max Sites</label>
                      <input
                        type="number" min={1}
                        value={get(sitesKey)}
                        onChange={e => set(sitesKey, e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono ${
                          get(sitesKey) !== (sitesSetting?.value ?? "") ? "border-amber-300 bg-amber-50/30" : "border-border"
                        }`}
                      />
                      {sitesSetting && get(sitesKey) !== sitesSetting.value && (
                        <div className="mt-1.5">
                          <SaveBtn saving={saving[sitesKey] ?? false} saved={saved[sitesKey] ?? false}
                            dirty={get(sitesKey) !== sitesSetting.value} onClick={() => saveSetting(sitesKey)} />
                        </div>
                      )}
                    </div>

                    {/* Token limit */}
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                        <Zap size={10} /> AI Tokens / month
                      </label>
                      <input
                        type="number" min={0}
                        value={get(tokensKey)}
                        onChange={e => set(tokensKey, e.target.value)}
                        placeholder={tokensSetting ? undefined : "Not configured"}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono ${
                          get(tokensKey) !== (tokensSetting?.value ?? "") ? "border-amber-300 bg-amber-50/30" : "border-border"
                        }`}
                      />
                      {tokensSetting && get(tokensKey) !== tokensSetting.value && (
                        <div className="mt-1.5">
                          <SaveBtn saving={saving[tokensKey] ?? false} saved={saved[tokensKey] ?? false}
                            dirty={get(tokensKey) !== tokensSetting.value} onClick={() => saveSetting(tokensKey)} />
                        </div>
                      )}
                    </div>

                    {/* Storage limit */}
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                        <HardDrive size={10} /> Storage limit (bytes)
                      </label>
                      <input
                        type="number" min={0}
                        value={get(storageKey)}
                        onChange={e => set(storageKey, e.target.value)}
                        placeholder={storageSetting ? undefined : "Not configured"}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono ${
                          get(storageKey) !== (storageSetting?.value ?? "") ? "border-amber-300 bg-amber-50/30" : "border-border"
                        }`}
                      />
                      {storageSetting && get(storageKey) !== storageSetting.value && (
                        <div className="mt-1.5">
                          <SaveBtn saving={saving[storageKey] ?? false} saved={saved[storageKey] ?? false}
                            dirty={get(storageKey) !== storageSetting.value} onClick={() => saveSetting(storageKey)} />
                        </div>
                      )}
                      {get(storageKey) && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          ≈ {(parseInt(get(storageKey) || "0") / (1024 * 1024 * 1024)).toFixed(2)} GB
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="rounded-xl px-3 py-2 text-xs flex items-center justify-between" style={{ background: `${plan.color}10` }}>
                      <span className="text-muted-foreground">Est. per agency/mo</span>
                      <span className="font-bold" style={{ color: plan.color }}>${get(priceKey) || "0"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Token & Storage packages JSON */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Zap size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Add-on Packages</p>
              <span className="ml-auto text-[11px] text-muted-foreground bg-gray-50 border border-border px-2 py-0.5 rounded-lg">
                JSON — changes take effect immediately
              </span>
            </div>
            {["token_packages", "storage_packages"].map(key => {
              const s = byKey(key);
              if (!s) return null;
              return <JsonRow key={key} {...jsonRowProps(key)} s={s} />;
            })}
          </div>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ────────────────────────────────────────────────── */}
      {tab === "integrations" && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <Lock size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Secret key management</p>
              <p className="text-xs text-amber-700">
                Values marked <strong>Set in DB</strong> are stored encrypted and take precedence over <code className="font-mono bg-amber-100 px-1 rounded">.env</code> variables.
                Click <strong>Clear</strong> on any secret to remove the DB value and fall back to the environment variable.
                Secrets are never shown — enter a new value to replace.
              </p>
            </div>
          </div>

          {INTEGRATION_GROUPS.map(group => {
            const Icon = group.icon;
            const rows = group.keys.map(k => settings.find(s => s.key === k)).filter(Boolean) as Setting[];
            if (rows.length === 0) return null;

            return (
              <div key={group.label} className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${group.color}18` }}>
                    <Icon size={14} style={{ color: group.color }} />
                  </div>
                  <p className="text-sm font-bold text-foreground">{group.label}</p>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {rows.filter(s => s.value === "••••••••").length}/{rows.filter(s => s.is_secret).length} secrets set
                  </span>
                </div>

                {rows.map(s => {
                  if (s.is_secret) {
                    return <SecretRow key={s.key} {...secretRowProps(s.key)} s={s} />;
                  }
                  return <SettingRow key={s.key} s={s} {...rowProps(s.key)} />;
                })}
              </div>
            );
          })}

          {/* Any remaining integrations-section settings not in a group */}
          {(() => {
            const groupedKeys = new Set(INTEGRATION_GROUPS.flatMap(g => g.keys));
            const extra = bySec("integrations").filter(s => !groupedKeys.has(s.key));
            if (extra.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Settings2 size={14} className="text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">Other</p>
                </div>
                {extra.map(s => s.is_secret
                  ? <SecretRow key={s.key} {...secretRowProps(s.key)} s={s} />
                  : <SettingRow key={s.key} s={s} {...rowProps(s.key)} />
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── PLATFORM TAB ────────────────────────────────────────────────────── */}
      {tab === "platform" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Sliders size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">System Controls</p>
            </div>
            {bySec("platform").filter(s => s.type === "boolean").map(s => (
              <SettingRow key={s.key} s={s} {...rowProps(s.key)} />
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Settings2 size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Limits &amp; Defaults</p>
            </div>
            {bySec("platform").filter(s => s.type !== "boolean").map(s => (
              <SettingRow key={s.key} s={s} {...rowProps(s.key)} />
            ))}
          </div>
        </div>
      )}

      {/* ── EMAIL TAB ───────────────────────────────────────────────────────── */}
      {tab === "email" && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Mail size={14} className="text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">SMTP Configuration</p>
            <span className="ml-auto text-[11px] text-muted-foreground bg-gray-50 border border-border px-2 py-0.5 rounded-lg">
              Used for alerts, reports, invites
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {bySec("email").map((s, i) => {
              if (s.is_secret) {
                return (
                  <div key={s.key} className={`${i % 2 === 0 ? "md:border-r" : ""} border-b border-border`}>
                    <SecretRow {...secretRowProps(s.key)} s={s} />
                  </div>
                );
              }
              return (
                <div
                  key={s.key}
                  className={`flex items-center justify-between gap-4 py-4 px-5 border-border ${
                    i % 2 === 0 ? "md:border-r md:border-b" : "md:border-b"
                  } border-b`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{s.key}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.type === "boolean" ? (
                      <>
                        <span className="text-xs text-muted-foreground">{get(s.key) === "true" ? "On" : "Off"}</span>
                        <Toggle on={get(s.key) === "true"} onChange={v => set(s.key, v ? "true" : "false")} />
                      </>
                    ) : (
                      <input
                        type={s.type === "number" ? "number" : "text"}
                        value={get(s.key)}
                        onChange={e => set(s.key, e.target.value)}
                        placeholder={s.key.includes("host") ? "smtp.mailgun.org" : s.key.includes("port") ? "587" : ""}
                        className={`px-3 py-1.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono ${
                          get(s.key) !== s.value ? "border-amber-300 bg-amber-50/30" : "border-border"
                        } ${s.type === "number" ? "w-20 text-right" : "w-44"}`}
                      />
                    )}
                    <SaveBtn
                      saving={saving[s.key] ?? false}
                      saved={saved[s.key] ?? false}
                      dirty={get(s.key) !== s.value}
                      onClick={() => saveSetting(s.key)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ────────────────────────────────────────────────────── */}
      {tab === "security" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Shield size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Authentication &amp; Sessions</p>
            </div>
            {bySec("security").map(s => (
              <SettingRow key={s.key} s={s} {...rowProps(s.key)} />
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <Shield size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Session changes require re-login</p>
              <p className="text-xs text-amber-700">
                Updating session duration values affects new tokens only — existing active sessions keep their original expiry.
                JWT secrets are configured via environment variables (<code className="font-mono bg-amber-100 px-1 rounded">MASTER_JWT_SECRET</code>, <code className="font-mono bg-amber-100 px-1 rounded">JWT_SECRET</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGELOG TAB ───────────────────────────────────────────────────── */}
      {tab === "changelog" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Plus size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Publish New Entry</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Version</label>
                  <input type="text" placeholder="e.g. 1.5.0" value={clVersion} onChange={e => setClVersion(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Date</label>
                  <input type="date" value={clDate} onChange={e => setClDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Highlights <span className="normal-case font-normal">(one per line)</span>
                </label>
                <textarea rows={4} placeholder={"New feature description\nAnother improvement\nBug fix detail"}
                  value={clHighlights} onChange={e => setClHighlights(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none font-mono" />
              </div>
              <div className="flex justify-end">
                <button onClick={publishEntry} disabled={clSaving || !clVersion.trim() || !clHighlights.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-colors"
                  style={{ background: AMBER }}>
                  {clSaving ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {clSaving ? "Publishing…" : "Publish Entry"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Sparkles size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Entry History</p>
              <span className="ml-auto text-[11px] text-muted-foreground">{clEntries.length} entries</span>
            </div>
            {clLoading ? (
              <div className="px-5 py-10 flex justify-center">
                <RefreshCw size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : clEntries.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">No changelog entries yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {clEntries.map(entry => (
                  <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground font-mono">v{entry.version}</span>
                        <span className="text-[11px] text-muted-foreground">{entry.date}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {entry.highlights.map((h, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} disabled={clDeleting === entry.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-40">
                      {clDeleting === entry.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
