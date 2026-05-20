"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, RefreshCw, ExternalLink, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Shield, Package, ShoppingCart, Wifi, Key, Copy, Eye, EyeOff,
  Activity, Wrench, TrendingUp, Clock, Zap, Server, Database, LayoutGrid,
  Bell, DollarSign, BarChart2, CalendarClock, HeartPulse, Search,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { useSite } from "@/hooks/useSite";
import { useAuditStatus } from "@/hooks/useAuditStatus";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { AuditHistoryTable } from "@/components/dashboard/AuditHistoryTable";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { timeAgo, scoreHex } from "@/lib/utils";
import type { Site, Audit, ScanResult, AlertSettings, Plugin as SitePlugin, CronEvent, SiteHealth } from "@/types";

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
  | "woocommerce"
  | "cron"
  | "health";

const BASE_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview",    label: "Overview",    icon: <LayoutGrid size={13} /> },
  { key: "seo",         label: "SEO",         icon: <TrendingUp size={13} /> },
  { key: "security",    label: "Security",    icon: <Shield size={13} /> },
  { key: "performance", label: "Performance", icon: <Zap size={13} /> },
  { key: "malware",     label: "Malware",     icon: <Activity size={13} /> },
  { key: "uptime",      label: "Uptime",      icon: <Wifi size={13} /> },
  { key: "plugins",     label: "Plugins",     icon: <Package size={13} /> },
  { key: "woocommerce", label: "WooCommerce", icon: <ShoppingCart size={13} /> },
  { key: "cron",        label: "Cron Events", icon: <CalendarClock size={13} /> },
  { key: "health",      label: "Site Health", icon: <HeartPulse size={13} /> },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
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
  brandColor,
}: {
  site: Site;
  audits: Audit[];
  runAudit: () => void;
  auditLoading: boolean;
  canRunAudit: boolean;
  brandColor: string;
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
            <h3 className="text-sm font-semibold text-foreground mb-1">Health Score Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Per-pillar breakdown · select range and pillars below</p>
            <TrendChart siteId={site.id} />
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

function SecurityTab({ site, audits, brandColor }: { site: Site; audits: Audit[]; brandColor: string }) {
  const score = site.latest_scores?.security;
  const sslDays = sslDaysRemaining(site.ssl_expiry_date);
  const sslColor = sslDays === null ? "#9ca3af" : sslDays <= 7 ? "#dc2626" : sslDays <= 30 ? "#d97706" : "#16a34a";
  const sslLabel = sslDays === null ? "Unknown" : sslDays <= 0 ? "Expired" : sslDays <= 30 ? "Expiring soon" : "Valid";
  const adminNames = site.admin_usernames ?? [];
  const hasDefaultAdmin = adminNames.some((n) => n.toLowerCase() === "admin");

  // Security trend
  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const trendPts = completed.slice(-10).map((a) => ({
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: a.scores!.security,
  }));
  const displayTrend = trendPts.length === 1
    ? [{ date: "—", score: trendPts[0].score }, trendPts[0]]
    : trendPts;

  // Checks table data
  const checks: { label: string; category: string; safe: boolean | null; detail: string }[] = [
    { label: "XML-RPC",              category: "Access",   safe: site.xml_rpc_enabled    === undefined ? null : !site.xml_rpc_enabled,    detail: site.xml_rpc_enabled    ? "Enabled — exposes attack surface" : "Disabled" },
    { label: "Default Login URL",    category: "Access",   safe: site.login_url_default  === undefined ? null : !site.login_url_default,  detail: site.login_url_default  ? "Using /wp-login.php — change it" : "Custom URL in use" },
    { label: "Admin Username",       category: "Accounts", safe: hasDefaultAdmin ? false : adminNames.length > 0 ? true : null,            detail: hasDefaultAdmin ? '"admin" username found — rename it' : adminNames.length > 0 ? "No default usernames" : "Unknown" },
    { label: "File Editor",          category: "Files",    safe: site.file_editor_enabled === undefined ? null : !site.file_editor_enabled, detail: site.file_editor_enabled ? "Enabled in admin panel" : "Disabled" },
    { label: "Debug Mode",           category: "Files",    safe: site.wp_debug_enabled    === undefined ? null : !site.wp_debug_enabled,    detail: site.wp_debug_enabled    ? "WP_DEBUG on — disable in production" : "Off" },
    { label: "wp-config.php",        category: "Files",    safe: site.wp_config_writable  === undefined ? null : !site.wp_config_writable,  detail: site.wp_config_writable  ? "Writable — fix file permissions" : "Protected" },
    { label: ".htaccess",            category: "Files",    safe: site.htaccess_writable   === undefined ? null : !site.htaccess_writable,   detail: site.htaccess_writable   ? "Writable — fix file permissions" : "Protected" },
    { label: "PHP in Uploads",       category: "Files",    safe: site.uploads_php_enabled === undefined ? null : !site.uploads_php_enabled, detail: site.uploads_php_enabled ? "PHP execution allowed in /uploads" : "Blocked" },
    { label: "SSL Certificate",      category: "SSL",      safe: sslDays === null ? null : sslDays > 30,                                   detail: sslDays === null ? "Unknown" : sslDays <= 0 ? "Expired" : `${sslDays} days remaining` },
  ];

  const knownChecks = checks.filter((c) => c.safe !== null);
  const safeCount = knownChecks.filter((c) => c.safe === true).length;
  const issueCount = knownChecks.filter((c) => c.safe === false).length;

  return (
    <div className="space-y-5">

      {/* ── Top 4 info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-2 min-h-[190px]">
          {score !== undefined ? (
            <>
              <ScoreGauge
                score={score}
                label="Security"
                sublabel={score >= 80 ? "Excellent" : score >= 50 ? "Needs work" : "At risk"}
                sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
                size="md"
                color={brandColor}
              />
              <p className="text-xs text-muted-foreground text-center mt-3">
                {issueCount > 0 ? `${issueCount} issue${issueCount !== 1 ? "s" : ""} found` : "No threats detected"}
              </p>
            </>
          ) : (
            <div className="text-center">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </div>

        {/* SSL Certificate */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Shield size={15} className="text-teal-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">SSL Certificate</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Domain</span>
              <span className="text-xs font-semibold text-foreground truncate ml-2">{site.url.replace(/^https?:\/\//, "")}</span>
            </div>
            {site.ssl_expiry_date && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Expires</span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(site.ssl_expiry_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
            {sslDays !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Days Left</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: sslColor }}>
                  {sslDays <= 0 ? "Expired" : `${sslDays} days`}
                </span>
              </div>
            )}
            <div className="pt-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                sslLabel === "Valid"          ? "bg-green-50 text-green-700" :
                sslLabel === "Expiring soon" ? "bg-amber-50 text-amber-700" :
                sslLabel === "Expired"       ? "bg-red-50 text-red-700"     : "bg-gray-100 text-gray-500"
              }`}>
                {sslLabel === "Valid" ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                {sslLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Login Security */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Key size={15} className="text-indigo-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Login Security</p>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "XML-RPC disabled",       safe: site.xml_rpc_enabled   === undefined ? null : !site.xml_rpc_enabled },
              { label: "Custom login URL",        safe: site.login_url_default === undefined ? null : !site.login_url_default },
              { label: "No default admin user",   safe: adminNames.length > 0 ? !hasDefaultAdmin : null },
              { label: "wp-config protected",     safe: site.wp_config_writable === undefined ? null : !site.wp_config_writable },
            ].map(({ label, safe }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground">{label}</span>
                {safe === true  ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> :
                 safe === false ? <XCircle      size={14} className="text-red-500 shrink-0"   /> :
                                  <span className="text-xs text-muted-foreground shrink-0">—</span>}
              </div>
            ))}
          </div>
        </div>

        {/* File Security */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Shield size={15} className="text-purple-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">File Security</p>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "File editor disabled",  safe: site.file_editor_enabled  === undefined ? null : !site.file_editor_enabled },
              { label: "Debug mode off",         safe: site.wp_debug_enabled     === undefined ? null : !site.wp_debug_enabled },
              { label: ".htaccess protected",    safe: site.htaccess_writable    === undefined ? null : !site.htaccess_writable },
              { label: "PHP in uploads blocked", safe: site.uploads_php_enabled  === undefined ? null : !site.uploads_php_enabled },
            ].map(({ label, safe }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground">{label}</span>
                {safe === true  ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> :
                 safe === false ? <XCircle      size={14} className="text-red-500 shrink-0"   /> :
                                  <span className="text-xs text-muted-foreground shrink-0">—</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Middle: Trend + Admin accounts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Security score trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Security Score Trend</h3>
            {trendPts.length >= 2 && (() => {
              const delta = trendPts[trendPts.length - 1].score - trendPts[0].score;
              return (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {delta >= 0 ? "+" : ""}{delta} pts
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-muted-foreground mb-4">Historical security score over time</p>
          {displayTrend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              Run audits to build trend data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={displayTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={brandColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [`${v}`, "Security Score"]}
                />
                <Area type="monotone" dataKey="score" stroke={brandColor} strokeWidth={2}
                  fill="url(#secGrad)" dot={{ r: 3, fill: brandColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Admin accounts */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Admin Accounts</h3>
            {site.admin_users_count != null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                site.admin_users_count > 3 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
              }`}>
                {site.admin_users_count} admin{site.admin_users_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {adminNames.length > 0 ? (
            <div className="space-y-2">
              {adminNames.map((name) => {
                const risky = name.toLowerCase() === "admin";
                return (
                  <div key={name} className={`flex items-center gap-3 p-2.5 rounded-xl ${risky ? "bg-red-50" : "bg-gray-50"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${risky ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}>
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{name}</span>
                    {risky
                      ? <AlertCircle size={14} className="text-red-500 shrink-0" />
                      : <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <p className="text-sm text-muted-foreground">No admin data available</p>
              <p className="text-xs text-muted-foreground">Connect the plugin to view accounts</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Security checks table ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Security Checks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{safeCount} of {knownChecks.length} checks passed</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${knownChecks.length > 0 ? (safeCount / knownChecks.length) * 100 : 0}%` }} />
            </div>
            <span className="text-xs font-bold text-foreground">
              {knownChecks.length > 0 ? Math.round((safeCount / knownChecks.length) * 100) : 0}%
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                {["Check", "Category", "Status", "Details"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 first:rounded-tl-2xl">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.map(({ label, category, safe, detail }) => (
                <tr key={label} className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-foreground">{label}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground font-medium">{category}</span>
                  </td>
                  <td className="px-5 py-3">
                    {safe === true  ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        <CheckCircle2 size={10} /> Safe
                      </span>
                    ) : safe === false ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                        <XCircle size={10} /> Risk
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unknown</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab({ site, audits, brandColor }: { site: Site; audits: Audit[]; brandColor: string }) {
  const score = site.latest_scores?.performance;
  const latestAudit = audits.find((a) => a.status === "completed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perf = latestAudit?.performance_data as any;

  const ttfb:    number | null = perf?.ttfb_ms      ?? null;
  const total:   number | null = perf?.total_ms     ?? null;
  const scripts: number | null = perf?.script_count ?? null;
  const htmlKb:  number | null = perf?.html_kb      ?? null;

  // Trend
  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const trendPts = completed.slice(-10).map((a) => ({
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: a.scores!.performance,
  }));
  const displayTrend = trendPts.length === 1
    ? [{ date: "—", score: trendPts[0].score }, trendPts[0]]
    : trendPts;
  const avgScore = trendPts.length > 0
    ? Math.round(trendPts.reduce((s, p) => s + p.score, 0) / trendPts.length)
    : null;

  // Recommendations derived from site data
  type Rec = { title: string; detail: string; severity: "high" | "medium" | "low" };
  const recs: Rec[] = [];
  if (ttfb && ttfb > 800)              recs.push({ title: "Optimise server response time",  detail: `TTFB ${ttfb}ms — target <400ms`,             severity: "high" });
  if (!site.caching_plugin)            recs.push({ title: "Install a caching plugin",        detail: "No caching plugin detected",                  severity: "high" });
  if (!site.cdn_plugin)                recs.push({ title: "Use a CDN for asset delivery",    detail: "No CDN plugin active",                        severity: "medium" });
  if (!site.image_optimization_plugin) recs.push({ title: "Add image optimisation",          detail: "No image optimiser detected",                 severity: "medium" });
  if (scripts && scripts > 20)         recs.push({ title: "Reduce JavaScript files",         detail: `${scripts} scripts found — aim for <20`,      severity: "medium" });
  if (!site.object_cache_enabled)      recs.push({ title: "Enable object caching",           detail: "Object cache is disabled",                    severity: "medium" });
  if ((site.autoloaded_options_kb ?? 0) > 800) recs.push({ title: "Reduce autoloaded options", detail: `${site.autoloaded_options_kb}KB — target <800KB`, severity: "high" });
  if ((site.transient_count ?? 0) > 100)       recs.push({ title: "Clean up expired transients",  detail: `${site.transient_count} transients stored`,  severity: "low" });
  if ((site.post_revisions_count ?? 0) > 500)  recs.push({ title: "Limit post revisions",        detail: `${site.post_revisions_count} revisions stored`, severity: "low" });

  // Metric card helpers
  function mStatus(val: number | null, good: number, warn: number): "good" | "needs-work" | "poor" | null {
    if (val === null) return null;
    return val <= good ? "good" : val <= warn ? "needs-work" : "poor";
  }
  function mColor(st: ReturnType<typeof mStatus>): string {
    return st === "good" ? brandColor : st === "needs-work" ? "#f59e0b" : st === "poor" ? "#ef4444" : "#e5e7eb";
  }
  function mPct(val: number | null, max: number): number {
    if (val === null) return 0;
    return Math.max(5, Math.min(98, (1 - val / max) * 100));
  }

  const ttfbSt  = mStatus(ttfb,    400,  800);
  const totalSt = mStatus(total,  1500, 3000);
  const jsSt    = mStatus(scripts,  10,   20);
  const htmlSt  = mStatus(htmlKb,   50,  100);

  const metricCards = [
    { title: "Time to First Byte", abbr: "TTFB",     value: ttfb    !== null ? `${ttfb.toLocaleString()}ms`  : "—", st: ttfbSt,  pct: mPct(ttfb,  1200) },
    { title: "Page Load Time",     abbr: "Load",      value: total   !== null ? `${total.toLocaleString()}ms` : "—", st: totalSt, pct: mPct(total, 4000) },
    { title: "JavaScript Files",   abbr: "JS Files",  value: scripts !== null ? String(scripts)               : "—", st: jsSt,    pct: mPct(scripts, 30) },
    { title: "HTML Size",          abbr: "HTML",      value: htmlKb  !== null ? `${htmlKb.toFixed(1)}KB`      : "—", st: htmlSt,  pct: mPct(htmlKb, 150) },
  ];

  return (
    <div className="space-y-5">

      {/* ── Row 1: Score card + 4 metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Performance score — taller accent card */}
        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-2 min-h-[200px]">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Performance"
              sublabel={score >= 80 ? "Fast" : score >= 50 ? "Needs Work" : "Slow"}
              sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
              size="md"
              color={brandColor}
            />
          ) : (
            <div className="text-center">
              <Activity size={28} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </div>

        {/* Metric cards with donut rings */}
        {metricCards.map(({ title, abbr, value, st, pct }) => {
          const color = mColor(st);
          const statusLabel = st === "good" ? "Good" : st === "needs-work" ? "Needs Work" : st === "poor" ? "Poor" : null;
          const statusCls   = st === "good" ? "bg-green-50 text-green-700" : st === "needs-work" ? "bg-amber-50 text-amber-700" : st === "poor" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500";
          return (
            <div key={abbr} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col items-center justify-center gap-2 min-h-[200px]">
              <p className="text-[11px] text-muted-foreground font-medium text-center leading-snug">{title}</p>
              <PieChart width={84} height={84}>
                <Pie
                  data={[{ value: pct }, { value: 100 - pct }]}
                  cx={38} cy={38}
                  innerRadius={28} outerRadius={40}
                  startAngle={90} endAngle={-270}
                  dataKey="value" strokeWidth={0}
                >
                  <Cell fill={color} />
                  <Cell fill="#f3f4f6" />
                </Pie>
              </PieChart>
              <p className="text-lg font-bold text-foreground tabular-nums leading-tight">{value}</p>
              {statusLabel
                ? <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span>
                : <span className="text-[11px] text-muted-foreground">No data</span>}
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Trend chart + Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Performance Score Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
            </div>
            {avgScore !== null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                Avg {avgScore}
              </span>
            )}
          </div>
          {displayTrend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              Run audits to build trend data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={185}>
              <AreaChart data={displayTrend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={brandColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [`${v}`, "Performance Score"]}
                />
                <Area type="monotone" dataKey="score" stroke={brandColor} strokeWidth={2.5}
                  fill="url(#perfGrad)" dot={{ r: 3, fill: brandColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
            {recs.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">{recs.length} items</span>
            )}
          </div>
          {recs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-green-500" />
              </div>
              <p className="text-sm font-medium text-foreground">All good!</p>
              <p className="text-xs text-muted-foreground text-center">No performance issues found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recs.slice(0, 7).map(({ title, detail, severity }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-gray-50/80 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    severity === "high" ? "bg-red-50" : severity === "medium" ? "bg-amber-50" : "bg-blue-50"
                  }`}>
                    <Zap size={12} className={severity === "high" ? "text-red-500" : severity === "medium" ? "text-amber-500" : "text-blue-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{detail}</p>
                    <span className={`inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      severity === "high"   ? "bg-red-50 text-red-600"    :
                      severity === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    }`}>
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Caching & CDN + Database Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Caching & Optimisation */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Caching & Optimisation</h3>
          <div className="space-y-3">
            {[
              { label: "Caching Plugin",      value: site.caching_plugin,            icon: <Zap size={14} /> },
              { label: "CDN Plugin",          value: site.cdn_plugin,                icon: <Activity size={14} /> },
              { label: "Image Optimisation",  value: site.image_optimization_plugin, icon: <TrendingUp size={14} /> },
              { label: "Object Cache",        value: site.object_cache_enabled ? "Enabled" : (site.object_cache_enabled === false ? null : undefined), icon: <Server size={14} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${value ? "bg-green-50 text-green-600" : "bg-gray-100 text-muted-foreground"}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{typeof value === "string" ? value : value ? "Active" : "Not detected"}</p>
                </div>
                {value
                  ? <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                  : value === undefined
                  ? <span className="text-xs text-muted-foreground">—</span>
                  : <AlertCircle  size={15} className="text-amber-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Database Health */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Database Health</h3>
          {[
            { label: "Autoloaded Options", value: site.autoloaded_options_kb,      unit: "KB",  warnAt: 800,  max: 2000 },
            { label: "Transients",         value: site.transient_count,            unit: "",    warnAt: 100,  max: 500  },
            { label: "Post Revisions",     value: site.post_revisions_count,       unit: "",    warnAt: 500,  max: 2000 },
            { label: "Orphaned Post Meta", value: site.orphaned_post_meta_count,   unit: "",    warnAt: 0,    max: 100  },
          ].filter((r) => r.value != null).map(({ label, value, unit, warnAt, max }) => {
            const v = value!;
            const isWarn = v > warnAt;
            const pct = Math.max(4, Math.min(100, (v / max) * 100));
            return (
              <div key={label} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <span className={`text-xs font-bold tabular-nums ${isWarn ? "text-amber-500" : "text-green-600"}`}>
                    {v.toLocaleString()}{unit ? ` ${unit}` : ""}
                    {isWarn && <AlertCircle size={11} className="inline ml-1 text-amber-400" />}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isWarn ? "bg-amber-400" : "bg-green-400"}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {[site.autoloaded_options_kb, site.transient_count, site.post_revisions_count, site.orphaned_post_meta_count].every((v) => v == null) && (
            <p className="text-xs text-muted-foreground text-center py-6">Connect the plugin to view database health</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SEO Tab ───────────────────────────────────────────────────────────────────

function SeoTab({ site, audits, brandColor }: { site: Site; audits: Audit[]; brandColor: string }) {
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
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-1">
          <ScoreGauge
            score={score ?? 0}
            label="SEO"
            sublabel={scoreLabel}
            sublabelVariant={score === null ? "muted" : score >= 60 ? "good" : score >= 40 ? "warn" : "bad"}
            size="md"
            color={brandColor}
          />
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
              className="h-full rounded-full transition-all"
              style={{ width: `${totalChecks > 0 ? (passCount / totalChecks) * 100 : 0}%`, background: brandColor }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {issueCount > 0 ? `${issueCount} items need attention` : "All checks passed"}
          </p>
        </div>
      </div>

      {/* ── Middle: trend + issues ── */}
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
                    <stop offset="5%"  stopColor={brandColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [`${v}`, "SEO Score"]}
                />
                <Area type="monotone" dataKey="score" stroke={brandColor} strokeWidth={2} fill="url(#seoGrad)"
                  dot={{ r: 3, fill: brandColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SEO Issues */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">SEO Issues</h3>
            {checksArray.filter((c) => c.status !== "pass").length > 0 && (
              <span className="text-xs text-muted-foreground">
                {checksArray.filter((c) => c.status !== "pass").length} open issues
              </span>
            )}
          </div>
          {checksArray.filter((c) => c.status !== "pass").length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 size={24} style={{ color: "var(--score-good)" }} />
              <p className="text-xs text-muted-foreground text-center">
                {checksArray.length === 0 ? "Run an audit to see SEO issues" : "No issues found"}
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* ── SEO Checklist ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">SEO Checklist</h3>
        {checksArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-xs text-muted-foreground text-center">
              Run an audit to see SEO checklist
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
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
  );
}

// ── Uptime Tab ────────────────────────────────────────────────────────────────

function UptimeTab({ site, brandColor }: { site: Site; brandColor: string }) {
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);

  useEffect(() => {
    api.get<AlertSettings>(`/alerts/${site.id}`)
      .then(({ data }) => setAlertSettings(data))
      .catch(() => {});
  }, [site.id]);

  const uptime    = site.uptime_percentage ?? null;
  const hasData   = uptime !== null;
  const uptimeNum = uptime ?? 0;
  const isUp    = site.uptime_status === "up";
  const isDown  = site.uptime_status === "down";
  const ringColor = isUp ? "#10b981" : isDown ? "#ef4444" : "#9ca3af";

  const statusLabel = isUp ? "Excellent" : isDown ? "Down" : "Unknown";
  const statusBg    = isUp ? "bg-green-50 border-green-200"  : isDown ? "bg-red-50 border-red-200"  : "bg-gray-50 border-border";
  const statusIconBg = isUp ? "bg-green-100" : isDown ? "bg-red-100" : "bg-gray-100";
  const statusText  = isUp ? "text-green-700" : isDown ? "text-red-700" : "text-gray-600";

  return (
    <div className="space-y-5">

      {/* ── Row 1: 3 stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 30-Day Uptime */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-3">30-Day Uptime</p>
            {hasData ? (
              <p className="text-5xl font-bold text-foreground tabular-nums leading-none">
                {uptimeNum.toFixed(1)}
                <span className="text-2xl font-semibold text-muted-foreground">%</span>
              </p>
            ) : (
              <p className="text-5xl font-bold text-muted-foreground leading-none">—</p>
            )}
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
              style={{ background: ringColor + "18", color: ringColor }}>
              <span className="w-2 h-2 rounded-full" style={{ background: ringColor }} />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Donut ring with uptime % inside */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <PieChart width={120} height={120}>
              <Pie
                data={hasData
                  ? [{ value: Math.max(0.5, uptimeNum) }, { value: Math.max(0, 100 - uptimeNum) }]
                  : [{ value: 0 }, { value: 100 }]}
                cx={58} cy={58}
                innerRadius={38} outerRadius={54}
                startAngle={90} endAngle={-270}
                dataKey="value" strokeWidth={0}
              >
                <Cell fill={hasData ? ringColor : "#e5e7eb"} />
                <Cell fill="#f3f4f6" />
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-foreground tabular-nums">
                {hasData ? `${uptimeNum.toFixed(1)}%` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">Uptime</span>
            </div>
          </div>
          {hasData ? (
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Up: {uptimeNum.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1.5 font-medium text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Down: {(100 - uptimeNum).toFixed(1)}%
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Collecting monitoring data…</p>
          )}
        </div>

        {/* Stats list */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monitor Stats</p>
          <div className="space-y-0">
            {([
              { icon: <Activity size={14} />, label: "Avg Response Time", value: site.avg_response_ms != null ? `${site.avg_response_ms}ms` : "—", color: "text-teal-500" },
              { icon: <AlertCircle size={14} />, label: "Incidents (30d)", value: "—", color: "text-amber-500" },
              { icon: <Clock size={14} />, label: "Total Downtime", value: "—", color: "text-red-400" },
              { icon: <CheckCircle2 size={14} />, label: "Last Check", value: site.last_uptime_check_at ? timeAgo(site.last_uptime_check_at) : "—", color: "text-green-500" },
            ] as { icon: React.ReactNode; label: string; value: string; color: string }[]).map(({ icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={color}>{icon}</span>
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={`rounded-2xl border p-4 ${statusBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${statusIconBg}`}>
            <Activity size={16} className={statusText} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${statusText}`}>
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

      {/* ── Response time chart placeholder ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Response Time — Last 30 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Average response time in ms</p>
          </div>
        </div>
        <div className="h-48 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: brandColor + "14" }}>
            <BarChart2 size={20} style={{ color: brandColor }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Response time monitoring coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">Historical latency data will display here once active monitoring is enabled</p>
          </div>
        </div>
      </div>

      {/* ── Incident log + Alert Settings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Incident Log (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Incident Log</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
              0 incidents
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No incidents recorded</p>
              <p className="text-xs text-muted-foreground mt-1">All systems have been operational. Incident history will appear here when monitoring detects downtime.</p>
            </div>
          </div>
        </div>

        {/* Alert Settings (1/3) */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: brandColor + "18" }}>
              <Bell size={15} style={{ color: brandColor }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Alert Settings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Notification preferences</p>
            </div>
          </div>

          <div className="space-y-0 flex-1">
            {([
              { label: "Channel",     value: alertSettings?.channel ?? "—" },
              { label: "Alert Email", value: alertSettings?.alert_email ?? "—" },
              { label: "Perf Alert",  value: alertSettings != null ? `Below ${alertSettings.performance_threshold}` : "—" },
              { label: "SEO Alert",   value: alertSettings != null ? `Below ${alertSettings.seo_threshold}` : "—" },
              { label: "Sec Alert",   value: alertSettings != null ? `Below ${alertSettings.security_threshold}` : "—" },
              { label: "Malware",     value: alertSettings != null ? (alertSettings.malware_alerts ? "Enabled" : "Disabled") : "—" },
            ] as { label: string; value: string }[]).map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold text-foreground capitalize truncate ml-2 max-w-[140px] text-right">{value}</span>
              </div>
            ))}
          </div>

          <a
            href="/settings/alerts"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: brandColor }}
          >
            <Bell size={13} />
            Edit Alert Settings
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Malware Tab ───────────────────────────────────────────────────────────────

function MalwareTab({
  site,
  audits,
  scans,
  onRunScan,
  scanning,
  canRunScan,
  scanError,
  brandColor,
}: {
  site: Site;
  audits: Audit[];
  scans: ScanResult[];
  onRunScan: () => void;
  scanning: boolean;
  canRunScan: boolean;
  scanError?: string | null;
  brandColor: string;
}) {
  const score = site.latest_scores?.malware;
  const [expandedScan, setExpandedScan] = useState<string | null>(null);

  const latestScan = scans[0] ?? null;
  const totalScans = scans.length;
  const cleanScans = scans.filter((s) => s.is_clean).length;
  const threatScans = scans.filter((s) => !s.is_clean).length;
  const totalThreats = scans.reduce((sum, s) => sum + (s.threats?.length ?? 0), 0);

  // Malware score trend from audit history
  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const trendPts = completed.slice(-10).map((a) => ({
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: a.scores!.malware,
  }));
  const displayTrend = trendPts.length === 1
    ? [{ date: "—", score: trendPts[0].score }, trendPts[0]]
    : trendPts;
  const scoreDelta = trendPts.length >= 2
    ? trendPts[trendPts.length - 1].score - trendPts[0].score
    : null;

  // Unique threat types and sources across all scans
  const allThreats = scans.flatMap((s) => s.threats ?? []);
  const threatTypes = [...new Set(allThreats.map((t) => t.threat_type || t.type || "Unknown"))];
  const allSources = [...new Set(scans.flatMap((s) => s.sources_used ?? []))];

  return (
    <div className="space-y-5">

      {/* ── Row 1: 4 info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Malware Score */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-2 min-h-[190px]">
          {score !== undefined ? (
            <>
              <ScoreGauge
                score={score}
                label="Malware"
                sublabel={score >= 80 ? "Clean" : score >= 50 ? "Suspicious" : "Compromised"}
                sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
                size="md"
                isMalware
              />
              <p className="text-xs text-muted-foreground text-center mt-3">
                {totalThreats > 0 ? `${totalThreats} threat${totalThreats !== 1 ? "s" : ""} detected` : "No threats detected"}
              </p>
            </>
          ) : (
            <div className="text-center">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </div>

        {/* Last Scan */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Shield size={15} className="text-purple-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Last Scan</p>
          </div>
          {latestScan ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Date</span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(latestScan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Time</span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(latestScan.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Result</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  latestScan.is_clean ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {latestScan.is_clean ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {latestScan.is_clean ? "Clean" : "Threats Found"}
                </span>
              </div>
              {!latestScan.is_clean && (latestScan.threats?.length ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Threats</span>
                  <span className="text-xs font-bold text-red-600">{latestScan.threats!.length} detected</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <p className="text-xs text-muted-foreground text-center">No scans run yet</p>
            </div>
          )}
        </div>

        {/* Scan Summary */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Activity size={15} className="text-indigo-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Scan Summary</p>
          </div>
          <div className="space-y-2.5">
            {([
              { label: "Total Scans",    value: totalScans,    color: "text-foreground" },
              { label: "Clean",          value: cleanScans,    color: "text-green-600" },
              { label: "With Threats",   value: threatScans,   color: threatScans > 0 ? "text-red-600" : "text-foreground" },
              { label: "Total Threats",  value: totalThreats,  color: totalThreats > 0 ? "text-red-600" : "text-foreground" },
            ] as { label: string; value: number; color: string }[]).map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Run Scan CTA */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <RefreshCw size={15} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Run Scan</p>
              <p className="text-xs text-muted-foreground mt-0.5">Manual scan</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Check against our threat intelligence database for malware, suspicious URLs, and blacklisted domains.
          </p>
          {canRunScan ? (
            <button
              onClick={onRunScan}
              disabled={scanning}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: brandColor }}
            >
              <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
              {scanning ? "Scanning…" : "Run Malware Scan"}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground text-center">Insufficient permissions</p>
          )}
          {scanError && (
            <p className="text-xs text-center text-red-600 -mt-2">{scanError}</p>
          )}
        </div>
      </div>

      {/* ── Row 2: Trend chart + Threat Intelligence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Malware score trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Malware Score Trend</h3>
            {scoreDelta !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                scoreDelta >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}>
                {scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">Historical malware score over time</p>
          {displayTrend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              Run audits to build trend data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={displayTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="malGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={brandColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [`${v}`, "Malware Score"]}
                />
                <Area type="monotone" dataKey="score" stroke={brandColor} strokeWidth={2}
                  fill="url(#malGrad)" dot={{ r: 3, fill: brandColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Threat Intelligence */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Threat Intelligence</h3>

          {/* Overall status */}
          <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${
            totalThreats === 0 && totalScans > 0 ? "bg-green-50" :
            totalThreats > 0 ? "bg-red-50" : "bg-gray-50"
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              totalThreats === 0 && totalScans > 0 ? "bg-green-100" :
              totalThreats > 0 ? "bg-red-100" : "bg-gray-100"
            }`}>
              {totalThreats === 0 && totalScans > 0
                ? <CheckCircle2 size={16} className="text-green-600" />
                : totalThreats > 0
                ? <XCircle size={16} className="text-red-600" />
                : <Shield size={16} className="text-gray-400" />}
            </div>
            <div>
              <p className={`text-xs font-semibold ${
                totalThreats === 0 && totalScans > 0 ? "text-green-700" :
                totalThreats > 0 ? "text-red-700" : "text-gray-600"
              }`}>
                {totalThreats === 0 && totalScans > 0
                  ? "Site is clean"
                  : totalThreats > 0
                  ? `${totalThreats} threat${totalThreats !== 1 ? "s" : ""} detected`
                  : "No scans yet"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {totalScans > 0 ? `Across ${totalScans} scan${totalScans !== 1 ? "s" : ""}` : "Run a scan to check"}
              </p>
            </div>
          </div>

          {/* Threat types */}
          {threatTypes.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Threat Types Found</p>
              <div className="flex flex-wrap gap-1.5">
                {threatTypes.map((t) => (
                  <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Intelligence sources */}
          {allSources.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Intelligence Sources</p>
              <div className="space-y-1.5">
                {allSources.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span className="text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalScans === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Run your first scan to see intelligence data</p>
          )}
        </div>
      </div>

      {/* ── Row 3: Full scan history table ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Scan History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{totalScans} scan{totalScans !== 1 ? "s" : ""} recorded</p>
          </div>
          {threatScans > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              {threatScans} with threats
            </span>
          )}
        </div>

        {scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Shield size={22} className="text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No scans yet</p>
              <p className="text-xs text-muted-foreground mt-1">Run your first malware scan to detect threats</p>
            </div>
            {canRunScan && (
              <button
                onClick={onRunScan}
                disabled={scanning}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2"
                style={{ background: brandColor }}
              >
                <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
                {scanning ? "Scanning…" : "Run First Scan"}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Date & Time", "Result", "Threats", "Sources", "Details"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => {
                  const threatCount = scan.threats?.length ?? 0;
                  const isExpanded = expandedScan === scan.id;
                  return (
                    <Fragment key={scan.id}>
                      <tr
                        className="border-b border-border hover:bg-gray-50/60 transition-colors cursor-pointer"
                        onClick={() => !scan.is_clean && setExpandedScan(isExpanded ? null : scan.id)}
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm text-foreground font-medium">
                            {new Date(scan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(scan.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          {scan.is_clean ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                              <CheckCircle2 size={10} /> Clean
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                              <XCircle size={10} /> Threats Found
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-sm font-bold tabular-nums ${threatCount > 0 ? "text-red-600" : "text-green-600"}`}>
                            {threatCount}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-muted-foreground">
                            {(scan.sources_used?.length ?? 0)} source{(scan.sources_used?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {!scan.is_clean && (
                            <button className="flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: brandColor }}>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && !scan.is_clean && (
                        <tr>
                          <td colSpan={5} className="px-5 py-4 bg-red-50/40 border-b border-border">
                            {scan.threats && scan.threats.length > 0 ? (
                              <div className="rounded-xl overflow-hidden border border-red-100">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-red-50 border-b border-red-100">
                                      <th className="px-4 py-2 text-left font-semibold text-red-700">URL / Path</th>
                                      <th className="px-4 py-2 text-left font-semibold text-red-700">Threat Type</th>
                                      <th className="px-4 py-2 text-left font-semibold text-red-700">Source Feed</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {scan.threats.map((threat, i) => (
                                      <tr key={i} className="border-b border-red-100 last:border-0 bg-white">
                                        <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground max-w-[240px] truncate">
                                          {threat.url || threat.file_path || threat.description || "—"}
                                        </td>
                                        <td className="px-4 py-2.5 text-foreground font-medium">
                                          {threat.threat_type || threat.type || "Unknown"}
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                          {threat.source || threat.severity || "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {scan.sources_used && scan.sources_used.length > 0 && (
                                  <div className="px-4 py-2 border-t border-red-100 bg-red-50">
                                    <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider">Sources: </span>
                                    <span className="text-[10px] text-red-600">{scan.sources_used.join(", ")}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-red-700 px-2">No specific threat details — URL matched threat intelligence feed</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Plugins Tab ───────────────────────────────────────────────────────────────

function PluginTable({
  plugins, brandColor, showUpdateStatus,
}: {
  plugins: SitePlugin[];
  brandColor: string;
  showUpdateStatus: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-gray-50/50">
            <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Plugin</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Version</th>
            {showUpdateStatus && (
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {plugins.map((plugin) => (
            <tr key={plugin.name} className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: brandColor + "18", color: brandColor }}>
                    {plugin.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm font-medium text-foreground">{plugin.name}</span>
                </div>
              </td>
              <td className="px-5 py-3">
                <span className="text-sm font-mono text-muted-foreground">{plugin.version || "—"}</span>
              </td>
              {showUpdateStatus && (
                <td className="px-5 py-3">
                  {plugin.update_available ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      <RefreshCw size={9} />
                      Update → v{plugin.new_version || "?"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                      <CheckCircle2 size={9} />
                      Up to date
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PluginsTab({ site, brandColor }: { site: Site; brandColor: string }) {
  const allPlugins     = site.plugin_data?.plugins ?? [];
  const activePlugins  = allPlugins.filter((p) => p.status === "active");
  const inactPlugins   = allPlugins.filter((p) => p.status === "inactive");
  const needsUpdate    = activePlugins.filter((p) => p.update_available).length;
  const outdated12m    = site.plugins_outdated_12m ?? [];

  if (allPlugins.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Package size={24} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">No plugin data</p>
          <p className="text-xs text-muted-foreground mt-1">
            {site.plugin_connected
              ? "Data will appear after the next plugin sync"
              : "Connect the WordPress plugin to view installed plugins"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Total Plugins",  value: allPlugins.length,    color: brandColor,  icon: <Package size={15} /> },
          { label: "Active",         value: activePlugins.length, color: "#10b981",   icon: <CheckCircle2 size={15} /> },
          { label: "Inactive",       value: inactPlugins.length,  color: "#6366f1",   icon: <Package size={15} /> },
          { label: "Need Updates",   value: needsUpdate,          color: "#f59e0b",   icon: <RefreshCw size={15} /> },
        ] as { label: string; value: number; color: string; icon: React.ReactNode }[]).map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + "18", color }}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Plugins ── */}
      {activePlugins.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Plugins</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{activePlugins.length} plugins running</p>
            </div>
            {needsUpdate > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {needsUpdate} update{needsUpdate !== 1 ? "s" : ""} available
              </span>
            )}
          </div>
          <PluginTable plugins={activePlugins} brandColor={brandColor} showUpdateStatus />
        </div>
      )}

      {/* ── Inactive Plugins ── */}
      {inactPlugins.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Inactive Plugins</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{inactPlugins.length} installed but not active</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {inactPlugins.length} plugin{inactPlugins.length !== 1 ? "s" : ""}
            </span>
          </div>
          <PluginTable plugins={inactPlugins} brandColor="#6366f1" showUpdateStatus={true} />
        </div>
      )}

      {/* ── Abandoned Plugins ── */}
      {outdated12m.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Abandoned Plugins</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Not updated in 12+ months — potential security risk</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              {outdated12m.length} plugin{outdated12m.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Plugin", "Version", "Last Updated"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outdated12m.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-red-50 text-red-500">
                          {p.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-mono text-muted-foreground">{p.version || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-red-600">{p.last_updated || "Unknown"}</span>
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

// ── WooCommerce Tab ───────────────────────────────────────────────────────────

function WooCommerceTab({ site, brandColor }: { site: Site; brandColor: string }) {
  const hasWoo       = site.woocommerce_active ?? false;
  const orderCount   = site.woo_order_count;
  const revenue      = site.woo_revenue;
  const revenueStr   = revenue != null
    ? `$${Number(revenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  const comingSoonTiles = [
    { label: "Orders (7 days)",      icon: <ShoppingCart size={18} />, color: brandColor },
    { label: "Orders (30 days)",     icon: <BarChart2     size={18} />, color: "#6366f1"  },
    { label: "Revenue Trend",        icon: <TrendingUp    size={18} />, color: "#10b981"  },
    { label: "Failed / Refunded",    icon: <XCircle       size={18} />, color: "#ef4444"  },
    { label: "Avg Order Value",      icon: <DollarSign    size={18} />, color: "#f59e0b"  },
    { label: "Payment Gateway Health", icon: <CheckCircle2 size={18} />, color: "#06b6d4" },
  ];

  return (
    <div className="space-y-5">

      {/* WooCommerce status banner */}
      <div className={`rounded-2xl border p-4 ${hasWoo ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-border"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasWoo ? "bg-purple-100" : "bg-gray-100"}`}>
            <ShoppingCart size={18} className={hasWoo ? "text-purple-600" : "text-muted-foreground"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${hasWoo ? "text-purple-700" : "text-foreground"}`}>
              {hasWoo ? "WooCommerce is active" : "WooCommerce not detected"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasWoo
                ? "Store data is being collected. Extended analytics coming soon."
                : "No WooCommerce installation found. Connect the plugin to enable store tracking."}
            </p>
          </div>
          {hasWoo && (
            <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700">Active</span>
          )}
        </div>
      </div>

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: brandColor + "18" }}>
              <ShoppingCart size={18} style={{ color: brandColor }} />
            </div>
            <p className="text-sm font-semibold text-foreground">Total Orders</p>
          </div>
          <div>
            <p className="text-4xl font-bold tabular-nums text-foreground">
              {orderCount != null ? orderCount.toLocaleString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-green-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">Total Revenue</p>
          </div>
          <div>
            <p className="text-4xl font-bold tabular-nums text-foreground">{revenueStr}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
        </div>

        {/* Avg Order Value */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Avg Order Value</p>
          </div>
          <div>
            <p className="text-4xl font-bold tabular-nums text-foreground">
              {orderCount && revenue
                ? `$${(Number(revenue) / orderCount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per order</p>
          </div>
        </div>

        {/* Store Status */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasWoo ? "bg-purple-50" : "bg-gray-100"}`}>
              <Package size={18} className={hasWoo ? "text-purple-500" : "text-muted-foreground"} />
            </div>
            <p className="text-sm font-semibold text-foreground">Store Status</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasWoo ? "bg-purple-500" : "bg-gray-300"}`} />
              <p className={`text-lg font-bold ${hasWoo ? "text-purple-600" : "text-muted-foreground"}`}>
                {hasWoo ? "Running" : "Inactive"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasWoo ? "WooCommerce detected" : "No store found"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Extended analytics coming soon ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Extended Analytics</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Detailed store metrics — coming soon</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: brandColor + "18", color: brandColor }}>
            Coming soon
          </span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {comingSoonTiles.map(({ label, icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-gray-50/60"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: color + "14", color }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting plugin data</p>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-md shrink-0">
                Soon
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-dashed border-border bg-gray-50/60 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Orders 7d/30d, revenue trends, failed orders, and payment gateway health will be available once the plugin sends extended WooCommerce metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cron Tab ──────────────────────────────────────────────────────────────────

type CronFilter = "all" | "wp-cron" | "action-scheduler" | "pending" | "running" | "complete" | "failed" | "canceled";

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  running:   "bg-blue-50 text-blue-700 border-blue-200",
  complete:  "bg-green-50 text-green-700 border-green-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  canceled:  "bg-gray-100 text-gray-500 border-gray-200",
  due:       "bg-purple-50 text-purple-700 border-purple-200",
};

function cronStatusBadge(status: string) {
  const cls = STATUS_COLOR[status.toLowerCase()] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

function CronTab({ site, brandColor }: { site: Site; brandColor: string }) {
  const events: CronEvent[] = site.cron_events ?? [];
  const [filter, setFilter] = useState<CronFilter>("all");
  const [search, setSearch] = useState("");

  const wpCount   = events.filter((e) => e.source === "wp-cron").length;
  const asCount   = events.filter((e) => e.source === "action-scheduler").length;
  const failedCnt = events.filter((e) => e.status.toLowerCase() === "failed").length;

  const now = Date.now();
  const dueCnt = events.filter((e) => {
    if (e.source !== "wp-cron" || !e.next_run) return false;
    return new Date(e.next_run).getTime() <= now;
  }).length;

  const FILTER_TABS: { key: CronFilter; label: string; count?: number }[] = [
    { key: "all",              label: "All",              count: events.length },
    { key: "wp-cron",          label: "WP Cron",          count: wpCount },
    { key: "action-scheduler", label: "Action Scheduler", count: asCount },
    { key: "pending",          label: "Pending",          count: events.filter((e) => e.status.toLowerCase() === "pending").length },
    { key: "running",          label: "Running",          count: events.filter((e) => e.status.toLowerCase() === "running").length },
    { key: "complete",         label: "Complete",         count: events.filter((e) => ["complete","completed"].includes(e.status.toLowerCase())).length },
    { key: "failed",           label: "Failed",           count: failedCnt },
    { key: "canceled",         label: "Canceled",         count: events.filter((e) => e.status.toLowerCase() === "canceled").length },
  ];

  const filtered = events.filter((e) => {
    if (filter === "wp-cron")          return e.source === "wp-cron";
    if (filter === "action-scheduler") return e.source === "action-scheduler";
    if (filter === "pending")          return e.status.toLowerCase() === "pending";
    if (filter === "running")          return e.status.toLowerCase() === "running";
    if (filter === "complete")         return ["complete","completed"].includes(e.status.toLowerCase());
    if (filter === "failed")           return e.status.toLowerCase() === "failed";
    if (filter === "canceled")         return e.status.toLowerCase() === "canceled";
    return true;
  }).filter((e) =>
    !search || e.hook.toLowerCase().includes(search.toLowerCase())
  );

  if (!site.plugin_connected || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <CalendarClock size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">No cron data yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {site.plugin_connected
            ? "No scheduled events found on this site."
            : "Install and connect the plugin to collect WP Cron and Action Scheduler events."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: events.length, color: brandColor },
          { label: "WP Cron",      value: wpCount,       color: "#6366f1" },
          { label: "Action Sched", value: asCount,       color: "#3b82f6" },
          { label: "Failed",       value: failedCnt,     color: failedCnt > 0 ? "#ef4444" : "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-1.5">
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {dueCnt > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs font-medium text-amber-800">
            {dueCnt} WP Cron event{dueCnt !== 1 ? "s are" : " is"} overdue (past scheduled run time).
          </p>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Filter + search */}
        <div className="px-5 pt-4 pb-0 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Scheduled Events</h3>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hook…"
                className="text-xs pl-7 pr-3 py-1.5 rounded-lg border border-border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 w-44"
                style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
              />
            </div>
          </div>
          <div className="flex gap-0 overflow-x-auto min-w-max -mb-px">
            {FILTER_TABS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  filter === key
                    ? "border-b-2"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                ].join(" ")}
                style={filter === key ? { borderBottomColor: brandColor, color: brandColor } : undefined}
              >
                {label}
                {count !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === key ? "bg-opacity-20" : "bg-gray-100 text-muted-foreground"}`}
                    style={filter === key ? { background: brandColor + "20", color: brandColor } : undefined}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Hook</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Next Run</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Schedule</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No events match this filter.</td>
                </tr>
              ) : (
                filtered.map((ev, i) => {
                  const nextRun = ev.next_run ? new Date(ev.next_run) : null;
                  const isOverdue = nextRun && ev.source === "wp-cron" && nextRun.getTime() <= now;
                  return (
                    <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-foreground max-w-[260px] truncate" title={ev.hook}>
                        {ev.hook}
                      </td>
                      <td className="px-4 py-3">{cronStatusBadge(ev.status)}</td>
                      <td className={`px-4 py-3 tabular-nums ${isOverdue ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                        {nextRun
                          ? nextRun.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                        {isOverdue && <AlertCircle size={11} className="inline ml-1 text-amber-400" />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ev.schedule ?? ev.recurrence ?? (ev.interval ? `Every ${ev.interval}s` : "One-off")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ev.source === "action-scheduler"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {ev.source === "action-scheduler" ? "AS" : "WP"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border bg-gray-50/40 text-[10px] text-muted-foreground">
          Showing {filtered.length} of {events.length} events · Last synced with plugin data push
        </div>
      </div>
    </div>
  );
}

// ── Site Health Tab ────────────────────────────────────────────────────────────

function BoolRow({ label, value, good, bad }: { label: string; value: boolean | null | undefined; good: boolean; bad: boolean }) {
  if (value === null || value === undefined) return null;
  const isGood = value === good;
  const isBad  = value === bad;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isGood ? "text-green-600" : isBad ? "text-red-500" : "text-amber-500"}`}>
        {isGood ? <CheckCircle2 size={12} /> : isBad ? <XCircle size={12} /> : <AlertCircle size={12} />}
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

function SiteHealthTab({ site }: { site: Site }) {
  const h: SiteHealth | null = site.site_health ?? null;

  if (!site.plugin_connected || !h) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <HeartPulse size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">No health data yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {site.plugin_connected
            ? "Site health data will be available on the next plugin sync."
            : "Install and connect the plugin to collect WordPress site health indicators."}
        </p>
      </div>
    );
  }

  const ext = h.php_extensions ?? {};
  const extKeys = Object.keys(ext);
  const extMissing = extKeys.filter((k) => !ext[k]);

  const wpChecks = [
    { label: "HTTPS enabled",         value: h.is_https,            good: true,  bad: false },
    { label: "WP update available",   value: h.wp_update_available, good: false, bad: true  },
    { label: "Auto-updates enabled",  value: h.auto_updates_enabled,good: true,  bad: false },
    { label: "WP_DEBUG_LOG on",       value: h.wp_debug_log,        good: false, bad: true  },
    { label: "WP_DEBUG_DISPLAY on",   value: h.wp_debug_display,    good: false, bad: true  },
    { label: "File mods disabled",    value: h.disallow_file_mods,  good: true,  bad: false },
    { label: "WP Cron disabled",      value: h.wp_cron_disabled,    good: false, bad: false },
    { label: "User registration open",value: h.users_can_register,  good: false, bad: true  },
  ] as { label: string; value: boolean | null | undefined; good: boolean; bad: boolean }[];

  const fsChecks = [
    { label: "Uploads writable",  value: h.uploads_writable,  good: true, bad: false },
    { label: "Plugins writable",  value: h.plugins_writable,  good: true, bad: false },
    { label: "Themes writable",   value: h.themes_writable,   good: true, bad: false },
  ] as { label: string; value: boolean | null | undefined; good: boolean; bad: boolean }[];

  const issues = [
    h.wp_update_available && "WordPress update available",
    h.wp_debug_log && "WP_DEBUG_LOG is enabled (logs may leak sensitive data)",
    h.wp_debug_display && "WP_DEBUG_DISPLAY is enabled (errors shown to visitors)",
    h.users_can_register && "User registration is open",
    extMissing.length > 0 && `Missing PHP extensions: ${extMissing.join(", ")}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5">
      {/* Issues banner */}
      {issues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-800">{issues.length} issue{issues.length !== 1 ? "s" : ""} detected</p>
          </div>
          <ul className="list-disc list-inside space-y-0.5 ml-4">
            {issues.map((iss) => (
              <li key={iss} className="text-xs text-amber-700">{iss}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WordPress Checks */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">WordPress Checks</p>
              {h.wp_latest_version && (
                <p className="text-xs text-muted-foreground">Latest WP: {h.wp_latest_version}</p>
              )}
            </div>
          </div>
          <div className="px-5 py-1">
            {wpChecks.map(({ label, value, good, bad }) => (
              <BoolRow key={label} label={label} value={value} good={good} bad={bad} />
            ))}
            {h.permalink_structure && (
              <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">Permalink structure</span>
                <span className="text-xs font-semibold text-foreground font-mono">{h.permalink_structure}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filesystem Checks */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Database size={14} className="text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Filesystem Access</p>
          </div>
          <div className="px-5 py-1">
            {fsChecks.map(({ label, value, good, bad }) => (
              <BoolRow key={label} label={label} value={value} good={good} bad={bad} />
            ))}
          </div>
        </div>
      </div>

      {/* PHP Extensions */}
      {extKeys.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Server size={14} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">PHP Extensions</p>
              <p className="text-xs text-muted-foreground">
                {extKeys.filter((k) => ext[k]).length} of {extKeys.length} loaded
                {extMissing.length > 0 && ` · ${extMissing.length} missing`}
              </p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {extKeys.map((name) => {
              const loaded = ext[name];
              return (
                <div
                  key={name}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                    loaded
                      ? "bg-green-50/60 border-green-100"
                      : "bg-red-50/60 border-red-100"
                  }`}
                >
                  {loaded
                    ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                    : <XCircle size={12} className="text-red-400 shrink-0" />}
                  <span className={`text-xs font-medium font-mono truncate ${loaded ? "text-green-700" : "text-red-600"}`}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { site, loading, error, refetch } = useSite(id);
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#6366f1";
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
                style={{ background: brandColor }}
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
      <div className="bg-[#f1f4f8] border-b border-border px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map(({ key, label, icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap",
                  isActive
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/70",
                ].join(" ")}
                style={isActive ? {
                  background: "white",
                  color: brandColor,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
                } : undefined}
              >
                {icon}
                {label}
              </button>
            );
          })}
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
            brandColor={brandColor}
          />
        )}
        {activeTab === "seo"         && <SeoTab site={site} audits={site.audits} brandColor={brandColor} />}
        {activeTab === "security"    && <SecurityTab site={site} audits={site.audits} brandColor={brandColor} />}
        {activeTab === "performance" && <PerformanceTab site={site} audits={site.audits} brandColor={brandColor} />}
        {activeTab === "malware"     && (
          <MalwareTab
            site={site}
            audits={site.audits}
            scans={site.scans}
            onRunScan={runScan}
            scanning={scanLoading}
            canRunScan={canRunAudit}
            scanError={scanError}
            brandColor={brandColor}
          />
        )}
        {activeTab === "uptime"      && <UptimeTab site={site} brandColor={brandColor} />}
        {activeTab === "plugins"     && <PluginsTab site={site} brandColor={brandColor} />}
        {activeTab === "woocommerce" && <WooCommerceTab site={site} brandColor={brandColor} />}
        {activeTab === "cron"        && <CronTab site={site} brandColor={brandColor} />}
        {activeTab === "health"      && <SiteHealthTab site={site} />}
      </div>
    </div>
  );
}
