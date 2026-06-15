"use client";

import { useState, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { Upload, Lock, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { setAgency } from "@/lib/auth";
import { useBranding } from "@/contexts/BrandingContext";
import api from "@/lib/api";

interface SettingsPayload {
  logo_url?: string | null;
  brand_name?: string;
  brand_tagline?: string;
  accent_color?: string;
  favicon_url?: string | null;
}

interface SettingsResponse extends SettingsPayload {
  id: string;
}

export default function WhiteLabelPage() {
  const { agency } = useAuth();
  const { roleCanDo, loading: roleLoading } = useRole();
  const { setBranding } = useBranding();

  if (!roleLoading && !roleCanDo("edit_white_label")) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Lock size={22} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Access restricted</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Brand settings can only be changed by the account owner.
          </p>
        </div>
      </div>
    );
  }

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [showPicker, setShowPicker] = useState(false);
  const [hexInput, setHexInput] = useState("#6366f1");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Load current settings on mount
  useEffect(() => {
    api.get<SettingsResponse>("/settings").then(({ data }) => {
      if (data.logo_url) { setLogoUrl(data.logo_url); setLogoPreview(data.logo_url); }
      if (data.brand_name) setBrandName(data.brand_name);
      if (data.brand_tagline) setTagline(data.brand_tagline);
      if (data.accent_color) { setAccentColor(data.accent_color); setHexInput(data.accent_color); }
      if (data.favicon_url) { setFaviconUrl(data.favicon_url); setFaviconPreview(data.favicon_url); }
    }).catch(() => {
      if (agency) {
        if (agency.logo_url) { setLogoUrl(agency.logo_url); setLogoPreview(agency.logo_url); }
        if (agency.brand_name) setBrandName(agency.brand_name);
        if (agency.brand_tagline) setTagline(agency.brand_tagline);
        if (agency.accent_color) { setAccentColor(agency.accent_color); setHexInput(agency.accent_color); }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  async function uploadFile(file: File) {
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      toast.error("Only PNG, SVG, or JPG files are accepted.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const { data } = await api.post<{ logo_url: string }>("/settings/logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogoUrl(data.logo_url);
    } catch {
      toast.error("Logo upload failed. Try again.");
      setLogoPreview(logoUrl);
    } finally {
      setUploading(false);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  async function uploadFavicon(file: File) {
    const allowed = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Only PNG, ICO, or SVG files are accepted for favicons.");
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error("Favicon must be under 512KB.");
      return;
    }
    setFaviconPreview(URL.createObjectURL(file));
    setFaviconUploading(true);
    try {
      const form = new FormData();
      form.append("favicon", file);
      const { data } = await api.post<{ favicon_url: string }>("/settings/favicon", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFaviconUrl(data.favicon_url);
    } catch {
      toast.error("Favicon upload failed. Try again.");
      setFaviconPreview(faviconUrl);
    } finally {
      setFaviconUploading(false);
    }
  }

  function onFaviconInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFavicon(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleHexInput(val: string) {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setAccentColor(val);
    }
  }

  function handlePickerChange(color: string) {
    setAccentColor(color);
    setHexInput(color);
  }

  async function save() {
    setSaving(true);
    try {
      const payload: SettingsPayload = {
        logo_url: logoUrl,
        brand_name: brandName,
        brand_tagline: tagline,
        accent_color: accentColor,
        favicon_url: faviconUrl,
      };
      const { data } = await api.put<SettingsResponse>("/settings", payload);
      // Sync updated agency into localStorage so branding applies globally
      if (agency) {
        const updated = {
          ...agency,
          logo_url: data.logo_url ?? agency.logo_url,
          brand_name: data.brand_name ?? agency.brand_name,
          brand_tagline: data.brand_tagline ?? agency.brand_tagline,
          accent_color: data.accent_color ?? agency.accent_color,
        };
        setAgency(updated);
      }
      setBranding({
        logoUrl: data.logo_url ?? null,
        brandName: data.brand_name ?? null,
        accentColor: data.accent_color ?? null,
        faviconUrl: data.favicon_url ?? null,
      });
      toast.success("Brand settings saved.");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const previewName = brandName || agency?.name || "Your Agency";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Brand Settings"
        description="Customise how your reports and portal look to clients."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — form */}
        <div className="space-y-5">
          {/* Logo upload */}
          <Card>
            <CardHeader>
              <CardTitle>Agency Logo</CardTitle>
            </CardHeader>
            <input ref={fileRef} type="file" accept=".png,.svg,.jpg,.jpeg" className="hidden" onChange={onFileInput} />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                dragging
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-border hover:border-border-strong hover:bg-muted/40"
              }`}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="max-h-16 max-w-[160px] object-contain" />
              ) : (
                <Upload size={28} className="text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {uploading ? "Uploading…" : "Drag & drop or click to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, SVG, or JPG — max 2MB</p>
              </div>
              {logoPreview && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLogoPreview(null); setLogoUrl(null); }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background border border-border hover:bg-muted text-muted-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </Card>

          {/* Favicon upload */}
          <Card>
            <CardHeader>
              <CardTitle>Browser Favicon</CardTitle>
            </CardHeader>
            <input ref={faviconRef} type="file" accept=".png,.ico,.svg" className="hidden" onChange={onFaviconInput} />
            <div className="flex items-center gap-4">
              <button
                onClick={() => faviconRef.current?.click()}
                className="relative w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-border-strong hover:bg-muted/40 flex items-center justify-center shrink-0 transition-colors overflow-hidden"
                title="Click to upload favicon"
              >
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon preview" className="w-8 h-8 object-contain" />
                ) : (
                  <Upload size={18} className="text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {faviconUploading ? "Uploading…" : faviconPreview ? "Favicon uploaded" : "Upload a favicon"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, ICO, or SVG — max 512KB. Shown in browser tabs.</p>
              </div>
              {faviconPreview && (
                <button
                  onClick={() => { setFaviconPreview(null); setFaviconUrl(null); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </Card>

          {/* Brand info */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Agency Display Name</label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={agency?.name || "Your Agency Name"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cover Page Tagline</label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Website performance & security experts"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown on PDF report cover pages.</p>
              </div>
            </div>
          </Card>

          {/* Accent color */}
          <Card>
            <CardHeader>
              <CardTitle>Accent Color</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-3">
              <div ref={pickerRef} className="relative">
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  className="w-10 h-10 rounded-lg border-2 border-border shadow-sm"
                  style={{ backgroundColor: accentColor }}
                />
                {showPicker && (
                  <div className="absolute top-12 left-0 z-20 shadow-xl rounded-xl overflow-hidden border border-border">
                    <HexColorPicker color={accentColor} onChange={handlePickerChange} />
                  </div>
                )}
              </div>
              <Input
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#6366f1"
                className="w-32 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Applied to report headers, score gauges, and portal accent elements.
              </p>
            </div>
          </Card>

          <Button onClick={save} loading={saving} className="w-full">
            Save Brand Settings
          </Button>
        </div>

        {/* Right — live preview */}
        <div className="sticky top-6">
          <Card padding="none">
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
          </Card>
        </div>
      </div>
    </div>
  );
}

interface BrandPreviewProps {
  logoUrl: string | null;
  brandName: string;
  tagline: string;
  accentColor: string;
}

function BrandPreview({ logoUrl, brandName, tagline, accentColor }: BrandPreviewProps) {
  return (
    <div className="relative bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md select-none" style={{ aspectRatio: "210/297", maxWidth: 280, margin: "0 auto" }}>
      {/* Header bar */}
      <div className="h-12 flex items-center px-5 gap-3" style={{ backgroundColor: accentColor }}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-7 object-contain brightness-0 invert" />
        ) : (
          <div className="h-7 w-20 rounded bg-white/30" />
        )}
        <span className="text-white font-semibold text-sm truncate">{brandName}</span>
      </div>

      {/* Cover content */}
      <div className="flex flex-col items-center justify-center px-8 text-center" style={{ paddingTop: "10%" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${accentColor}18` }}>
          <div className="w-8 h-8 rounded-full border-4" style={{ borderColor: accentColor }} />
        </div>
        <p className="text-sm font-bold text-gray-800 mb-1">Website Performance Report</p>
        <p className="text-[10px] text-gray-500 mb-6">example.com · {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>

        {/* Score placeholder */}
        <div className="w-full bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2 font-semibold">Overall Health Score</p>
          <div className="text-3xl font-bold" style={{ color: accentColor }}>87</div>
          <p className="text-[9px] text-gray-400 mt-0.5">Healthy</p>
        </div>

        {/* Pillar pills */}
        <div className="grid grid-cols-2 gap-1.5 w-full">
          {["Performance · 91", "Security · 85", "SEO · 88", "Malware · 100"].map((label) => (
            <div key={label} className="bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
              <p className="text-[8px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-3 left-0 right-0 px-5 flex justify-between items-center">
        <p className="text-[8px] text-gray-400">{tagline}</p>
        <p className="text-[8px] text-gray-400">Confidential</p>
      </div>
    </div>
  );
}
