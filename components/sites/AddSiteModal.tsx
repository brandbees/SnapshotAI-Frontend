"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Site } from "@/types";

interface AddSiteModalProps {
  onClose: () => void;
  onSuccess: (siteId: string) => void;
}

export function AddSiteModal({ onClose, onSuccess }: AddSiteModalProps) {
  const [step, setStep] = useState<"form" | "token">("form");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState<Site | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<{ site: Site }>("/sites", { name, url });
      setSite(data.site);
      setStep("token");
      toast.success("Site added successfully");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to add site.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyToken() {
    if (!site?.site_token) return;
    navigator.clipboard.writeText(site.site_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {step === "form" ? "Add a site" : "Install the plugin"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Site name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  placeholder="Client Site Name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Site URL
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  placeholder="https://clientsite.com"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors disabled:opacity-60"
                  style={{ background: "var(--accent)" }}
                >
                  {loading ? "Adding…" : "Add site"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Copy your site token and paste it into the BrandBees SnapshotAI
                WordPress plugin settings.
              </p>

              {/* Token */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border border-border">
                <code className="flex-1 text-xs font-mono text-foreground truncate">
                  {site?.site_token}
                </code>
                <button
                  onClick={copyToken}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Steps */}
              <ol className="space-y-2">
                {[
                  "Download the BrandBees SnapshotAI plugin (.zip)",
                  "Go to WordPress Admin → Plugins → Add New → Upload",
                  "Install and activate the plugin",
                  "Go to Settings → BrandBees SnapshotAI",
                  "Paste your site token and save",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => onSuccess(site!.id)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  I&apos;ll do this later
                </button>
                <button
                  onClick={() => onSuccess(site!.id)}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md"
                  style={{ background: "var(--accent)" }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
