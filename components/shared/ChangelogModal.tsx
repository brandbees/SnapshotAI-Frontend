"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import api from "@/lib/api";

interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

// Fallback used when the API is unreachable (e.g. backend not yet deployed)
const FALLBACK_ENTRIES: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-05-20",
    highlights: [
      "In-app changelog — stay up to date without leaving the dashboard",
      "Onboarding checklist — guided steps for new agencies",
      "Demo workspace — seed realistic data for client demos",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-05-10",
    highlights: [
      "Slack webhook alerts — get notified in your workspace",
      "Weekly digest emails — one summary instead of many alerts",
      "Score trend charts — 30 / 90 / 180 / 365 day range toggle",
      "Report annotations — add internal notes to any PDF report",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-22",
    highlights: [
      "Client report portal — shareable branded link for each report",
      "Per-client branding kits — individual logo and color per client",
      "Standalone security audit PDF — one-click download from malware tab",
      "Scheduled report delivery — weekly and monthly auto-send",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-05",
    highlights: [
      "PDF report generator — fully branded with agency logo and colors",
      "WooCommerce tab — orders, revenue, and gateway data",
      "Site detail tabs — Security, Performance, SEO, Malware, Plugins",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-15",
    highlights: [
      "BrandBees SnapshotAI is live — connect your first site",
      "WordPress plugin — hourly push of 53 data points",
      "Audit pipeline — scanner + uptime + score normalisation",
      "Alert system — threshold-based email alerts",
    ],
  },
];

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
  onSeen: () => void;
}

export function ChangelogModal({ open, onClose, onSeen }: ChangelogModalProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get<{ entries: ChangelogEntry[]; unread: number }>("/changelog")
      .then(({ data }) => setEntries(data.entries))
      .catch(() => setEntries(FALLBACK_ENTRIES))
      .finally(() => setLoading(false));

    // Best-effort — ignore if backend not yet deployed
    api.post("/changelog/seen").then(onSeen).catch(() => {});
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-foreground">What's new</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div key={`${entry.version}-${idx}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    v{entry.version}
                  </span>
                  {idx === 0 && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Latest
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(entry.date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
