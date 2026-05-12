"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { Upload, Check, AlertCircle, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { setAgency } from "@/lib/auth";
import api from "@/lib/api";

interface SettingsPayload {
  logo_url?: string | null;
  brand_name?: string;
  brand_tagline?: string;
  accent_color?: string;
}

interface SettingsResponse extends SettingsPayload {
  id: string;
}

export default function WhiteLabelPage() {
  const { agency } = useAuth();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [showPicker, setShowPicker] = useState(false);
  const [hexInput, setHexInput] = useState("#6366f1");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Load current settings on mount
  useEffect(() => {
    api.get<SettingsResponse>("/settings").then(({ data }) => {
      if (data.logo_url) { setLogoUrl(data.logo_url); setLogoPreview(data.logo_url); }
      if (data.brand_name) setBrandName(data.brand_name);
      if (data.brand_tagline) setTagline(data.brand_tagline);
      if (data.accent_color) { setAccentColor(data.accent_color); setHexInput(data.accent_color); }
    }).catch(() => {
      // Use agency data from JWT as fallback
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

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function uploadFile(file: File) {
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      showToast("error", "Only PNG, SVG, or JPG files are accepted.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "File must be under 2MB.");
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
      showToast("error", "Logo upload failed. Try again.");
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
      showToast("success", "Brand settings saved.");
    } catch {
      showToast("error", "Failed to save. Please try again.");
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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

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
