"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, RefreshCw, ExternalLink, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Shield, Package, ShoppingCart, Wifi, Key, Copy, Eye, EyeOff,
  Activity, Wrench, TrendingUp, Clock, Zap, Server, Database, LayoutGrid,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { useSite } from "@/hooks/useSite";
import { useAuditStatus } from "@/hooks/useAuditStatus";
import { useRole } from "@/hooks/useRole";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { AuditHistoryTable } from "@/components/dashboard/AuditHistoryTable";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { timeAgo, scoreHex } from "@/lib/utils";
import type { Site, Audit, ScanResult } from "@/types";

const AVATAR_COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
function siteAvatarColor(id: string) { return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length]; }

// ── Tab config ────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "security"
  | "performance"
  | "seo"
  | "malware"
  | "uptime"
  | "plugins"
  | "woocommerce";

const BASE_TABS: { key: Tab; label: string }[] = [
  { key: "overview",     label: "Overview" },
  { key: "seo",          label: "SEO" },
  { key: "security",     label: "Security" },
  { key: "performance",  label: "Performance" },
  { key: "malware",      label: "Malware" },
  { key: "uptime",       label: "Uptime" },
  { key: "plugins",      label: "Plugins" },
  { key: "woocommerce",  label: "WooCommerce" },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}



// ── Signal row (Security + Performance) ──────────────────────────────────────

function SignalRow({
  label,
  value,
  risky,
  na = false,
  text,
}: {
  label: string;
  value: boolean | null | undefined;
  risky: boolean; // true when value=true is bad
  na?: boolean;
  text?: string;
}) {
  if (value === null || value === undefined || na) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{text || "Unknown"}</span>
      </div>
    );
  }
  const isRisk = risky ? value : !value;
  const Icon = isRisk ? XCircle : CheckCircle2;
  const color = isRisk ? "var(--score-bad)" : "var(--score-good)";
  const statusText =
    text ??
    (risky
      ? value ? "Enabled (risk)" : "Disabled (safe)"
      : value ? "Active (safe)" : "Not active (risk)");
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{statusText}</span>
        <Icon size={15} style={{ color }} />
      </div>
    </div>
  );
}

// ── Plugin data panel (collapsible) ──────────────────────────────────────────

