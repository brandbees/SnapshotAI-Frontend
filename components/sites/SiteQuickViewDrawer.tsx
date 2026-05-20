"use client";

import { X, ExternalLink, ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { useState } from "react";
import { scoreHex } from "@/lib/utils";
import type { Site } from "@/types";

interface Props {
  site: Site;
  onClose: () => void;
}

const AVATAR_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function avatarColor(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function ScoreChip({ score, label }: { score: number; label: string }) {
  const hex = scoreHex(score);
  const bgMap: Record<string, string> = {
    "#16a34a": "#f0fdf4",
    "#d97706": "#fffbeb",
    "#dc2626": "#fef2f2",
  };
  return (
    <div
      className="flex flex-col items-center px-4 py-2 rounded-xl border"
      style={{ background: bgMap[hex] ?? "#f9fafb", borderColor: hex + "33" }}
    >
      <span className="text-lg font-bold tabular-nums" style={{ color: hex }}>
        {score}
      </span>
      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</span>
    </div>
  );
}

function UptimeRing({ pct }: { pct: number }) {
  return (
    <PieChart width={64} height={64}>
      <Pie
        data={[{ value: pct }, { value: 100 - pct }]}
        cx={27} cy={27}
        innerRadius={20} outerRadius={30}
        startAngle={90} endAngle={-270}
        dataKey="value"
        strokeWidth={0}
      >
        <Cell fill="#10b981" />
        <Cell fill="#f3f4f6" />
      </Pie>
    </PieChart>
  );
}

export function SiteQuickViewDrawer({ site, onClose }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const uptime = site.uptime_percentage ?? 0;
  const isOnline = site.uptime_status === "up";
  const scores = site.latest_scores;
  const overallScore = scores
    ? Math.round((scores.performance + scores.seo + scores.security + scores.malware) / 4)
    : null;

  const cleanUrl = site.url.replace(/^https?:\/\//, "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
            style={{ background: avatarColor(site.id) }}
          >
            {site.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{site.name}</p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent truncate mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {cleanUrl}
              <ExternalLink size={10} className="shrink-0" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status + Health */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Status</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
                />
                <span className={`text-sm font-semibold ${isOnline ? "text-green-600" : "text-red-600"}`}>
                  {isOnline ? "Online" : site.uptime_status === "down" ? "Down" : "Unknown"}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Health</p>
              {overallScore !== null ? (
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-xl font-bold" style={{ color: scoreHex(overallScore) }}>
                    {overallScore}
                  </span>
                  <span className="text-muted-foreground text-xs">/100</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">No data</p>
              )}
            </div>
          </div>

          {/* Audit Scores */}
          {scores && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Audit Scores</p>
              <div className="grid grid-cols-4 gap-2">
                <ScoreChip score={scores.performance} label="Perf" />
                <ScoreChip score={scores.seo} label="SEO" />
                <ScoreChip score={scores.security} label="Sec" />
                <ScoreChip score={scores.malware} label="Malware" />
              </div>
            </div>
          )}

          {/* Uptime */}
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-1">Uptime</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{uptime.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">30-day window</p>
              </div>
              <UptimeRing pct={uptime} />
            </div>
          </div>

          {/* Site Details collapsible */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
            >
              Site Details
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {detailsOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                <DetailRow label="Plugin" value={site.plugin_connected ? "Connected" : "Not connected"} />
                {site.plugin_data?.wp_version && (
                  <DetailRow label="WP Version" value={site.plugin_data.wp_version} />
                )}
                {site.plugin_data?.php_version && (
                  <DetailRow label="PHP Version" value={site.plugin_data.php_version} />
                )}
                {site.scan_schedule && (
                  <DetailRow label="Scan Schedule" value={site.scan_schedule} />
                )}
                {site.last_audit_at && (
                  <DetailRow
                    label="Last Audit"
                    value={new Date(site.last_audit_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={() => { window.location.href = `/sites/${site.id}`; }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--accent)" }}
          >
            Run Audit Now
          </button>
          <button
            onClick={() => { window.location.href = `/reports/${site.id}`; }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-gray-50 transition-colors"
          >
            View Reports
          </button>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground capitalize">{value}</span>
    </div>
  );
}
