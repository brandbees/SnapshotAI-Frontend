"use client";

import { useState } from "react";
import { toast } from "sonner";
import masterApi from "@/lib/masterApi";
import { Download, Building2, Globe, BarChart2, Tag, FileText } from "lucide-react";

interface ExportItem {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  endpoint: string;
  filename: string;
  options?: { key: string; label: string; default: string; choices: { value: string; label: string }[] }[];
}

const EXPORTS: ExportItem[] = [
  {
    key: "agencies",
    label: "Agencies",
    desc: "All registered agencies with plan, site count, and team count",
    icon: Building2,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    endpoint: "/master/export/agencies",
    filename: "agencies.csv",
  },
  {
    key: "sites",
    label: "Sites",
    desc: "All sites with plugin status, SSL/domain expiry, last audit score",
    icon: Globe,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    endpoint: "/master/export/sites",
    filename: "sites.csv",
  },
  {
    key: "audits",
    label: "Audits",
    desc: "Audit results with all scores, status, and agency info",
    icon: BarChart2,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    endpoint: "/master/export/audits",
    filename: "audits.csv",
    options: [
      {
        key: "days",
        label: "Time range",
        default: "30",
        choices: [
          { value: "7",   label: "Last 7 days" },
          { value: "30",  label: "Last 30 days" },
          { value: "90",  label: "Last 90 days" },
          { value: "365", label: "Last 365 days" },
        ],
      },
    ],
  },
  {
    key: "coupons",
    label: "Coupons",
    desc: "All coupon codes with usage stats and expiry info",
    icon: Tag,
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    endpoint: "/master/export/coupons",
    filename: "coupons.csv",
  },
];

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [opts, setOpts] = useState<Record<string, Record<string, string>>>({});

  async function download(item: ExportItem) {
    setDownloading(item.key);
    try {
      const params: Record<string, string> = { ...(opts[item.key] ?? {}) };
      const { data } = await masterApi.get(item.endpoint, {
        params,
        responseType: "blob",
      });
      const url  = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href  = url;
      link.download = item.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to download ${item.label}.`);
    } finally {
      setDownloading(null);
    }
  }

  function setOpt(itemKey: string, optKey: string, value: string) {
    setOpts(prev => ({ ...prev, [itemKey]: { ...(prev[itemKey] ?? {}), [optKey]: value } }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }} />
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
            <Download size={20} style={{ color: "#10b981" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Export Center</h1>
            <p className="text-sm text-muted-foreground">Download platform data as CSV files</p>
          </div>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {EXPORTS.map(item => {
          const Icon = item.icon;
          const busy = downloading === item.key;
          return (
            <div key={item.key} className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: item.bg }}>
                  <Icon size={22} style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </div>

              {/* Options */}
              {item.options && (
                <div className="mt-4 space-y-2">
                  {item.options.map(opt => (
                    <div key={opt.key} className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-muted-foreground w-20">{opt.label}</label>
                      <select
                        value={opts[item.key]?.[opt.key] ?? opt.default}
                        onChange={e => setOpt(item.key, opt.key, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none">
                        {opt.choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => download(item)}
                disabled={busy}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50"
                style={busy ? {} : { borderColor: item.color, color: item.color, background: item.bg }}>
                <Download size={14} className={busy ? "animate-bounce" : ""} />
                {busy ? "Downloading…" : `Download ${item.label} CSV`}
              </button>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText size={11} />
                <span>CSV · UTF-8 · all columns included</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
        <strong>Note:</strong> Exports reflect live data at download time. Large datasets may take a few seconds to generate.
      </div>
    </div>
  );
}