function PluginDataPanel({ site }: { site: Site }) {
  const [open, setOpen] = useState(true);
  const pd = site.plugin_data;

  const serverRows = [
    { label: "WordPress", value: pd?.wp_version },
    { label: "PHP",       value: pd?.php_version },
    { label: "MySQL",     value: site.mysql_version },
    { label: "Server",    value: pd?.server_software },
    { label: "Memory",    value: site.memory_limit },
  ].filter((r) => r.value) as { label: string; value: string }[];

  const dbRows = [
    { label: "DB Size",         value: site.database_size_mb != null       ? `${site.database_size_mb} MB`         : null, warn: false },
    { label: "DB Tables",       value: site.database_table_count != null   ? String(site.database_table_count)     : null, warn: false },
    { label: "Autoloaded",      value: site.autoloaded_options_kb != null  ? `${site.autoloaded_options_kb} KB`    : null, warn: (site.autoloaded_options_kb ?? 0) > 800 },
    { label: "Transients",      value: site.transient_count != null        ? String(site.transient_count)          : null, warn: (site.transient_count ?? 0) > 100 },
    { label: "Post Revisions",  value: site.post_revisions_count != null   ? String(site.post_revisions_count)     : null, warn: (site.post_revisions_count ?? 0) > 500 },
    { label: "Orphaned Meta",   value: site.orphaned_post_meta_count != null ? String(site.orphaned_post_meta_count) : null, warn: (site.orphaned_post_meta_count ?? 0) > 0 },
  ].filter((r) => r.value !== null) as { label: string; value: string; warn: boolean }[];

  const contentRows = [
    { label: "Posts",    value: site.total_posts != null    ? String(site.total_posts)    : null },
    { label: "Pages",    value: site.total_pages != null    ? String(site.total_pages)    : null },
    { label: "Media",    value: site.total_media != null    ? String(site.total_media)    : null },
    { label: "Comments", value: site.total_comments != null ? String(site.total_comments) : null },
  ].filter((r) => r.value !== null) as { label: string; value: string }[];

  const metaRows = [
    { label: "Last published", value: site.last_published_at ? timeAgo(site.last_published_at) : null },
    { label: "Last sync",      value: pd?.last_sync ? timeAgo(pd.last_sync) : null },
  ].filter((r) => r.value !== null) as { label: string; value: string }[];

  const totalCount = serverRows.length + dbRows.length + contentRows.length + metaRows.length;
  const hasData = totalCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Server size={15} className="text-blue-500" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Server & Environment</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasData ? `${totalCount} data points collected` : "Connect plugin to collect server data"}
          </p>
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !hasData && (
        <div className="border-t border-border px-5 py-8 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Server size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No environment data yet</p>
          <p className="text-xs text-muted-foreground">Install and connect the plugin to collect<br />server, database, and content stats.</p>
        </div>
      )}

      {open && hasData && (
        <div className="border-t border-border divide-y divide-border">

          {/* Server rows */}
          {serverRows.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Server size={12} className="text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Server</p>
              </div>
              <div>
                {serverRows.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                    <span className="text-xs font-semibold text-foreground text-right ml-4 break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Database rows */}
          {dbRows.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Database size={12} className="text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Database</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {dbRows.map(({ label, value, warn }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0 sm:last:border-0">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`text-xs font-semibold tabular-nums ${warn ? "text-amber-500" : "text-foreground"}`}>
                      {value}
                      {warn && <AlertCircle size={11} className="inline ml-1 text-amber-400" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content stats */}
          {contentRows.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid size={12} className="text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Content</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {contentRows.map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                    <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          {metaRows.length > 0 && (
            <div className="px-5 py-3 flex items-center gap-6 flex-wrap bg-gray-50/60">
              {metaRows.map(({ label, value }) => (
                <span key={label} className="text-xs text-muted-foreground">
                  {label}: <span className="font-semibold text-foreground">{value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  site,
  audits,
  runAudit,
  auditLoading,
  canRunAudit,
}: {
  site: Site;
  audits: Audit[];
  runAudit: () => void;
  auditLoading: boolean;
  canRunAudit: boolean;
}) {
  const scores = site.latest_scores;
  const prevAudit = audits[1];
  const overallScore = scores
    ? Math.round((scores.performance + scores.seo + scores.security + scores.malware) / 4)
    : null;

  const pillarConfig: {
    key: "performance" | "seo" | "security" | "malware";
    label: string;
    isMalware?: boolean;
  }[] = [
    { key: "performance", label: "Performance" },
    { key: "seo",         label: "SEO" },
    { key: "security",    label: "Security" },
    { key: "malware",     label: "Malware", isMalware: true },
  ];

  // Collect top issues from available site data
  const issues: { label: string; severity: "critical" | "warn" }[] = [];
  if (site.xml_rpc_enabled)    issues.push({ label: "XML-RPC is enabled", severity: "warn" });
  if (site.file_editor_enabled) issues.push({ label: "File editor enabled", severity: "warn" });
  if (site.wp_debug_enabled)   issues.push({ label: "Debug mode active", severity: "critical" });
  if (site.login_url_default)  issues.push({ label: "Default /wp-login URL exposed", severity: "warn" });
  if (site.wp_config_writable) issues.push({ label: "wp-config.php is writable", severity: "critical" });
  if (site.htaccess_writable)  issues.push({ label: ".htaccess is writable", severity: "critical" });
  if (!site.caching_plugin)    issues.push({ label: "No caching plugin installed", severity: "warn" });
  if (site.admin_usernames?.includes("admin")) issues.push({ label: 'Admin username "admin" exists', severity: "critical" });
  const sslDays = sslDaysRemaining(site.ssl_expiry_date);
  if (sslDays !== null && sslDays < 30)
    issues.push({ label: `SSL expires in ${sslDays}d`, severity: sslDays < 7 ? "critical" : "warn" });

  // Overall health trend
  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const trendPts = completed.slice(-10).map((a) => ({
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.round((a.scores!.performance + a.scores!.seo + a.scores!.security + a.scores!.malware) / 4),
  }));
  const displayTrend = trendPts.length === 1
    ? [{ date: "—", score: trendPts[0].score }, trendPts[0]]
    : trendPts;

  return (
    <div className="space-y-5">

      {/* Quick stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Health Score",
            value: overallScore !== null ? `${overallScore}` : "—",
            unit: overallScore !== null ? "/100" : "",
            color: overallScore !== null ? scoreHex(overallScore) : "#9ca3af",
            icon: <TrendingUp size={15} />,
          },
          {
            label: "30d Uptime",
            value: site.uptime_percentage !== undefined && site.uptime_percentage !== null
              ? `${site.uptime_percentage.toFixed(1)}` : "—",
            unit: "%",
            color: "#10b981",
            icon: <Activity size={15} />,
          },
          {
            label: "Last Audit",
            value: site.last_audit_at ? timeAgo(site.last_audit_at) : "Never",
            unit: "",
            color: "#6366f1",
            icon: <Clock size={15} />,
          },
          {
            label: "Scan Schedule",
            value: site.scan_schedule ?? "Manual",
            unit: "",
            color: "#f59e0b",
            icon: <Zap size={15} />,
          },
        ].map(({ label, value, unit, color, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + "18", color }}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-base font-bold text-foreground tabular-nums leading-tight truncate">
                {value}<span className="text-xs font-normal text-muted-foreground">{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 4 score gauges */}
      {scores ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pillarConfig.map(({ key, label, isMalware }) => {
            const score = scores[key];
            const prevScore = prevAudit?.scores?.[key];
            const delta = prevScore !== undefined ? score - prevScore : undefined;
            const sub = delta === undefined ? undefined : delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} from last`;
            const variant: "good" | "warn" | "bad" =
              delta === 0 ? "warn" : key === "malware" ? (score >= 80 ? "good" : "bad") : score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
            return (
              <div key={key} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center min-h-[190px]">
                <ScoreGauge score={score} label={label} sublabel={sub} sublabelVariant={variant} size="lg" isMalware={!!isMalware} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm flex items-center justify-center py-12">
          <div className="text-center">
            <Wifi size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No audit data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run your first audit to see scores</p>
            {canRunAudit && (
              <Button className="mt-4" size="sm" onClick={runAudit} loading={auditLoading}>
                Run first audit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main two-column section: left = trend + audit history, right = issues + environment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Health Score Trend */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">Health Score Trend</h3>
              {trendPts.length >= 2 && (() => {
                const delta = trendPts[trendPts.length - 1].score - trendPts[0].score;
                return (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                    {delta >= 0 ? "+" : ""}{delta} pts
                  </span>
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground mb-4">Overall average across all pillars</p>
            {displayTrend.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                Run audits to build trend data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={displayTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                    formatter={(v) => [`${v}`, "Health Score"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                    fill="url(#overviewGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Audit History */}
          <div className="bg-white rounded-2xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Audit History</h3>
            </div>
            <div className="p-5">
              <AuditHistoryTable audits={audits} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Top Issues */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Top Issues</h3>
              {issues.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                  {issues.length} found
                </span>
              )}
            </div>
            {issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <p className="text-sm font-medium text-foreground">All clear!</p>
                <p className="text-xs text-muted-foreground text-center">No critical issues detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {issues.slice(0, 7).map(({ label, severity }) => (
                  <div key={label} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${
                    severity === "critical" ? "bg-red-50" : "bg-amber-50"
                  }`}>
                    {severity === "critical"
                      ? <XCircle size={13} className="text-red-500 shrink-0" />
                      : <AlertCircle size={13} className="text-amber-500 shrink-0" />}
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0">{label}</span>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      severity === "critical" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    }`}>
                      {severity === "critical" ? "High" : "Warn"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Server & Environment */}
          <PluginDataPanel site={site} />
        </div>
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab({ site }: { site: Site }) {
  const score = site.latest_scores?.security;
  const sslDays = sslDaysRemaining(site.ssl_expiry_date);
  const sslText =
    sslDays === null
      ? undefined
      : sslDays <= 0
      ? "Expired"
      : `${sslDays}d remaining`;
  const sslColor =
    sslDays === null
      ? undefined
      : sslDays <= 7
      ? "var(--score-bad)"
      : sslDays <= 30
      ? "var(--score-warn)"
      : "var(--score-good)";

  const adminNames = site.admin_usernames ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-3">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Security Score"
              sublabel={score >= 80 ? "Hardened" : score >= 50 ? "Needs work" : "At risk"}
              sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
              size="lg"
            />
          ) : (
            <div className="text-center py-6">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </Card>

        {/* Security signals */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              Security Signals
            </p>
            <SignalRow label="XML-RPC" value={site.xml_rpc_enabled} risky={true} />
            <SignalRow label="File Editor" value={site.file_editor_enabled} risky={true} />
            <SignalRow label="Debug Mode" value={site.wp_debug_enabled} risky={true} />
            <SignalRow label="Default Login URL" value={site.login_url_default} risky={true} />
            <SignalRow label="wp-config.php Writable" value={site.wp_config_writable} risky={true} />
            <SignalRow label=".htaccess Writable" value={site.htaccess_writable} risky={true} />
            <SignalRow label="PHP in Uploads" value={site.uploads_php_enabled} risky={true} />

            {/* SSL row (special) */}
            <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm text-foreground">SSL Certificate</span>
              {site.ssl_expiry_date ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: sslColor }}>
                    {sslText}
                  </span>
                  {sslDays !== null && sslDays > 0 ? (
                    <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                  ) : (
                    <XCircle size={15} style={{ color: "var(--score-bad)" }} />
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unknown</span>
              )}
            </div>
          </Card>

          {/* Admin users */}
          {(site.admin_users_count != null || adminNames.length > 0) && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Admin Users
                </p>
                {site.admin_users_count != null && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      color: site.admin_users_count > 3 ? "var(--score-warn)" : "var(--score-good)",
                      background: site.admin_users_count > 3 ? "var(--score-warn-bg, #fef3c7)" : "var(--score-good-bg)",
                    }}
                  >
                    {site.admin_users_count} admin{site.admin_users_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {adminNames.length > 0 ? (
                <div className="space-y-1.5">
                  {adminNames.map((name) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-foreground">{name}</span>
                      {name.toLowerCase() === "admin" && (
                        <AlertCircle size={12} style={{ color: "var(--score-warn)" }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No usernames available</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab({ site, audits }: { site: Site; audits: Audit[] }) {
  const score = site.latest_scores?.performance;
  const latestAudit = audits.find((a) => a.status === "completed");
  const perf = latestAudit?.performance_data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-3">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Performance Score"
              sublabel={score >= 80 ? "Fast" : score >= 50 ? "Needs work" : "Slow"}
              sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
              size="lg"
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Scanner metrics */}
          {perf && (
            <Card padding="md">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Speed Metrics
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const p = perf as any;
                  const ttfb: number | null = p.ttfb_ms ?? null;
                  const total: number | null = p.total_ms ?? null;
                  const scripts: number | null = p.script_count ?? null;
                  const htmlKb: number | null = p.html_kb ?? null;
                  return [
                    {
                      label: "TTFB",
                      value: ttfb != null ? `${Number(ttfb).toLocaleString()}ms` : "—",
                      color:
                        ttfb == null
                          ? "var(--muted-foreground)"
                          : ttfb > 800
                          ? "var(--score-bad)"
                          : ttfb > 400
                          ? "var(--score-warn)"
                          : "var(--score-good)",
                    },
                    {
                      label: "Load Time",
                      value: total != null ? `${Number(total).toLocaleString()}ms` : "—",
                      color: "var(--foreground)",
                    },
                    {
                      label: "JS Files",
                      value: scripts != null ? String(scripts) : "—",
                      color:
                        scripts == null
                          ? "var(--muted-foreground)"
                          : scripts > 20
                          ? "var(--score-warn)"
                          : "var(--score-good)",
                    },
                    {
                      label: "HTML Size",
                      value: htmlKb != null ? `${Number(htmlKb).toFixed(1)} KB` : "—",
                      color: "var(--foreground)",
                    },
                  ];
                })().map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {label}
                    </p>
                    <p className="text-lg font-bold tabular-nums" style={{ color }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Caching / CDN signals */}
          <Card padding="md">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              Caching & CDN
            </p>
            {[
              { label: "Caching Plugin", value: site.caching_plugin },
              { label: "CDN Plugin", value: site.cdn_plugin },
              { label: "Image Optimisation", value: site.image_optimization_plugin },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <span className="text-sm text-foreground">{label}</span>
                {value ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{value}</span>
                    <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">None</span>
                    <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-foreground">Object Cache</span>
              {site.object_cache_enabled === null || site.object_cache_enabled === undefined ? (
                <span className="text-xs text-muted-foreground">Unknown</span>
              ) : site.object_cache_enabled ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Enabled</span>
                  <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Disabled</span>
                  <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                </div>
              )}
            </div>
          </Card>

          {/* Database Health */}
          {(site.autoloaded_options_kb != null || site.transient_count != null || site.post_revisions_count != null || site.object_cache_enabled != null) && (
            <Card padding="md">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Database Health
              </p>
              {[
                { label: "Autoloaded Options", value: site.autoloaded_options_kb, unit: "KB", warnAt: 800 },
                { label: "Transients",         value: site.transient_count,       unit: "",   warnAt: 100 },
                { label: "Post Revisions",     value: site.post_revisions_count,  unit: "",   warnAt: 500 },
              ].map(({ label, value, unit, warnAt }) => {
                if (value == null) return null;
                const isWarn = value > warnAt;
                return (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-sm text-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: isWarn ? "var(--score-warn)" : "var(--score-good)" }}>
                        {value.toLocaleString()}{unit ? ` ${unit}` : ""}
                      </span>
                      {isWarn
                        ? <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                        : <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-foreground">Object Cache</span>
                {site.object_cache_enabled == null ? (
                  <span className="text-xs text-muted-foreground">Unknown</span>
                ) : site.object_cache_enabled ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Disabled</span>
                    <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Real-user metrics placeholder */}
          <Card padding="md" className="border-dashed">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              Real-user Metrics (LCP, CLS, FID, TTFB)
            </p>
            <p className="text-xs text-muted-foreground">
              Enable the JS snippet on this site to start collecting real-user Core Web Vitals.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── SEO Tab ───────────────────────────────────────────────────────────────────

function SeoTab({ site, audits }: { site: Site; audits: Audit[] }) {
  const score = site.latest_scores?.seo ?? null;
  const latestAudit = audits.find((a) => a.status === "completed");
  const seoData = latestAudit?.seo_data;

  type SeoCheck = { id: string; label: string; status: "pass" | "fail" | "warn"; detail?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checksArray: SeoCheck[] = Array.isArray((seoData as any)?.checks) ? (seoData as any).checks : [];

  const passCount    = checksArray.filter((c) => c.status === "pass").length;
  const failCount    = checksArray.filter((c) => c.status === "fail").length;
  const warnCount    = checksArray.filter((c) => c.status === "warn").length;
  const totalChecks  = checksArray.length || 10;
  const issueCount   = failCount + warnCount;

  const scoreLabel =
    score === null ? "No Data" :
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Work" : "Poor";
  const scoreLabelColor =
    score === null ? "text-muted-foreground" :
    score >= 80 ? "text-green-600" : score >= 60 ? "text-green-500" :
    score >= 40 ? "text-amber-500" : "text-red-500";

  // SEO-specific trend from audit history
  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const trendPts = completed.slice(-8).map((a) => ({
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: a.scores!.seo,
  }));
  const displayTrend = trendPts.length === 1
    ? [{ date: "—", score: trendPts[0].score }, trendPts[0]]
    : trendPts;
  const scoreDelta =
    trendPts.length >= 2
      ? trendPts[trendPts.length - 1].score - trendPts[0].score
      : null;

  return (
    <div className="space-y-5">
      {/* ── Top 3 stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score gauge */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-center gap-5">
          <ScoreGauge score={score ?? 0} label="" size="md" />
          <div>
            <p className="text-xs text-muted-foreground">SEO Score</p>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">
              {score ?? "—"}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
            <span className={`text-sm font-semibold ${scoreLabelColor}`}>{scoreLabel}</span>
          </div>
        </div>

        {/* Issue counts */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground mb-3">Issues Breakdown</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center bg-red-50 rounded-xl py-3">
              <span className="text-2xl font-bold text-red-500 tabular-nums">{failCount}</span>
              <span className="text-[10px] text-red-400 font-medium mt-0.5">Critical</span>
            </div>
            <div className="flex flex-col items-center bg-amber-50 rounded-xl py-3">
              <span className="text-2xl font-bold text-amber-500 tabular-nums">{warnCount}</span>
              <span className="text-[10px] text-amber-400 font-medium mt-0.5">Warning</span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 rounded-xl py-3">
              <span className="text-2xl font-bold text-blue-500 tabular-nums">0</span>
              <span className="text-[10px] text-blue-400 font-medium mt-0.5">Info</span>
            </div>
          </div>
        </div>

        {/* Checklist summary */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">SEO Checklist</p>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {passCount}
            <span className="text-sm font-normal text-muted-foreground"> / {totalChecks} passed</span>
          </p>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${totalChecks > 0 ? (passCount / totalChecks) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {issueCount > 0 ? `${issueCount} items need attention` : "All checks passed"}
          </p>
        </div>
      </div>

      {/* ── Middle: trend + checklist ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SEO Score Trend */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-semibold text-foreground">SEO Score Trend</h3>
            {scoreDelta !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                scoreDelta >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}>
                {scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
          {displayTrend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              Run audits to build trend data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={displayTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="seoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [`${v}`, "SEO Score"]}
                />
                <Area type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={2} fill="url(#seoGrad)"
                  dot={{ r: 3, fill: "#ec4899", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SEO Checklist */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">SEO Checklist</h3>
          {checksArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-xs text-muted-foreground text-center">
                Run an audit to see SEO checklist
              </p>
            </div>
          ) : (
            <div>
              {checksArray.map(({ id, label, status, detail }) => (
                <div key={id} className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {status === "pass"
                      ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--score-good)" }} />
                      : status === "warn"
                      ? <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--score-warn)" }} />
                      : <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--score-bad)" }} />}
                    <div className="min-w-0">
                      <span className="text-sm text-foreground">{label}</span>
                      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    status === "pass" ? "bg-green-50 text-green-600" :
                    status === "warn" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                  }`}>
                    {status === "pass" ? "Pass" : status === "warn" ? "Warn" : "Fail"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SEO Issues table ── */}
      {checksArray.filter((c) => c.status !== "pass").length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">SEO Issues</h3>
            <span className="text-xs text-muted-foreground">
              {checksArray.filter((c) => c.status !== "pass").length} open issues
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Issue", "Severity", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4 last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checksArray
                  .filter((c) => c.status !== "pass")
                  .map(({ id, label, status, detail }) => (
                    <tr key={id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{label}</p>
                        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          status === "fail" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {status === "fail" ? "Critical" : "Warning"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-semibold text-amber-500">Open</span>
                      </td>
                      <td className="py-3">
                        <button className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-gray-50 transition-colors">
                          <Wrench size={10} /> Fix
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Uptime Tab ────────────────────────────────────────────────────────────────

function UptimeTab({ site }: { site: Site }) {
  const uptime  = site.uptime_percentage ?? 0;
  const isUp    = site.uptime_status === "up";
  const isDown  = site.uptime_status === "down";
  const label   = isUp ? "Excellent" : isDown ? "Down" : "Unknown";
  const labelCl = isUp ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500";

  return (
    <div className="space-y-5">
      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Big uptime number */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <p className="text-xs text-muted-foreground mb-2">30-Day Uptime</p>
          <p className="text-4xl font-bold text-foreground tabular-nums">
            {uptime.toFixed(1)}
            <span className="text-xl font-semibold text-muted-foreground">%</span>
          </p>
          <span className={`text-sm font-semibold ${labelCl} mt-1 block`}>
            ● {label}
          </span>
        </div>

        {/* Donut ring */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-3">
          <PieChart width={100} height={100}>
            <Pie
              data={[{ value: uptime }, { value: 100 - uptime }]}
              cx={45} cy={45}
              innerRadius={32} outerRadius={46}
              startAngle={90} endAngle={-270}
              dataKey="value" strokeWidth={0}
            >
              <Cell fill={isUp ? "#10b981" : isDown ? "#ef4444" : "#9ca3af"} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Up: {uptime.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Down: {(100 - uptime).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Stats list */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-3">
          {[
            { icon: <Activity size={13} className="text-teal-500" />, label: "Avg Response Time", value: "—" },
            { icon: <AlertCircle size={13} className="text-amber-500" />, label: "Incidents (30d)", value: "—" },
            { icon: <XCircle size={13} className="text-red-400" />, label: "Total Downtime", value: "—" },
            { icon: <CheckCircle2 size={13} className="text-green-500" />, label: "Last Check", value: site.last_audit_at ? timeAgo(site.last_audit_at) : "—" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={`rounded-2xl border p-5 ${
        isUp ? "bg-green-50 border-green-200" :
        isDown ? "bg-red-50 border-red-200" : "bg-gray-50 border-border"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isUp ? "bg-green-100" : isDown ? "bg-red-100" : "bg-gray-200"
          }`}>
            <Activity size={18} className={isUp ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500"} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isUp ? "text-green-700" : isDown ? "text-red-700" : "text-gray-600"}`}>
              {isUp ? "Site is currently online" : isDown ? "Site is currently down" : "Status unknown"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isUp
                ? "All systems operational. Uptime monitoring is active."
                : isDown
                ? "The site is not responding. Check your server or DNS settings."
                : "Connect the plugin and run an audit to enable uptime monitoring."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Incident log placeholder ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Incident Log</h3>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-sm font-medium text-foreground">No incidents recorded</p>
          <p className="text-xs text-muted-foreground">Uptime history will appear here once monitoring data is collected.</p>
        </div>
      </div>
    </div>
  );
}

// ── Malware Tab ───────────────────────────────────────────────────────────────

function MalwareTab({
  site,
  scans,
  onRunScan,
  scanning,
  canRunScan,
  scanError,
}: {
  site: Site;
  scans: ScanResult[];
  onRunScan: () => void;
  scanning: boolean;
  canRunScan: boolean;
  scanError?: string | null;
}) {
  const score = site.latest_scores?.malware;
  const [expandedScan, setExpandedScan] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-4">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Malware Score"
              sublabel={score >= 80 ? "No threats" : "Threats found"}
              sublabelVariant={score >= 80 ? "good" : "bad"}
              size="lg"
              isMalware
            />
          ) : (
            <div className="text-center py-6">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No scan yet</p>
            </div>
          )}
          {canRunScan && (
            <div className="w-full space-y-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={onRunScan}
                loading={scanning}
                className="w-full"
              >
                <RefreshCw size={13} />
                {scanning ? "Scanning…" : "Run Scan"}
              </Button>
              {scanError && (
                <p className="text-xs text-center" style={{ color: "var(--score-bad)" }}>{scanError}</p>
              )}
            </div>
          )}
        </Card>

        {/* Scan history */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
            </CardHeader>
            {scans.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No scans yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run your first scan to detect malware.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {scans.map((scan) => {
                  const threatHits = scan.threats && scan.threats.length > 0 ? scan.threats : null;
                  const canExpand = !scan.is_clean;
                  const isExpanded = expandedScan === scan.id;
                  return (
                    <div key={scan.id}>
                      <div
                        className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 -mx-5 px-5 transition-colors"
                        onClick={() =>
                          setExpandedScan(isExpanded ? null : scan.id)
                        }
                      >
                        <div className="flex items-center gap-3">
                          {scan.is_clean ? (
                            <CheckCircle2 size={16} style={{ color: "var(--score-good)" }} />
                          ) : (
                            <XCircle size={16} style={{ color: "var(--score-bad)" }} />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {scan.is_clean ? "Clean" : "Threats Detected"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(scan.created_at).toLocaleString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!scan.is_clean && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                color: "var(--score-bad)",
                                background: "var(--score-bad-bg)",
                              }}
                            >
                              {threatHits
                                ? `${threatHits.length} threat${threatHits.length !== 1 ? "s" : ""}`
                                : "Threats detected"}
                            </span>
                          )}
                          {canExpand && (
                            isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          )}
                        </div>
                      </div>
                      {isExpanded && canExpand && (
                        <div className="mx-0 mb-2 bg-red-50 rounded-xl overflow-hidden">
                          {threatHits && threatHits.length > 0 ? (
                            <>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-red-100">
                                    <th className="px-4 py-2 text-left font-semibold text-red-700">URL / Domain</th>
                                    <th className="px-4 py-2 text-left font-semibold text-red-700">Threat Type</th>
                                    <th className="px-4 py-2 text-left font-semibold text-red-700">Source Feed</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {threatHits.map((threat, i) => (
                                    <tr key={i} className="border-b border-red-100 last:border-0">
                                      <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                                        {threat.url || threat.file_path || threat.description || "—"}
                                      </td>
                                      <td className="px-4 py-2 text-foreground">
                                        {threat.threat_type || threat.type || "Unknown"}
                                      </td>
                                      <td className="px-4 py-2 text-muted-foreground">
                                        {threat.source || threat.severity || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {scan.sources_used && scan.sources_used.length > 0 && (
                                <div className="px-4 py-2 border-t border-red-100">
                                  <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider">Sources used: </span>
                                  <span className="text-[10px] text-red-600">{scan.sources_used.join(", ")}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="px-4 py-3">
                              <p className="text-xs text-red-700">No specific threat details available — URL matched threat intelligence feed</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Plugins Tab ───────────────────────────────────────────────────────────────

function PluginsTab({ site }: { site: Site }) {
  const plugins = site.plugin_data?.plugins ?? [];
  const needsUpdates = site.plugins_needing_updates ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">Active Plugins</h2>
        {needsUpdates > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: "var(--score-warn)",
              background: "var(--score-warn-bg, #fef3c7)",
            }}
          >
            {needsUpdates} update{needsUpdates !== 1 ? "s" : ""} available
          </span>
        )}
      </div>

      {plugins.length === 0 ? (
        <Card className="py-12 text-center">
          <Package size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {site.plugin_connected
              ? "Plugin data will appear after the next cron push."
              : "Connect the WordPress plugin to see active plugins."}
          </p>
        </Card>
      ) : (
        <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {["Plugin", "Version", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plugins.map((plugin) => (
                  <tr key={plugin.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {plugin.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground font-mono">
                        {plugin.version || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {plugin.update_available ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: "var(--score-warn)",
                            background: "var(--score-warn-bg, #fef3c7)",
                          }}
                        >
                          Update available{plugin.new_version ? ` → v${plugin.new_version}` : ""}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            color: "var(--score-good)",
                            background: "var(--score-good-bg)",
                          }}
                        >
                          Up to date
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Abandoned plugins */}
      {site.plugins_outdated_12m && site.plugins_outdated_12m.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">Abandoned Plugins</h3>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: "var(--score-warn)", background: "var(--score-warn-bg, #fef3c7)" }}
            >
              {site.plugins_outdated_12m.length} plugin{site.plugins_outdated_12m.length !== 1 ? "s" : ""} not updated in 12+ months
            </span>
          </div>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {["Plugin", "Version", "Last Updated"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {site.plugins_outdated_12m.map((p) => (
                  <tr key={p.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.version || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.last_updated || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WooCommerce Tab ───────────────────────────────────────────────────────────

function WooCommerceTab({ site }: { site: Site }) {
  const stats = [
    {
      label: "Total Orders",
      value: site.woo_order_count != null ? String(site.woo_order_count) : "—",
    },
    {
      label: "Total Revenue",
      value:
        site.woo_revenue != null
          ? `$${Number(site.woo_revenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <Card key={label} padding="md">
            <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Card padding="md" className="border-dashed">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart size={14} className="text-muted-foreground" />
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Extended WooCommerce Data
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Orders 7d/30d, revenue trends, failed orders, and payment gateway health
          will be available in Phase 3B when the plugin sends extended WooCommerce metrics.
        </p>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { site, loading, error, refetch } = useSite(id);
  const { roleCanDo } = useRole();
  const canRunAudit = roleCanDo("run_audit");
  const canDeleteSite = roleCanDo("delete_site");
  const [pendingAuditId, setPendingAuditId] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (scanPollRef.current) clearInterval(scanPollRef.current);
    };
  }, []);

  function copyToken(token: string) {
    navigator.clipboard.writeText(token).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }

  const rawTab = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(rawTab ?? "overview");

  const { done: auditDone } = useAuditStatus(pendingAuditId);
  if (auditDone && pendingAuditId) {
    setPendingAuditId(null);
    refetch();
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    router.push(`/sites/${id}?tab=${tab}`, { scroll: false });
  }

  async function runAudit() {
    setAuditLoading(true);
    try {
      const { data } = await api.post<{ audit_id: string }>(`/audits/${id}/run`);
      setPendingAuditId(data.audit_id);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }

  async function runScan() {
    setScanLoading(true);
    setScanError(null);
    try {
      await api.post(`/scanner/scan/${id}`);
      scanPollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get<{ status: string }>(`/scanner/${id}/status`);
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(scanPollRef.current!);
            scanPollRef.current = null;
            setScanLoading(false);
            if (data.status === "failed") {
              setScanError("Scan failed. Please try again.");
            } else {
              refetch();
            }
          }
        } catch {
          clearInterval(scanPollRef.current!);
          scanPollRef.current = null;
          setScanLoading(false);
          setScanError("Failed to check scan status.");
        }
      }, 3000);
    } catch (err: unknown) {
      setScanLoading(false);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setScanError(msg || "Failed to start scan.");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteLoading(true);
    try {
      await api.delete(`/sites/${id}`);
      router.replace("/sites");
    } catch {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  }

  if (loading) return <LoadingPage />;
  if (error || !site) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error || "Site not found."}</p>
      </div>
    );
  }

  const tabs = BASE_TABS;

  const overallScore = site.latest_scores
    ? Math.round(
        (site.latest_scores.performance + site.latest_scores.seo +
          site.latest_scores.security + site.latest_scores.malware) / 4
      )
    : null;

  return (
    <div className="-m-6 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)]">

        {/* Main row */}
        <div className="px-6 py-4 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => router.push("/sites")}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm"
            style={{ background: siteAvatarColor(site.id) }}
          >
            {site.name[0]?.toUpperCase()}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{site.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                site.uptime_status === "up"   ? "bg-green-50 text-green-700 border-green-200" :
                site.uptime_status === "down" ? "bg-red-50 text-red-700 border-red-200"       :
                                                "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  site.uptime_status === "up"   ? "bg-green-500" :
                  site.uptime_status === "down" ? "bg-red-500"   : "bg-gray-400"
                }`} />
                {site.uptime_status === "up" ? "Online" : site.uptime_status === "down" ? "Down" : "Unknown"}
              </span>
              {overallScore !== null && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border shrink-0"
                  style={{ background: scoreHex(overallScore) + "14", borderColor: scoreHex(overallScore) + "40", color: scoreHex(overallScore) }}>
                  Health {overallScore}/100
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-muted-foreground">
              <a
                href={site.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent transition-colors"
              >
                {site.url.replace(/^https?:\/\//, "")}
                <ExternalLink size={10} />
              </a>
              {site.last_audit_at && <span>· Last audit {timeAgo(site.last_audit_at)}</span>}
              {site.plugin_data?.wp_version && <span>· WP {site.plugin_data.wp_version}</span>}
              {site.plugin_data?.php_version && <span>· PHP {site.plugin_data.php_version}</span>}
            </div>
          </div>

          {/* Score mini-pills — desktop */}
          {site.latest_scores && (
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              {(
                [
                  { label: "Perf", score: site.latest_scores.performance, color: "#10b981" },
                  { label: "SEO",  score: site.latest_scores.seo,         color: "#ec4899" },
                  { label: "Sec",  score: site.latest_scores.security,    color: "#06b6d4" },
                  { label: "Mal",  score: site.latest_scores.malware,     color: "#8b5cf6" },
                ] as const
              ).map(({ label, score, color }) => (
                <div key={label} className="flex flex-col items-center px-2.5 py-1.5 rounded-xl border border-border bg-gray-50 min-w-[44px]">
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {canDeleteSite && deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            {canDeleteSite && (
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  deleteConfirm ? "border-red-300 text-red-600 hover:bg-red-50" : "border-border text-foreground hover:bg-gray-50"
                }`}
              >
                <Trash2 size={13} />
                {deleteLoading ? "Deleting…" : deleteConfirm ? "Confirm?" : "Delete"}
              </button>
            )}
            {canRunAudit && (
              <button
                onClick={runAudit}
                disabled={auditLoading || !!pendingAuditId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--accent)" }}
              >
                <RefreshCw size={13} className={auditLoading || pendingAuditId ? "animate-spin" : ""} />
                {pendingAuditId ? "Running…" : "Run Audit"}
              </button>
            )}
          </div>
        </div>

        {/* Token / plugin strip */}
        <div className="px-6 pb-3 flex items-center gap-4 flex-wrap border-t border-gray-100 bg-gray-50/60 pt-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Key size={10} />
            <span className="font-mono select-all">
              {tokenVisible ? site.site_token : `${site.site_token.slice(0, 8)}••••••••`}
            </span>
            <button onClick={() => setTokenVisible((v) => !v)} className="p-0.5 hover:text-foreground transition-colors">
              {tokenVisible ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button onClick={() => copyToken(site.site_token)} className="p-0.5 hover:text-foreground transition-colors">
              {tokenCopied ? <CheckCircle2 size={11} style={{ color: "var(--score-good)" }} /> : <Copy size={11} />}
            </button>
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${site.plugin_connected ? "text-green-600" : "text-muted-foreground"}`}>
            <Package size={10} />
            {site.plugin_connected ? "Plugin connected" : "Plugin not connected"}
          </span>
          {site.uptime_percentage !== undefined && site.uptime_percentage !== null && (
            <span className="text-xs text-muted-foreground">
              Uptime: <span className="font-semibold text-foreground">{site.uptime_percentage.toFixed(1)}%</span>
            </span>
          )}
          {site.scan_schedule && (
            <span className="text-xs text-muted-foreground">
              Schedule: <span className="font-semibold text-foreground capitalize">{site.scan_schedule}</span>
            </span>
          )}
        </div>

        {/* Audit running banner */}
        {pendingAuditId && (
          <div className="mx-6 mb-3 flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
            <RefreshCw size={13} className="animate-spin text-indigo-600 shrink-0" />
            <p className="text-xs text-indigo-700 font-medium">
              Audit running — results will update automatically
            </p>
          </div>
        )}
      </div>

      {/* ── Tab nav ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-white px-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={[
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              ].join(" ")}
            >
              {label}
              {key === "woocommerce" && <ShoppingCart size={11} className="inline ml-1 opacity-60" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 bg-[#f8fafc]">
        {activeTab === "overview" && (
          <OverviewTab
            site={site}
            audits={site.audits}
            runAudit={runAudit}
            auditLoading={auditLoading}
            canRunAudit={canRunAudit}
          />
        )}
        {activeTab === "seo"         && <SeoTab site={site} audits={site.audits} />}
        {activeTab === "security"    && <SecurityTab site={site} />}
        {activeTab === "performance" && <PerformanceTab site={site} audits={site.audits} />}
        {activeTab === "malware"     && (
          <MalwareTab
            site={site}
            scans={site.scans}
            onRunScan={runScan}
            scanning={scanLoading}
            canRunScan={canRunAudit}
            scanError={scanError}
          />
        )}
        {activeTab === "uptime"      && <UptimeTab site={site} />}
        {activeTab === "plugins"     && <PluginsTab site={site} />}
        {activeTab === "woocommerce" && <WooCommerceTab site={site} />}
      </div>
    </div>
  );
}
