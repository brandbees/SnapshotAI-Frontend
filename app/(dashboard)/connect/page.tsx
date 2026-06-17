"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Download, Copy, Check, Loader2, CheckCircle2,
  Globe, AlertCircle, ArrowLeft,
} from "lucide-react";
import api from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Site } from "@/types";

export default function ConnectPage() {
  const [sites, setSites]               = useState<Site[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [connStatus, setConnStatus]     = useState<"waiting" | "checking" | "connected">("waiting");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get<{ sites: Site[] }>("/sites")
      .then(({ data }) => {
        const list: Site[] = Array.isArray(data) ? data : (data.sites ?? []);
        setSites(list);
        const disconnected = list.filter((s) => !s.plugin_connected);
        if (disconnected.length === 1) setSelectedId(disconnected[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = sites.find((s) => s.id === selectedId) ?? null;

  const checkConn = useCallback(async (manual = false) => {
    if (!selectedId) return;
    if (manual) setConnStatus("checking");
    try {
      const { data } = await api.get<{ plugin_connected: boolean }>(`/sites/${selectedId}/connection-status`);
      if (data.plugin_connected) {
        setConnStatus("connected");
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (manual) {
        setConnStatus("waiting");
      }
    } catch {
      if (manual) setConnStatus("waiting");
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setConnStatus("waiting");
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => checkConn(false), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedId, checkConn]);

  function copyToken() {
    if (!selected?.site_token) return;
    navigator.clipboard.writeText(selected.site_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  }

  if (sites.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <Globe size={24} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">No sites yet</h1>
        <p className="text-sm text-muted-foreground mb-6">Add a site first before connecting the plugin.</p>
        <Link href="/sites" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}>
          Go to Sites
        </Link>
      </div>
    );
  }

  const allConnected = sites.every((s) => s.plugin_connected);

  if (allConnected && !selectedId) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5 shadow-md">
          <CheckCircle2 size={28} className="text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">All sites are connected!</h1>
        <p className="text-sm text-muted-foreground mb-6">Every site in your portfolio has the plugin installed.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (connStatus === "connected") {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Plugin connected!</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selected?.name}</span> is now connected and monitoring.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)" }}>
            Go to Dashboard
          </Link>
          <Link href="/sites" className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-gray-50 transition-colors">
            View Sites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="text-xl font-bold text-foreground">Connect the WordPress Plugin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Install the plugin on your WordPress site and paste your site token to start monitoring.
        </p>
      </div>

      {/* Site selector — shown when user has multiple sites */}
      {sites.length > 1 && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
            Which site are you connecting?
          </p>
          <div className="space-y-2">
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => setSelectedId(site.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                  selectedId === site.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.url}</p>
                </div>
                {site.plugin_connected ? (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 shrink-0">Connected</span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">Not connected</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedId && sites.length > 1 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Select a site above to see its connection token and instructions.
        </p>
      )}

      {selected && (
        <>
          {/* Step 1 — Download */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Step 1 — Download the plugin</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download the BrandBees SnapshotAI WordPress plugin zip file.
                </p>
              </div>
              <a
                href={`${API_BASE_URL}/plugin/download`}
                download="brandbees-snapshot.zip"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)" }}
              >
                <Download size={14} /> Download
              </a>
            </div>
          </div>

          {/* Step 2 — Install */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Step 2 — Install &amp; activate on WordPress</p>
            <div className="space-y-3">
              {[
                "In WordPress admin, go to Plugins → Add New → Upload Plugin",
                "Upload the downloaded zip file and click Install Now",
                "Activate the plugin, then open Settings → BrandBees Snapshot",
                "Paste your site token (Step 3 below) into the API Key field and click Save & Connect",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-foreground leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 — Token + verify */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Step 3 — Paste your site token</p>
            <p className="text-xs text-muted-foreground mb-4">
              Copy this token and paste it into the API Key field in your WordPress plugin settings.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 text-xs text-foreground font-mono bg-muted border border-border rounded-lg px-3 py-2.5 truncate">
                {selected.site_token}
              </code>
              <button
                onClick={copyToken}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-border bg-surface text-foreground hover:bg-muted transition-colors shrink-0"
              >
                {copied ? (
                  <><Check size={12} className="text-green-500" /> Copied!</>
                ) : (
                  <><Copy size={12} /> Copy</>
                )}
              </button>
            </div>

            <button
              onClick={() => checkConn(true)}
              disabled={connStatus === "checking"}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold border-2 transition-colors disabled:opacity-60"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {connStatus === "checking" ? (
                <><Loader2 size={15} className="animate-spin" /> Checking…</>
              ) : (
                <><Check size={15} /> I&apos;ve connected it — verify now</>
              )}
            </button>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse shrink-0" />
              Checking automatically every 5 seconds
            </p>
          </div>

          {/* Troubleshooting */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-2">Troubleshooting</p>
                <ul className="space-y-1.5 text-xs text-amber-800">
                  <li>• Make sure the plugin is <strong>activated</strong>, not just installed</li>
                  <li>• Your site must be publicly accessible (not localhost or a staging domain blocked by firewall)</li>
                  <li>• Double-check the token — no extra spaces before or after</li>
                  <li>• If you use a caching plugin, clear the cache after connecting</li>
                  <li>• Some hosts block outbound HTTP — ask your host to whitelist API requests</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
