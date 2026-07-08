"use client";

import { useState, useRef, useEffect, Fragment, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, ExternalLink, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Shield, ShieldAlert, ShieldCheck, Package, ShoppingCart, Wifi, Key, Copy, Eye, EyeOff,
  Activity, Wrench, TrendingUp, Clock, Zap, Server, Database, LayoutGrid,
  Bell, DollarSign, BarChart2, CalendarClock, HeartPulse, Search, AlertTriangle, Bot,
  Loader2, ToggleLeft, ToggleRight, Ban, ImageIcon, X, CalendarDays,
  HardDrive, RotateCcw, Download, ListTodo,
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
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";
import { Button } from "@/components/ui/Button";
import { MalwareScanPanel } from "@/components/sites/MalwareScanPanel";
import { SSHSettingsPanel } from "@/components/sites/SSHSettingsPanel";
import { ConfirmationModal, ThinkingPanel, ApprovalUI, ResultsDashboard } from "@/components/performance";
import { useSSHSettings } from "@/hooks/useSSHSettings";
import api from "@/lib/api";
import { timeAgo, scoreHex } from "@/lib/utils";
import type { Site, Audit, ScanResult, AlertSettings, Plugin as SitePlugin, CronEvent, SiteHealth, PluginVulnerability, WooFatalError, WooGateway } from "@/types";

const AVATAR_COLORS = ["#1f5fb8","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
function siteAvatarColor(id: string) { return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length]; }

// ── Tab config ────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "issues"
  | "security"
  | "performance"
  | "seo"
  | "malware"
  | "uptime"
  | "plugins"
  | "woocommerce"
  | "cron"
  | "health"
  | "backups";

const BASE_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview",    label: "Overview",    icon: <LayoutGrid size={13} /> },
  { key: "issues",      label: "Issues",      icon: <ListTodo size={13} /> },
  { key: "seo",         label: "SEO",         icon: <TrendingUp size={13} /> },
  { key: "security",    label: "Security",    icon: <Shield size={13} /> },
  { key: "performance", label: "Performance", icon: <Zap size={13} /> },
  { key: "malware",     label: "Malware",     icon: <Activity size={13} /> },
  { key: "uptime",      label: "Uptime",      icon: <Wifi size={13} /> },
  { key: "plugins",     label: "Plugins",     icon: <Package size={13} /> },
  { key: "backups",     label: "Backups",     icon: <HardDrive size={13} /> },
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
    <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

interface Benchmarks {
  performance: number | null;
  seo: number | null;
  security: number | null;
  malware: number | null;
}

function OverviewTab({
  site,
  audits,
  runAudit,
  auditLoading,
  canRunAudit,
  brandColor,
  benchmarks,
  setTab,
}: {
  site: Site;
  audits: Audit[];
  runAudit: () => void;
  auditLoading: boolean;
  canRunAudit: boolean;
  brandColor: string;
  benchmarks: Benchmarks | null;
  setTab: (tab: Tab) => void;
}) {
  const scores = site.latest_scores;
  const prevAudit = audits[1];
  const overallScore = scores
    ? Math.round((scores.performance + scores.seo + scores.security + scores.malware) / 4)
    : null;
  const isAuditInProgress = audits.some(a => a.status === "pending" || a.status === "running");

  const pillarConfig: {
    key: "performance" | "seo" | "security" | "malware";
    label: string;
    tab: Tab;
    isMalware?: boolean;
  }[] = [
    { key: "performance", label: "Performance",    tab: "performance" },
    { key: "seo",         label: "SEO",            tab: "seo" },
    { key: "security",    label: "Security",       tab: "security" },
    { key: "malware",     label: "Malware Health", tab: "malware", isMalware: true },
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
            color: "#1f5fb8",
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
          <div key={label} className="bg-white rounded-2xl shadow-elevated-sm p-4 flex items-center gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
          {pillarConfig.map(({ key, label, tab, isMalware }) => {
            const score = scores[key];
            const prevScore = prevAudit?.scores?.[key];
            const delta = prevScore !== undefined ? score - prevScore : undefined;
            const sub = delta === undefined ? undefined : delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} from last`;
            const variant: "good" | "warn" | "bad" =
              delta === 0 ? "warn" : key === "malware" ? (score >= 80 ? "good" : "bad") : score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
            const avg = benchmarks?.[key] ?? null;
            const avgDiff = avg !== null ? score - avg : null;
            return (
              <div
                key={key}
                className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col items-center justify-center min-h-[190px] gap-1 cursor-pointer transition-all duration-base hover:shadow-glow hover:-translate-y-1 active:scale-[0.98]"
                style={{ cursor: "pointer" }}
                onClick={() => setTab(tab)}
                title={`Open ${label} tab`}
              >
                <ScoreGauge score={score} label={label} sublabel={sub} sublabelVariant={variant} size="lg" isMalware={!!isMalware} />
                {avg !== null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-muted-foreground">Industry avg:</span>
                    <span className="text-[11px] font-bold text-muted-foreground">{avg}</span>
                    {avgDiff !== null && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${avgDiff >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {avgDiff >= 0 ? `+${avgDiff}` : avgDiff}
                      </span>
                    )}
                  </div>
                )}
                {isMalware && (
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5 leading-snug px-2">
                    100 = fully clean · lower = threats detected
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-elevated-sm flex items-center justify-center py-12 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="text-center">
            {isAuditInProgress ? (
              <>
                <Loader2 size={24} className="text-accent mx-auto mb-2 animate-spin" />
                <p className="text-sm font-semibold text-foreground">Audit in progress…</p>
                <p className="text-xs text-muted-foreground mt-1">Scores will appear here when it completes</p>
              </>
            ) : (
              <>
                <Wifi size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No audit data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Run your first audit to see scores</p>
                {canRunAudit && (
                  <Button className="mt-4" size="sm" onClick={runAudit} loading={auditLoading}>
                    Run first audit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {(() => {
        const latestAudit = audits.find((a) => a.status === "completed");
        const narrative = latestAudit?.ai_narrative;
        const recs = latestAudit?.ai_recommendations;
        if (!narrative?.overall) return null;
        const EFFORT_STYLE: Record<string, string> = {
          low:    "bg-green-50 text-green-700",
          medium: "bg-amber-50 text-amber-700",
          high:   "bg-red-50 text-red-700",
        };
        const PILLAR_STYLE: Record<string, string> = {
          Security:    "bg-cyan-50 text-cyan-700",
          Performance: "bg-[var(--accent-light)] text-[var(--accent-hover)]",
          SEO:         "bg-pink-50 text-pink-700",
          Malware:     "bg-purple-50 text-purple-700",
          General:     "bg-gray-100 text-gray-600",
        };
        return (
          <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: brandColor + "18" }}>
                <Bot size={14} style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">AI Summary</p>
                <p className="text-[11px] text-muted-foreground">Generated after last audit</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Overall narrative */}
              <p className="text-sm text-foreground leading-relaxed">{narrative.overall}</p>

              {/* Per-pillar one-liners */}
              {(["performance","seo","security","malware"] as const).some(k => narrative[k]) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(["performance","seo","security","malware"] as const).map(key => {
                    const text = narrative[key];
                    if (!text) return null;
                    const labels: Record<string, string> = { performance: "Performance", seo: "SEO", security: "Security", malware: "Malware" };
                    return (
                      <div key={key} className="bg-gray-50 rounded-xl px-3.5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{labels[key]}</p>
                        <p className="text-xs text-foreground leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommendations */}
              {recs && recs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Recommended Actions</p>
                  <div className="space-y-2">
                    {recs.slice(0, 3).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-gray-50/60">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5"
                          style={{ background: brandColor }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className="text-xs font-semibold text-foreground">{rec.title}</p>
                            {rec.pillar && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PILLAR_STYLE[rec.pillar] ?? PILLAR_STYLE.General}`}>
                                {rec.pillar}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${EFFORT_STYLE[rec.effort] ?? EFFORT_STYLE.medium}`}>
                              {rec.effort} effort
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec.description}</p>
                          {rec.how && <p className="text-[11px] text-foreground mt-1 font-medium">{rec.how}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Main two-column section: left = trend + audit history, right = issues + environment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Health Score Trend */}
          <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
            <h3 className="text-sm font-semibold text-foreground mb-1">Health Score Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Per-pillar breakdown · select range and pillars below</p>
            <TrendChart siteId={site.id} />
          </div>

          {/* Audit History */}
          <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Audit History</h3>
            </div>
            <div className="p-5">
              <AuditHistoryTable audits={audits} siteId={site.id} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Top Issues */}
          <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

// ── Issues Tab ────────────────────────────────────────────────────────────────

interface FixItem {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  component: "security" | "malware" | "performance" | "seo";
  resolved: boolean;
}

const PRIORITY_ORDER_LIST = ["critical", "high", "medium", "low"] as const;

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "text-red-700",    bg: "bg-red-50 border-red-200"       },
  high:     { label: "High",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  medium:   { label: "Medium",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200"   },
  low:      { label: "Low",      color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"     },
};

const EFFORT_META: Record<string, { label: string; cls: string }> = {
  low:    { label: "Quick fix", cls: "bg-green-50 text-green-700"  },
  medium: { label: "Moderate",  cls: "bg-amber-50 text-amber-700"  },
  high:   { label: "Complex",   cls: "bg-red-50 text-red-700"      },
};

const COMPONENT_CLS: Record<string, string> = {
  security:    "bg-cyan-50 text-cyan-700",
  malware:     "bg-purple-50 text-purple-700",
  performance: "bg-[var(--accent-light)] text-[var(--accent-hover)]",
  seo:         "bg-pink-50 text-pink-700",
};

function IssuesTab({ site, brandColor }: { site: Site; brandColor: string }) {
  const [fixes, setFixes]         = useState<FixItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [confirmFix, setConfirmFix] = useState<FixItem | null>(null);
  const [resolved, setResolved]   = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<{ fixes: FixItem[] }>(`/sites/${site.id}/fix-queue`)
      .then(({ data }) => setFixes(data.fixes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [site.id]);

  async function resolveFix(fix: FixItem) {
    setResolving(fix.title);
    try {
      await api.post(`/sites/${site.id}/fix-queue/resolve`, { title: fix.title });
      setResolved((prev) => new Set([...prev, fix.title]));
      toast.success("Fix marked as resolved");
    } catch {
      toast.error("Failed to mark fix as resolved");
    } finally {
      setResolving(null);
      setConfirmFix(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${brandColor}30`, borderTopColor: brandColor }} />
      </div>
    );
  }

  const activeFixes = fixes.filter((f) => !f.resolved && !resolved.has(f.title));
  const resolvedFixes = fixes.filter((f) => f.resolved || resolved.has(f.title));

  if (activeFixes.length === 0 && resolvedFixes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-elevated-sm flex items-center justify-center py-20 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
        <div className="text-center">
          <CheckCircle2 size={28} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No issues found</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Run an audit to check for issues</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmation modal */}
      {confirmFix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mark as resolved?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirm you have applied this fix before marking it resolved.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">{confirmFix.title}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmFix(null)}
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveFix(confirmFix)}
                disabled={resolving === confirmFix.title}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60"
                style={{ background: brandColor }}
              >
                {resolving === confirmFix.title
                  ? <><Loader2 size={12} className="animate-spin" />Saving…</>
                  : "Mark resolved"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {PRIORITY_ORDER_LIST.map((p) => {
          const count = activeFixes.filter((f) => f.priority === p).length;
          if (!count) return null;
          const meta = PRIORITY_META[p];
          return (
            <span key={p} className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
              {meta.label} · {count}
            </span>
          );
        })}
        {activeFixes.length === 0 && (
          <span className="text-xs text-green-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-green-500" /> All issues resolved
          </span>
        )}
      </div>

      {/* Groups */}
      {PRIORITY_ORDER_LIST.map((priority) => {
        const group = activeFixes.filter((f) => f.priority === priority);
        if (!group.length) return null;
        const meta = PRIORITY_META[priority];
        return (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                {meta.label} — {group.length} {group.length === 1 ? "issue" : "issues"}
              </span>
            </div>
            <div className="space-y-3">
              {group.map((fix) => {
                const effort = EFFORT_META[fix.effort] ?? EFFORT_META.medium;
                const compCls = COMPONENT_CLS[fix.component] ?? "bg-gray-100 text-gray-600";
                return (
                  <div key={fix.title} className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-1.5">{fix.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{fix.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${effort.cls}`}>{effort.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${compCls}`}>{fix.component}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmFix(fix)}
                        disabled={!!resolving}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        Resolve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Resolved section */}
      {resolvedFixes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Resolved ({resolvedFixes.length})</p>
          <div className="space-y-2">
            {resolvedFixes.map((fix) => (
              <div key={fix.title} className="bg-white rounded-2xl shadow-elevated-sm p-4 opacity-50 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  <p className="text-sm text-foreground flex-1">{fix.title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Resolved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab({ site, audits, brandColor, runAudit, canRunAudit }: { site: Site; audits: Audit[]; brandColor: string; runAudit?: () => void; canRunAudit?: boolean }) {
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
    { label: "Admin Account Count",  category: "Accounts", safe: site.admin_users_count == null ? null : site.admin_users_count <= 2,         detail: site.admin_users_count == null ? "Unknown" : site.admin_users_count <= 2 ? `${site.admin_users_count} admin${site.admin_users_count !== 1 ? "s" : ""} — acceptable` : `${site.admin_users_count} admins — review and reduce` },
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col items-center justify-center gap-2 min-h-[190px] hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
              <p className="text-sm font-semibold text-foreground">No audit yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Run an audit to see your security score</p>
              {canRunAudit && runAudit && (
                <button
                  onClick={runAudit}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: brandColor }}
                >
                  Run first audit
                </button>
              )}
            </div>
          )}
        </div>

        {/* SSL Certificate */}
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
              <Key size={15} className="text-[var(--accent)]" />
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Admin Accounts</h3>
            {site.admin_users_count != null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                site.admin_users_count > 4 ? "bg-red-50 text-red-600" :
                site.admin_users_count > 2 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
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
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${risky ? "bg-red-100 text-red-600" : "bg-[var(--accent-light)] text-[var(--accent)]"}`}>
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
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

function PerformanceTab({ site, audits, brandColor, runAudit, canRunAudit }: { site: Site; audits: Audit[]; brandColor: string; runAudit?: () => void; canRunAudit?: boolean }) {
  const score = site.latest_scores?.performance;
  const latestAudit = audits.find((a) => a.status === "completed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perf = latestAudit?.performance_data as any;

  // PSI Optimization Workflow State
  const [psiWorkflow, setPsiWorkflow] = useState<{
    step: 'idle' | 'confirm' | 'thinking' | 'approval' | 'results';
    sessionId: string | null;
    iterationId: string | null;
    currentIteration: number;
    riskTier: 'low' | 'medium' | 'high';
    loading: boolean;
    error: string | null;
    deploymentData: any | null;
    measurementData: any | null;
    thinkingData: any | null;
  }>({
    step: 'idle',
    sessionId: null,
    iterationId: null,
    currentIteration: 0,
    riskTier: 'low',
    loading: false,
    error: null,
    deploymentData: null,
    measurementData: null,
    thinkingData: null,
  });

  // Start optimization
  const startOptimization = async () => {
    setPsiWorkflow(p => ({ ...p, loading: true, error: null }));
    try {
      const res = await api.post('/api/performance/start-optimization', {
        site_id: site.id,
        risk_tier_preference: psiWorkflow.riskTier,
      });
      setPsiWorkflow(p => ({
        ...p,
        step: 'thinking',
        sessionId: res.session_id,
        currentIteration: 1,
        loading: false,
      }));
      // Auto-deploy first fix
      deployNextFix(res.session_id);
    } catch (err: any) {
      setPsiWorkflow(p => ({ ...p, error: err.message || 'Failed to start optimization', loading: false }));
    }
  };

  // Deploy next fix
  const deployNextFix = async (sessionId: string) => {
    setPsiWorkflow(p => ({ ...p, loading: true }));
    try {
      const res = await api.post('/api/performance/deploy-fix', {
        session_id: sessionId,
        site_id: site.id,
        fix_id: 'auto-select', // Backend will select based on confidence
      });
      setPsiWorkflow(p => ({
        ...p,
        deploymentData: res.deployment,
        iterationId: res.iteration_id,
        step: 'approval',
        loading: false,
      }));
    } catch (err: any) {
      setPsiWorkflow(p => ({ ...p, error: err.message || 'Deployment failed', loading: false }));
    }
  };

  // User approves and continue
  const approveAndContinue = async (continueOpt: boolean) => {
    if (!psiWorkflow.sessionId || !psiWorkflow.iterationId) return;
    setPsiWorkflow(p => ({ ...p, loading: true }));
    try {
      await api.post('/api/performance/approve-iteration', {
        session_id: psiWorkflow.sessionId,
        iteration_id: psiWorkflow.iterationId,
        continue_optimization: continueOpt,
      });
      if (continueOpt) {
        setPsiWorkflow(p => ({
          ...p,
          step: 'thinking',
          currentIteration: p.currentIteration + 1,
          loading: false,
        }));
        setTimeout(() => deployNextFix(psiWorkflow.sessionId!), 1000);
      } else {
        // Show results
        const resultsRes = await api.get(`/api/performance/results/${psiWorkflow.sessionId}`);
        setPsiWorkflow(p => ({
          ...p,
          step: 'results',
          measurementData: resultsRes,
          loading: false,
        }));
      }
    } catch (err: any) {
      setPsiWorkflow(p => ({ ...p, error: err.message || 'Action failed', loading: false }));
    }
  };

  // User rollback
  const rollback = async () => {
    if (!psiWorkflow.sessionId || !psiWorkflow.iterationId) return;
    setPsiWorkflow(p => ({ ...p, loading: true }));
    try {
      await api.post('/api/performance/rollback-iteration', {
        session_id: psiWorkflow.sessionId,
        iteration_id: psiWorkflow.iterationId,
        reason: 'user_requested',
      });
      // Go back to thinking and deploy next
      setPsiWorkflow(p => ({
        ...p,
        step: 'thinking',
        currentIteration: p.currentIteration + 1,
        loading: false,
      }));
      setTimeout(() => deployNextFix(psiWorkflow.sessionId!), 1000);
    } catch (err: any) {
      setPsiWorkflow(p => ({ ...p, error: err.message || 'Rollback failed', loading: false }));
    }
  };

  // Stop optimization
  const stopOptimization = async () => {
    if (!psiWorkflow.sessionId) return;
    setPsiWorkflow(p => ({ ...p, loading: true }));
    try {
      const resultsRes = await api.get(`/api/performance/results/${psiWorkflow.sessionId}`);
      setPsiWorkflow(p => ({
        ...p,
        step: 'results',
        measurementData: resultsRes,
        loading: false,
      }));
    } catch (err: any) {
      setPsiWorkflow(p => ({ ...p, error: err.message || 'Failed to get results', loading: false }));
    }
  };

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
        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col items-center justify-center gap-2 min-h-[200px] hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
              <p className="text-sm font-semibold text-foreground">No audit yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Run an audit to measure performance</p>
              {canRunAudit && runAudit && (
                <button
                  onClick={runAudit}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: brandColor }}
                >
                  Run first audit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Metric cards with donut rings */}
        {metricCards.map(({ title, abbr, value, st, pct }) => {
          const color = mColor(st);
          const statusLabel = st === "good" ? "Good" : st === "needs-work" ? "Needs Work" : st === "poor" ? "Poor" : null;
          const statusCls   = st === "good" ? "bg-green-50 text-green-700" : st === "needs-work" ? "bg-amber-50 text-amber-700" : st === "poor" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500";
          return (
            <div key={abbr} className="bg-white rounded-2xl shadow-elevated-sm p-4 flex flex-col items-center justify-center gap-2 min-h-[200px] hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

      {/* ── PSI Autonomous Optimization ── */}
      {psiWorkflow.step === 'idle' && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">PSI Autonomous Optimization</h3>
              <p className="text-sm text-gray-700 mb-4">
                Let our AI automatically optimize your site's PageSpeed Insights score with real-time approval workflow.
              </p>
              <ul className="text-xs text-gray-700 space-y-1.5">
                <li>✓ Deploy and test fixes iteratively</li>
                <li>✓ You approve each change before continuing</li>
                <li>✓ Instant rollback if something breaks</li>
                <li>✓ See PSI improvements in real-time</li>
              </ul>
            </div>
            <button
              onClick={() => setPsiWorkflow(p => ({ ...p, step: 'confirm' }))}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Start Optimization
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {psiWorkflow.step === 'confirm' && (
        <ConfirmationModal
          site_url={site.url}
          psi_mobile_before={score || 50}
          psi_desktop_before={score || 50}
          tier={psiWorkflow.riskTier}
          onConfirm={startOptimization}
          onCancel={() => setPsiWorkflow(p => ({ ...p, step: 'idle', error: null }))}
          isLoading={psiWorkflow.loading}
        />
      )}

      {/* Thinking + Approval Workflow */}
      {(psiWorkflow.step === 'thinking' || psiWorkflow.step === 'approval') && psiWorkflow.sessionId && (
        <div className="space-y-4">
          <ThinkingPanel
            current_iteration={psiWorkflow.currentIteration}
            thinking_steps={[]}
            recent_decisions={[]}
            fixes_deployed={psiWorkflow.currentIteration - 1}
            rollbacks={0}
            status="active"
            isCollapsed={psiWorkflow.step !== 'thinking'}
          />

          {psiWorkflow.step === 'approval' && psiWorkflow.deploymentData && (
            <ApprovalUI
              fix_id={psiWorkflow.deploymentData.fix_id || 'Fix ' + psiWorkflow.currentIteration}
              risk_tier={psiWorkflow.riskTier}
              psi_improvement_mobile={psiWorkflow.deploymentData.improvement_mobile || 0}
              psi_improvement_desktop={psiWorkflow.deploymentData.improvement_desktop || 0}
              health_check_status={psiWorkflow.deploymentData.health_check?.healthy ? 'healthy' : 'failed'}
              cache_cleared={psiWorkflow.deploymentData.cache?.cleared || false}
              onApprove={() => approveAndContinue(true)}
              onRollback={rollback}
              onStop={() => stopOptimization()}
              isLoading={psiWorkflow.loading}
            />
          )}

          {psiWorkflow.step === 'thinking' && psiWorkflow.loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin mb-4">⚙️</div>
                <p className="text-gray-600 font-semibold">Deploying fix...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Dashboard */}
      {psiWorkflow.step === 'results' && psiWorkflow.sessionId && psiWorkflow.measurementData && (
        <ResultsDashboard
          session_id={psiWorkflow.sessionId}
          site_id={site.id}
          status="completed"
          duration_ms={0}
          started_at={new Date().toISOString()}
          psi_mobile_before={score || 50}
          psi_mobile_after={psiWorkflow.measurementData.results?.psi_mobile_after || score || 50}
          psi_improvement={psiWorkflow.measurementData.results?.psi_improvement || 0}
          fixes_deployed={psiWorkflow.measurementData.results?.fixes_deployed || 0}
          fixes_rejected={psiWorkflow.measurementData.results?.fixes_rejected || 0}
          rollbacks={psiWorkflow.measurementData.results?.rollbacks || 0}
          iterations_total={psiWorkflow.measurementData.results?.iterations_total || 0}
          fixes_applied={psiWorkflow.measurementData.results?.fixes_applied || []}
          onNewOptimization={() => setPsiWorkflow(p => ({
            ...p,
            step: 'idle',
            sessionId: null,
            iterationId: null,
            currentIteration: 0,
            error: null,
            deploymentData: null,
            measurementData: null,
          }))}
        />
      )}

      {/* Error Display */}
      {psiWorkflow.error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle size={18} />
          <div>
            <p className="font-semibold">Optimization Error</p>
            <p className="text-xs mt-1">{psiWorkflow.error}</p>
          </div>
          <button
            onClick={() => setPsiWorkflow(p => ({ ...p, error: null }))}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Google Analytics ── */}
      <GoogleAnalyticsSection site={site} brandColor={brandColor} />
    </div>
  );
}

// ── Google Analytics Section ─────────────────────────────────────────────────

interface GA4Data {
  sessions_7d: number; pageviews_7d: number; bounce_rate: number; avg_session_sec: number;
  sessions_30d: number; pageviews_30d: number;
  top_pages: { path: string; pageviews: number; sessions: number }[];
}

function GoogleAnalyticsSection({ site, brandColor }: { site: Site; brandColor: string }) {
  const [status, setStatus]       = useState<{ connected: boolean; ga4_connected: boolean; ga4_property_id: string | null } | null>(null);
  const [data, setData]           = useState<GA4Data | null>(null);
  const [properties, setProps]    = useState<{ property_id: string; display_name: string; account_name: string }[] | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [connecting, setConnecting]   = useState(false);
  const [selectingProp, setSelectingProp] = useState(false);

  useEffect(() => {
    api.get<typeof status>(`/analytics/${site.id}/status`).then(({ data: s }) => {
      setStatus(s);
      if (s?.ga4_connected) {
        setLoadingData(true);
        api.get<GA4Data>(`/analytics/${site.id}/ga4`)
          .then(({ data: d }) => setData(d))
          .catch(() => {})
          .finally(() => setLoadingData(false));
      }
    }).catch(() => {});
  }, [site.id]);

  async function connect() {
    setConnecting(true);
    try {
      const { data: r } = await api.get<{ url: string }>(`/analytics/${site.id}/google/auth-url`);
      window.location.href = r.url;
    } catch { setConnecting(false); }
  }

  async function openPropertySelector() {
    setSelectingProp(true);
    try {
      const { data: r } = await api.get<{ properties: typeof properties }>(`/analytics/${site.id}/ga4/properties`);
      setProps(r.properties);
    } catch { setSelectingProp(false); }
  }

  async function selectProperty(id: string) {
    await api.post(`/analytics/${site.id}/ga4/property`, { property_id: id });
    setProps(null); setSelectingProp(false);
    const { data: s } = await api.get<typeof status>(`/analytics/${site.id}/status`);
    setStatus(s);
    if (s?.ga4_connected) {
      setLoadingData(true);
      api.get<GA4Data>(`/analytics/${site.id}/ga4`).then(({ data: d }) => setData(d)).catch(() => {}).finally(() => setLoadingData(false));
    }
  }

  const fmtSec = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;

  return (
    <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <BarChart2 size={14} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Analytics</h3>
            {status?.ga4_connected && (
              <p className="text-[11px] text-muted-foreground">Property: {status.ga4_property_id}</p>
            )}
          </div>
        </div>
        {status?.connected && !status.ga4_connected && (
          <button onClick={openPropertySelector} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-gray-50 transition-colors">
            Select property
          </button>
        )}
        {!status?.connected && (
          <button onClick={connect} disabled={connecting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60">
            {connecting ? <RefreshCw size={11} className="animate-spin" /> : <ExternalLink size={11} />}
            {connecting ? "Redirecting…" : "Connect Google"}
          </button>
        )}
      </div>

      {/* Property selector modal */}
      {properties !== null && (
        <div className="px-5 py-4 border-b border-border bg-gray-50/50">
          <p className="text-xs font-semibold text-foreground mb-2">Select your GA4 property</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {properties.map((p) => (
              <button key={p.property_id} onClick={() => selectProperty(p.property_id)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-white text-xs transition-colors">
                <span className="font-semibold text-foreground">{p.display_name}</span>
                <span className="text-muted-foreground ml-2">— {p.account_name}</span>
                <span className="float-right text-muted-foreground font-mono">{p.property_id}</span>
              </button>
            ))}
            {properties.length === 0 && <p className="text-xs text-muted-foreground py-2">No GA4 properties found for this Google account.</p>}
          </div>
          <button onClick={() => { setProps(null); setSelectingProp(false); }} className="mt-2 text-xs text-muted-foreground hover:underline">Cancel</button>
        </div>
      )}

      {!status?.connected && (
        <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
          <BarChart2 size={24} className="text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Connect Google Analytics</p>
          <p className="text-xs text-muted-foreground max-w-xs">See sessions, pageviews, bounce rate and top pages alongside your performance score.</p>
        </div>
      )}

      {status?.connected && !status.ga4_connected && properties === null && !selectingProp && (
        <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-foreground">Google account connected</p>
          <p className="text-xs text-muted-foreground">Select your GA4 property to start viewing traffic data.</p>
        </div>
      )}

      {status?.ga4_connected && (
        loadingData ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${brandColor}30`, borderTopColor: brandColor }} />
          </div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Sessions (7d)",   value: data.sessions_7d.toLocaleString()  },
                { label: "Sessions (30d)",  value: data.sessions_30d.toLocaleString() },
                { label: "Pageviews (7d)",  value: data.pageviews_7d.toLocaleString() },
                { label: "Bounce Rate",     value: `${(data.bounce_rate * 100).toFixed(1)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-gray-50/50 px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            {/* Avg session duration */}
            <p className="text-xs text-muted-foreground">Avg. session duration (7d): <span className="font-semibold text-foreground">{fmtSec(data.avg_session_sec)}</span></p>
            {/* Top pages table */}
            {data.top_pages.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Top Pages (30d)</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-gray-50/50">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Page</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Views</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_pages.map((p, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 font-mono text-foreground truncate max-w-[240px]">{p.path}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{p.pageviews.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.sessions.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">Could not load GA4 data. Check that this property has data.</p>
          </div>
        )
      )}
    </div>
  );
}

// ── SEO Tab ───────────────────────────────────────────────────────────────────

function BrokenLinksSection({ siteId, brandColor }: { siteId: string; brandColor: string }) {
  const [links, setLinks]           = useState<{ url: string; status_code: number; found_on: string; checked_at: string }[]>([]);
  const [checkedAt, setCheckedAt]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [running, setRunning]       = useState(false);

  useEffect(() => {
    api.get<{ broken_links: typeof links; checked_at: string | null }>(`/sites/${siteId}/broken-links`)
      .then(({ data }) => { setLinks(data.broken_links); setCheckedAt(data.checked_at); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  async function triggerRun() {
    setRunning(true);
    try {
      await api.post(`/sites/${siteId}/broken-links/run`);
    } catch {}
    setRunning(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Broken Links</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {checkedAt
              ? `Last checked ${new Date(checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
              : "Not yet checked"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {links.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
              {links.length} broken
            </span>
          )}
          <button
            onClick={triggerRun}
            disabled={running}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={running ? "animate-spin" : ""} />
            {running ? "Running…" : "Run check"}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="py-10 flex items-center justify-center">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${brandColor}30`, borderTopColor: brandColor }} />
        </div>
      ) : links.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
          <CheckCircle2 size={24} className="text-green-500" />
          <p className="text-sm font-semibold text-foreground">{checkedAt ? "No broken links found" : "No data yet"}</p>
          <p className="text-xs text-muted-foreground">{checkedAt ? "All links are responding correctly" : "Run a check to scan up to 50 pages"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                {["Broken URL", "Status", "Found On"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {links.map((link, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 max-w-[320px]">
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-mono text-foreground hover:underline break-all">
                      {link.url}
                    </a>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      link.status_code === 404 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                    }`}>
                      {link.status_code}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-[260px]">
                    <a href={link.found_on} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline truncate block max-w-full">
                      {link.found_on.replace(/^https?:\/\/[^/]+/, "") || "/"}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col items-center justify-center gap-1 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

      {/* ── Broken Links ── */}
      <BrokenLinksSection siteId={site.id} brandColor={brandColor} />

      {/* ── Search Console ── */}
      <SearchConsoleSection site={site} brandColor={brandColor} />

      {/* ── SEO Checklist ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
  const [responseHistory, setResponseHistory] = useState<{ day: string; avg_ms: number; uptime_pct: number }[]>([]);

  useEffect(() => {
    api.get<AlertSettings>(`/alerts/${site.id}`)
      .then(({ data }) => setAlertSettings(data))
      .catch(() => {});
  }, [site.id]);

  useEffect(() => {
    api.get<{ history: { day: string; avg_ms: number; uptime_pct: number }[] }>(`/sites/${site.id}/uptime-history`)
      .then(({ data }) => setResponseHistory(data.history ?? []))
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-6 flex flex-col justify-between hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col items-center justify-center gap-4 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

      {/* ── Response time chart ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm p-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Response Time — Last 30 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Average response time in ms</p>
          </div>
          {responseHistory.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {responseHistory.length}d of data
            </span>
          )}
        </div>
        {responseHistory.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: brandColor + "14" }}>
              <Activity size={20} style={{ color: brandColor }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No response time data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Data will appear here as uptime monitoring collects pings</p>
            </div>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={brandColor} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                  width={52}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(val) => [`${val ?? 0} ms`, "Avg response"]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="avg_ms"
                  stroke={brandColor}
                  strokeWidth={2}
                  fill="url(#rtGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: brandColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Incident log + Alert Settings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Incident Log (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col gap-4 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

// ── Search Console Section ────────────────────────────────────────────────────

interface SCData {
  clicks: number; impressions: number; ctr: number; avg_position: number;
  top_queries: { query: string; clicks: number; impressions: number; position: number }[];
  top_pages:   { page: string;  clicks: number; impressions: number }[];
}

function SearchConsoleSection({ site, brandColor }: { site: Site; brandColor: string }) {
  const [status, setStatus]   = useState<{ connected: boolean; sc_connected: boolean; sc_property_url: string | null } | null>(null);
  const [data, setData]       = useState<SCData | null>(null);
  const [scProps, setScProps] = useState<{ site_url: string; permission_level: string }[] | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [connecting, setConnecting]   = useState(false);

  useEffect(() => {
    api.get<typeof status>(`/analytics/${site.id}/status`).then(({ data: s }) => {
      setStatus(s);
      if (s?.sc_connected) {
        setLoadingData(true);
        api.get<SCData>(`/analytics/${site.id}/search-console`)
          .then(({ data: d }) => setData(d))
          .catch(() => {})
          .finally(() => setLoadingData(false));
      }
    }).catch(() => {});
  }, [site.id]);

  async function connect() {
    setConnecting(true);
    try {
      const { data: r } = await api.get<{ url: string }>(`/analytics/${site.id}/google/auth-url`);
      window.location.href = r.url;
    } catch { setConnecting(false); }
  }

  async function openPropSelector() {
    const { data: r } = await api.get<{ properties: typeof scProps }>(`/analytics/${site.id}/sc/properties`);
    setScProps(r.properties);
  }

  async function selectSCProperty(url: string) {
    await api.post(`/analytics/${site.id}/sc/property`, { site_url: url });
    setScProps(null);
    const { data: s } = await api.get<typeof status>(`/analytics/${site.id}/status`);
    setStatus(s);
    if (s?.sc_connected) {
      setLoadingData(true);
      api.get<SCData>(`/analytics/${site.id}/search-console`).then(({ data: d }) => setData(d)).catch(() => {}).finally(() => setLoadingData(false));
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Search size={14} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Search Console</h3>
            {status?.sc_connected && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">{status.sc_property_url}</p>
            )}
          </div>
        </div>
        {status?.connected && !status.sc_connected && (
          <button onClick={openPropSelector} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-gray-50 transition-colors">
            Select property
          </button>
        )}
        {!status?.connected && (
          <button onClick={connect} disabled={connecting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60">
            {connecting ? <RefreshCw size={11} className="animate-spin" /> : <ExternalLink size={11} />}
            {connecting ? "Redirecting…" : "Connect Google"}
          </button>
        )}
      </div>

      {/* SC property selector */}
      {scProps !== null && (
        <div className="px-5 py-4 border-b border-border bg-gray-50/50">
          <p className="text-xs font-semibold text-foreground mb-2">Select your Search Console property</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {scProps.map((p) => (
              <button key={p.site_url} onClick={() => selectSCProperty(p.site_url)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-white text-xs transition-colors">
                <span className="font-semibold text-foreground">{p.site_url}</span>
                <span className="text-muted-foreground ml-2 capitalize">{p.permission_level?.replace('_', ' ')}</span>
              </button>
            ))}
            {scProps.length === 0 && <p className="text-xs text-muted-foreground py-2">No Search Console properties found. Make sure this site is verified in Google Search Console.</p>}
          </div>
          <button onClick={() => setScProps(null)} className="mt-2 text-xs text-muted-foreground hover:underline">Cancel</button>
        </div>
      )}

      {!status?.connected && (
        <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
          <Search size={24} className="text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Connect Search Console</p>
          <p className="text-xs text-muted-foreground max-w-xs">See clicks, impressions, CTR, average position, and top search queries alongside your SEO score.</p>
        </div>
      )}

      {status?.connected && !status.sc_connected && scProps === null && (
        <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-foreground">Google account connected</p>
          <p className="text-xs text-muted-foreground">Select your Search Console property to start viewing search data.</p>
        </div>
      )}

      {status?.sc_connected && (
        loadingData ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${brandColor}30`, borderTopColor: brandColor }} />
          </div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Clicks (28d)",      value: data.clicks.toLocaleString()           },
                { label: "Impressions (28d)",  value: data.impressions.toLocaleString()      },
                { label: "CTR",                value: `${(data.ctr * 100).toFixed(2)}%`      },
                { label: "Avg. Position",      value: data.avg_position.toFixed(1)           },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-gray-50/50 px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            {/* Top queries */}
            {data.top_queries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Top Queries</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-gray-50/50">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Query</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Clicks</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Impr.</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_queries.map((q, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 text-foreground">{q.query}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{q.clicks.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{q.impressions.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">Could not load Search Console data. Ensure this property is verified and has data.</p>
          </div>
        )
      )}
    </div>
  );
}

// ── Malware Tab ───────────────────────────────────────────────────────────────

function MalwareTab({
  site,
  onRunScan,
  scanning,
  canRunScan,
  scanError,
  brandColor,
}: {
  site: Site;
  onRunScan: () => void;
  scanning: boolean;
  canRunScan: boolean;
  scanError?: string | null;
  brandColor: string;
}) {
  const scanParam = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('scan');
  return (
    <MalwareScanPanel
      siteId={site.id}
      onRunScan={onRunScan}
      scanning={scanning}
      canRunScan={canRunScan}
      scanError={scanError}
      brandColor={brandColor}
      initialOpenScanId={scanParam}
    />
  );
}

// ── Plugins Tab ───────────────────────────────────────────────────────────────

// ── Plugin update button ──────────────────────────────────────────────────────

function PluginUpdateButton({ plugin, siteId, updatesEnabled, alreadyUpdated, onComplete, onSuccess }: {
  plugin: SitePlugin; siteId: string; updatesEnabled: boolean;
  alreadyUpdated?: boolean; onComplete?: () => void; onSuccess?: (slug: string) => void;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "failed" | "rolled_back">("idle");

  // Show "Updated" if this session already updated this plugin
  if (alreadyUpdated || state === "done") {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700"><CheckCircle2 size={9} />Updated</span>;
  }

  if (!plugin.update_available || !updatesEnabled) {
    return plugin.update_available ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
        <RefreshCw size={9} />Update → v{plugin.new_version || "?"}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle2 size={9} />Up to date
      </span>
    );
  }

  const actualSlug = plugin.slug ?? plugin.name.toLowerCase().replace(/\s+/g, "-");

  async function handleUpdate() {
    if (state === "running") return;
    setState("running");
    try {
      const { data: job } = await api.post(`/updates/${siteId}/run`, {
        slug: actualSlug,
        update_type: "plugin",
        new_version: plugin.new_version,
      });

      // Poll for result (plugin runs synchronously, backend updates DB when done — up to ~120s)
      let attempts = 0;
      while (attempts < 50) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data: status } = await api.get(`/updates/${siteId}/${job.update_id}/status`);
        if (status.status === "success") { setState("done"); toast.success(`${plugin.name} updated successfully`); onSuccess?.(actualSlug); onComplete?.(); return; }
        if (status.status === "rolled_back") { setState("rolled_back"); toast.warning(`${plugin.name}: update rolled back — site health check failed`); onComplete?.(); return; }
        if (status.status === "failed") { setState("failed"); toast.error(`${plugin.name} update failed: ${status.health_error ?? "unknown error"}`); onComplete?.(); return; }
        attempts++;
      }
      setState("failed");
      toast.error("Update timed out");
      onComplete?.();
    } catch {
      setState("failed");
      toast.error("Failed to trigger update");
      onComplete?.();
    }
  }

  if (state === "rolled_back") return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700"><AlertTriangle size={9} />Rolled back</span>;
  if (state === "failed") return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600"><XCircle size={9} />Failed</span>;

  return (
    <button
      onClick={handleUpdate}
      disabled={state === "running"}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
    >
      {state === "running" ? <><Loader2 size={9} className="animate-spin" />Updating…</> : <><RefreshCw size={9} />Update → v{plugin.new_version || "?"}</>}
    </button>
  );
}

// ── Update history panel ──────────────────────────────────────────────────────

type HistoryRow = {
  id: string; slug: string; update_type: string; old_version: string | null;
  new_version: string | null; status: string; health_error: string | null;
  rolled_back_at: string | null; created_at: string; completed_at: string | null;
  screenshot_before_url: string | null; screenshot_after_url: string | null;
  diff_percentage: number | null;
};

function UpdateHistoryPanel({ siteId, externalRefreshKey }: { siteId: string; externalRefreshKey?: number }) {
  const [history, setHistory]     = useState<HistoryRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [screenshotRow, setScreenshotRow] = useState<HistoryRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function fetchHistory() {
      try {
        const { data } = await api.get(`/updates/${siteId}`);
        if (cancelled) return;
        const rows = data.history ?? [];
        setHistory(rows);
        setLoading(false);
        setRefreshing(false);
        const hasActive = rows.some((r: HistoryRow) =>
          r.status === "pending" || r.status === "running" || r.status === "pending_review"
        );
        if (hasActive) timer = setTimeout(fetchHistory, 4000);
      } catch {
        if (!cancelled) { setLoading(false); setRefreshing(false); }
      }
    }

    fetchHistory();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [siteId, refreshKey, externalRefreshKey]);

  const statusBadge = (s: string) => {
    if (s === "success")        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle2 size={9} />Success</span>;
    if (s === "rolled_back")    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700"><AlertTriangle size={9} />Rolled back</span>;
    if (s === "failed")         return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600"><XCircle size={9} />Failed</span>;
    if (s === "pending_review") return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700"><Eye size={9} />Pending Review</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"><Loader2 size={9} className="animate-spin" />Running</span>;
  };

  async function handleApprove(row: HistoryRow) {
    setActioning(row.id);
    try {
      await api.post(`/updates/${siteId}/${row.id}/approve`);
      toast.success(`${row.slug} update approved`);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to approve update");
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(row: HistoryRow) {
    setActioning(row.id);
    try {
      await api.post(`/updates/${siteId}/${row.id}/reject`);
      toast.success(`${row.slug} update rejected — rolling back`);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to reject update");
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      {/* Screenshot comparison modal */}
      {screenshotRow && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setScreenshotRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Visual Comparison — {screenshotRow.slug}</p>
                {screenshotRow.diff_percentage != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pixel difference: <span className={`font-semibold ${screenshotRow.diff_percentage > 5 ? "text-amber-600" : "text-green-600"}`}>{screenshotRow.diff_percentage}%</span>
                  </p>
                )}
              </div>
              <button onClick={() => setScreenshotRow(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Before</p>
                {screenshotRow.screenshot_before_url
                  ? <img src={screenshotRow.screenshot_before_url} alt="Before" className="w-full rounded-lg border border-border object-top" />
                  : <div className="w-full h-48 rounded-lg border border-border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">No screenshot</div>
                }
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">After</p>
                {screenshotRow.screenshot_after_url
                  ? <img src={screenshotRow.screenshot_after_url} alt="After" className="w-full rounded-lg border border-border object-top" />
                  : <div className="w-full h-48 rounded-lg border border-border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">No screenshot</div>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-2">
        <button
          onClick={() => { setRefreshing(true); setRefreshKey((k) => k + 1); }}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No updates have been run yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                {["Plugin", "From → To", "Status", "Diff", "Date", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-foreground">{u.slug}</td>
                  <td className="px-5 py-3 text-xs font-mono text-muted-foreground">{u.old_version ?? "?"} → {u.new_version ?? "?"}</td>
                  <td className="px-5 py-3">
                    {statusBadge(u.status)}
                    {u.health_error && <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={u.health_error}>{u.health_error}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {u.diff_percentage != null ? (
                      <button
                        onClick={() => setScreenshotRow(u)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors hover:opacity-80 ${u.diff_percentage > 5 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}
                      >
                        <ImageIcon size={9} />{u.diff_percentage}%
                      </button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3">
                    {u.status === "pending_review" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprove(u)}
                          disabled={actioning === u.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {actioning === u.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          disabled={actioning === u.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={10} />
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PluginTable({
  plugins, brandColor, showUpdateStatus, vulnMap, siteId, updatesEnabled, updatedSlugs,
  excluded, onUpdateComplete, onUpdateSuccess, onExclude, onUnexclude,
}: {
  plugins: SitePlugin[];
  brandColor: string;
  showUpdateStatus: boolean;
  vulnMap?: Map<string, PluginVulnerability>;
  siteId?: string;
  updatesEnabled?: boolean;
  updatedSlugs?: Set<string>;
  excluded?: string[];
  onUpdateComplete?: () => void;
  onUpdateSuccess?: (slug: string) => void;
  onExclude?: (slug: string) => void;
  onUnexclude?: (slug: string) => void;
}) {
  const sevColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical": return "bg-red-100 text-red-700";
      case "high":     return "bg-red-50 text-red-600";
      case "medium":   return "bg-amber-50 text-amber-700";
      default:         return "bg-yellow-50 text-yellow-700";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-gray-50/50">
            <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Plugin</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Version</th>
            {vulnMap && (
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Security</th>
            )}
            {showUpdateStatus && (
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Update</th>
            )}
            {updatesEnabled && (
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Exclude</th>
            )}
          </tr>
        </thead>
        <tbody>
          {plugins.map((plugin) => {
            const vuln = vulnMap ? vulnMap.get(plugin.name.toLowerCase()) : undefined;
            return (
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
                {vulnMap && (
                  <td className="px-5 py-3">
                    {vuln ? (
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${sevColor(vuln.severity)}`}>
                          <ShieldAlert size={9} />
                          {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                        </span>
                        {vuln.cve_id && (
                          <span className="text-xs text-muted-foreground font-mono">{vuln.cve_id}</span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                        <ShieldCheck size={9} />
                        Clean
                      </span>
                    )}
                  </td>
                )}
                {showUpdateStatus && (
                  <td className="px-5 py-3">
                    {siteId
                      ? (() => {
                          const slug = plugin.slug ?? plugin.name.toLowerCase().replace(/\s+/g, "-");
                          return <PluginUpdateButton
                            plugin={plugin} siteId={siteId} updatesEnabled={updatesEnabled ?? false}
                            alreadyUpdated={updatedSlugs?.has(slug)}
                            onComplete={onUpdateComplete}
                            onSuccess={onUpdateSuccess}
                          />;
                        })()
                      : plugin.update_available
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><RefreshCw size={9} />Update → v{plugin.new_version || "?"}</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700"><CheckCircle2 size={9} />Up to date</span>
                    }
                  </td>
                )}
                {updatesEnabled && (() => {
                  const slug = plugin.slug ?? plugin.name.toLowerCase().replace(/\s+/g, "-");
                  const isExcluded = excluded?.includes(slug);
                  return (
                    <td className="px-5 py-3">
                      {isExcluded ? (
                        <button
                          onClick={() => onUnexclude?.(slug)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Remove from exclusion list"
                        >
                          <Ban size={10} />Excluded
                        </button>
                      ) : (
                        <button
                          onClick={() => onExclude?.(slug)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                          title="Exclude from updates"
                        >
                          <Ban size={10} />Exclude
                        </button>
                      )}
                    </td>
                  );
                })()}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── BackupsTab ────────────────────────────────────────────────────────────────

type BackupRecord = {
  id: string;
  type: "db" | "files" | "full";
  status: "pending" | "running" | "completed" | "failed";
  size_mb: number | null;
  health_error: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
};

function BackupsTab({ site, brandColor, canUseAdvancedFeatures }: { site: Site; brandColor: string; canUseAdvancedFeatures?: boolean }) {
  const [backups, setBackups]           = useState<BackupRecord[]>([]);
  const [schedule, setSchedule]         = useState<string>("manual");
  const [loading, setLoading]           = useState(true);
  const [running, setRunning]           = useState(false);
  const [type, setType]                 = useState<"db" | "files" | "full">("full");
  const [savingSched, setSavingSched]   = useState(false);
  const [confirmRestore,   setConfirmRestore]   = useState<string | null>(null);
  const [confirmDelete,    setConfirmDelete]    = useState<string | null>(null);
  const [downloadLoading,  setDownloadLoading]  = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress]  = useState<Record<string, {
    stage: string; progress: number; status: string;
  }>>({});
  const [preflight, setPreflight] = useState<{
    storage: { used_mb: number; limit_mb: number; remaining_mb: number; pct_used: number };
    last_backup: { size_mb: number; type: string; created_at: string } | null;
    warning: "low_storage" | "insufficient_storage" | null;
  } | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBackupsRef = useRef<BackupRecord[]>([]);

  const fetchBackups = async () => {
    try {
      const { data } = await api.get(`/backups/${site.id}`);
      setBackups(data.backups ?? []);
      setSchedule(data.backup_schedule ?? "manual");
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchBackups();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [site.id]);

  // Poll while any backup is pending/running
  useEffect(() => {
    const hasActive = backups.some(b => b.status === "pending" || b.status === "running");
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(fetchBackups, 4000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [backups]);

  // Toast on backup completion / failure
  useEffect(() => {
    const prev = prevBackupsRef.current;
    if (prev.length > 0) {
      for (const b of backups) {
        const p = prev.find(x => x.id === b.id);
        if (p && (p.status === "pending" || p.status === "running")) {
          if (b.status === "completed") {
            toast.success(`Backup completed${b.size_mb ? ` — ${b.size_mb} MB` : ""}`);
          } else if (b.status === "failed") {
            toast.error(`Backup failed${b.health_error ? `: ${b.health_error.slice(0, 120)}` : ""}`);
          }
        }
      }
    }
    prevBackupsRef.current = backups;
  }, [backups]);

  // Poll restore progress for any active restores
  useEffect(() => {
    const activeIds = Object.keys(restoreProgress).filter(
      id => !['completed', 'failed'].includes(restoreProgress[id].status)
    );
    if (activeIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const id of activeIds) {
        try {
          const { data } = await api.get<{
            restore_status: string; restore_progress: number; health_error: string | null;
          }>(`/backups/${site.id}/${id}/restore-status`);

          const s = data.restore_status ?? 'queued';
          setRestoreProgress(prev => ({ ...prev, [id]: { stage: s, progress: data.restore_progress ?? 0, status: s } }));

          if (s === 'completed') toast.success('Restore completed — site is back online');
          else if (s === 'failed') toast.error(`Restore failed${data.health_error ? `: ${data.health_error.slice(0, 120)}` : ''}`);
        } catch { /* silent — keep polling */ }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [restoreProgress, site.id]);

  const doRunBackup = async () => {
    setRunning(true);
    try {
      await api.post(`/backups/${site.id}/run`, { type });
      toast.success("Backup started");
      await fetchBackups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to start backup");
    } finally {
      setRunning(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data } = await api.get(`/backups/${site.id}/preflight`);
      if (data.warning) {
        setPreflight(data);
        setRunning(false);
        return;
      }
    } catch {
      // preflight failed — proceed without blocking the user
    }
    await doRunBackup();
  };

  const handleSchedule = async (val: string) => {
    setSchedule(val);
    setSavingSched(true);
    try {
      await api.patch(`/backups/${site.id}/schedule`, { backup_schedule: val });
      toast.success("Backup schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSavingSched(false);
    }
  };

  const handleRestore = async (backup: BackupRecord) => {
    if (confirmRestore !== backup.id) { setConfirmRestore(backup.id); setConfirmDelete(null); return; }
    setConfirmRestore(null);
    try {
      await api.post(`/backups/${backup.id}/restore`);
      setRestoreProgress(prev => ({ ...prev, [backup.id]: { stage: 'queued', progress: 0, status: 'queued' } }));
      toast.success("Restore queued — progress shown below");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Restore failed");
    }
  };

  const handleDownload = async (backup: BackupRecord) => {
    setDownloadLoading(backup.id);
    try {
      const { data } = await api.get<{ url: string }>(`/backups/${backup.id}/download`);
      window.open(data.url, "_blank");
    } catch {
      toast.error("Failed to generate download link");
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleDelete = async (backup: BackupRecord) => {
    if (confirmDelete !== backup.id) { setConfirmDelete(backup.id); setConfirmRestore(null); return; }
    setConfirmDelete(null);
    try {
      await api.delete(`/backups/${backup.id}`);
      toast.success("Backup deleted");
      setBackups(prev => prev.filter(b => b.id !== backup.id));
    } catch {
      toast.error("Failed to delete backup");
    }
  };

  const statusBadge = (status: BackupRecord["status"]) => {
    const map: Record<string, string> = {
      pending:   "bg-yellow-100 text-yellow-700",
      running:   "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed:    "bg-red-100 text-red-700",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
        {status === "running" && <Loader2 size={10} className="animate-spin" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const typeBadge = (t: string) => {
    const map: Record<string, string> = { db: "bg-purple-100 text-purple-700", files: "bg-[var(--accent-light)] text-[var(--accent-hover)]", full: "bg-teal-100 text-teal-700" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[t] ?? ""}`}>{t.toUpperCase()}</span>;
  };

  if (!canUseAdvancedFeatures) {
    return (
      <div className="bg-white rounded-2xl shadow-elevated-sm flex flex-col items-center justify-center py-16 gap-4 text-center px-8 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <HardDrive size={22} className="text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Backups &amp; Restores</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] mx-auto">
            Automated backups, one-click restores, and retention management are available on the Growth plan and above.
          </p>
        </div>
        <UpgradeBanner message="Upgrade to Growth or Agency+ to unlock Backups & Restores." compact />
      </div>
    );
  }

  if (!site.plugin_connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
        <HardDrive size={40} strokeWidth={1} />
        <p className="text-sm">Plugin not connected — backups require the BrandBees plugin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Storage pre-flight warning modal */}
      {preflight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${preflight.warning === "insufficient_storage" ? "bg-red-50" : "bg-amber-50"}`}>
                <HardDrive size={18} className={preflight.warning === "insufficient_storage" ? "text-red-500" : "text-amber-500"} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {preflight.warning === "insufficient_storage" ? "Insufficient Backup Storage" : "Low Backup Storage"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {preflight.warning === "insufficient_storage"
                    ? "This backup may exceed your remaining storage quota."
                    : "You're running low on backup storage — this backup may not complete."}
                </p>
              </div>
            </div>

            {/* Storage bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Used: <strong className="text-gray-700">{preflight.storage.used_mb.toFixed(0)} MB</strong></span>
                <span>Limit: <strong className="text-gray-700">{(preflight.storage.limit_mb / 1024).toFixed(0)} GB</strong></span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${preflight.storage.pct_used >= 90 ? "bg-red-500" : "bg-amber-400"}`}
                  style={{ width: `${preflight.storage.pct_used}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {preflight.storage.remaining_mb.toFixed(0)} MB remaining ({preflight.storage.pct_used}% used)
              </p>
            </div>

            {preflight.last_backup && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Last backup was <strong>{preflight.last_backup.size_mb} MB</strong> — estimated size for this run.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPreflight(null)}
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              {preflight.warning === "low_storage" && (
                <button
                  onClick={() => { setPreflight(null); doRunBackup(); }}
                  className="flex-1 text-sm px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: brandColor }}
                >
                  Proceed Anyway
                </button>
              )}
            </div>
            {preflight.warning === "insufficient_storage" && (
              <p className="text-xs text-center text-gray-400">
                Delete old backups to free space, or upgrade your plan to continue.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Schedule */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Backup Schedule</label>
          <div className="flex items-center gap-2">
            <select
              value={schedule}
              onChange={e => handleSchedule(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
            >
              <option value="manual">Manual only</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {savingSched && <Loader2 size={14} className="animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Type selector + run */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Backup Type</label>
          <div className="flex items-center gap-2">
            <select
              value={type}
              onChange={e => setType(e.target.value as "db" | "files" | "full")}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
            >
              <option value="full">Full (DB + Files)</option>
              <option value="db">Database only</option>
              <option value="files">Files only</option>
            </select>
            <Button
              size="sm"
              onClick={handleRun}
              disabled={running}
              style={{ backgroundColor: brandColor }}
              className="text-white"
            >
              {running ? <Loader2 size={13} className="animate-spin mr-1" /> : <HardDrive size={13} className="mr-1" />}
              Run Backup
            </Button>
          </div>
        </div>
      </div>

      {/* Backup history table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <HardDrive size={14} style={{ color: brandColor }} />
            Backup History
          </h3>
          <span className="text-xs text-gray-400">{backups.length} backup{backups.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
            <HardDrive size={36} strokeWidth={1} />
            <p className="text-sm">No backups yet — run your first backup above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Size</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Expires</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {backups.map(backup => (
                <tr key={backup.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">{typeBadge(backup.type)}</td>
                  <td className="px-4 py-3">
                    {statusBadge(backup.status)}
                    {backup.health_error && backup.status === "failed" && (
                      <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={backup.health_error}>
                        {backup.health_error}
                      </p>
                    )}
                    {/* Live restore progress */}
                    {(() => {
                      const rp = restoreProgress[backup.id];
                      if (!rp) return null;
                      const stageLabel: Record<string, string> = {
                        queued: "Queued…", downloading: "Downloading backup",
                        extracting_db: "Restoring database", extracting_files: "Extracting files",
                        completed: "Restored", failed: "Restore failed",
                      };
                      const label = stageLabel[rp.stage] ?? rp.stage;
                      if (rp.status === 'completed') {
                        return <p className="text-xs text-green-600 font-medium mt-1">Restore complete</p>;
                      }
                      if (rp.status === 'failed') {
                        return <p className="text-xs text-red-500 mt-1">Restore failed</p>;
                      }
                      return (
                        <div className="mt-1.5 w-36">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                            <span className="truncate">{label}</span>
                            <span className="ml-1 shrink-0">{rp.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${rp.progress}%`, backgroundColor: brandColor }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {backup.size_mb != null ? `${backup.size_mb} MB` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(backup.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {backup.expires_at ? new Date(backup.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {backup.status === "completed" && (
                        <>
                          {/* Normal restore — via WP plugin (requires WordPress to be working) */}
                          <button
                            onClick={() => handleRestore(backup)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              confirmRestore === backup.id
                                ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                : "text-orange-500 hover:bg-orange-50"
                            }`}
                          >
                            <RotateCcw size={11} />
                            {confirmRestore === backup.id ? "Confirm?" : "Restore"}
                          </button>

                          {/* Download — get the zip directly from R2 for manual restore */}
                          <button
                            onClick={() => handleDownload(backup)}
                            disabled={downloadLoading === backup.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            {downloadLoading === backup.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Download size={11} />}
                            Download
                          </button>
                        </>
                      )}
                      {(backup.status === "completed" || backup.status === "failed") && (
                        <button
                          onClick={() => handleDelete(backup)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            confirmDelete === backup.id
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "text-red-400 hover:bg-red-50"
                          }`}
                        >
                          <Trash2 size={11} />
                          {confirmDelete === backup.id ? "Confirm?" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PluginsTab({ site, audits, brandColor, onSiteRefetch, canUseAdvancedFeatures }: { site: Site; audits: Audit[]; brandColor: string; onSiteRefetch?: () => void; canUseAdvancedFeatures?: boolean }) {
  const allPlugins        = site.plugin_data?.plugins ?? [];
  const activePlugins     = allPlugins.filter((p) => p.status === "active");
  const inactPlugins      = allPlugins.filter((p) => p.status === "inactive");
  const activeNeedsUpdate = activePlugins.filter((p) => p.update_available).length;
  const inactNeedsUpdate  = inactPlugins.filter((p) => p.update_available).length;
  const outdated12m       = site.plugins_outdated_12m ?? [];

  const latestAudit    = audits.find((a) => a.status === "completed");
  const pluginVulns    = latestAudit?.security_data?.plugin_vulnerabilities ?? [];
  const vulnMap        = new Map<string, PluginVulnerability>(
    pluginVulns.map((v) => [v.plugin_name.toLowerCase(), v])
  );

  const [updatesEnabled, setUpdatesEnabled] = useState<boolean>(site.updates_enabled ?? false);
  const [togglingUpdates, setTogglingUpdates] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [updatingAll, setUpdatingAll] = useState<"active" | "inactive" | null>(null);
  const [updatedSlugs, setUpdatedSlugs] = useState<Set<string>>(new Set());

  // Agency-level update settings
  const [visualReview,  setVisualReview]  = useState(false);
  const [updatesPaused, setUpdatesPaused] = useState(false);
  const [togglingReview, setTogglingReview] = useState(false);
  const [resumingKillSwitch, setResumingKillSwitch] = useState(false);

  // Scheduled window
  const [windowDay,    setWindowDay]    = useState<number | null>(site.update_window_day  ?? null);
  const [windowHour,   setWindowHour]   = useState<number | null>(site.update_window_hour ?? null);
  const [savingWindow, setSavingWindow] = useState(false);

  // Exclusions
  const [excluded,       setExcluded]       = useState<string[]>(site.excluded_from_updates ?? []);
  const [excludingSlug,  setExcludingSlug]  = useState<string | null>(null);

  // Load agency update settings on mount
  useEffect(() => {
    api.get("/settings/updates").then(({ data }) => {
      setVisualReview(data.visual_review ?? false);
      setUpdatesPaused(data.updates_paused ?? false);
    }).catch(() => {});
  }, []);

  const bumpHistory = () => setHistoryVersion((v) => v + 1);
  const markUpdated = (slug: string) => {
    setUpdatedSlugs((prev) => new Set([...prev, slug]));
    onSiteRefetch?.();
  };

  async function toggleUpdates() {
    setTogglingUpdates(true);
    try {
      await api.patch(`/updates/${site.id}/toggle`, { enabled: !updatesEnabled });
      setUpdatesEnabled((v) => !v);
      toast.success(updatesEnabled ? "Safe updates disabled" : "Safe updates enabled");
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setTogglingUpdates(false);
    }
  }

  async function toggleVisualReview() {
    setTogglingReview(true);
    try {
      await api.put("/settings/updates", { visual_review: !visualReview });
      setVisualReview((v) => !v);
      toast.success(!visualReview ? "Manual review enabled — updates with >5% visual diff will require approval" : "Manual review disabled");
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setTogglingReview(false);
    }
  }

  async function resumeUpdates() {
    setResumingKillSwitch(true);
    try {
      await api.put("/settings/updates", { updates_paused: false });
      setUpdatesPaused(false);
      toast.success("Scheduled updates resumed");
    } catch {
      toast.error("Failed to resume updates");
    } finally {
      setResumingKillSwitch(false);
    }
  }

  async function saveUpdateWindow() {
    setSavingWindow(true);
    try {
      await api.patch(`/settings/sites/${site.id}/update-window`, {
        update_window_day:  windowDay,
        update_window_hour: windowHour,
      });
      toast.success(windowDay !== null ? "Update window saved" : "Update window cleared");
    } catch {
      toast.error("Failed to save update window");
    } finally {
      setSavingWindow(false);
    }
  }

  async function handleExclude(slug: string) {
    setExcludingSlug(slug);
    try {
      await api.post(`/updates/${site.id}/exclude`, { slug });
      setExcluded((prev) => [...prev, slug]);
      toast.success(`${slug} excluded from updates`);
    } catch {
      toast.error("Failed to exclude plugin");
    } finally {
      setExcludingSlug(null);
    }
  }

  async function handleUnexclude(slug: string) {
    setExcludingSlug(slug);
    try {
      await api.delete(`/updates/${site.id}/exclude/${encodeURIComponent(slug)}`);
      setExcluded((prev) => prev.filter((s) => s !== slug));
      toast.success(`${slug} removed from exclusion list`);
    } catch {
      toast.error("Failed to remove exclusion");
    } finally {
      setExcludingSlug(null);
    }
  }

  async function handleUpdateAll(group: "active" | "inactive") {
    const plugins = group === "active" ? activePlugins : inactPlugins;
    const toUpdate = plugins.filter((p) => p.update_available && (p.slug || p.name));
    if (!toUpdate.length || updatingAll) return;
    setUpdatingAll(group);
    let succeeded = 0, failed = 0;
    for (const plugin of toUpdate) {
      try {
        const { data: job } = await api.post(`/updates/${site.id}/run`, {
          slug: plugin.slug ?? plugin.name.toLowerCase().replace(/\s+/g, "-"),
          update_type: "plugin",
          new_version: plugin.new_version,
        });
        let done = false;
        for (let i = 0; i < 50 && !done; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const { data: st } = await api.get(`/updates/${site.id}/${job.update_id}/status`);
          if (["success", "failed", "rolled_back"].includes(st.status)) {
            done = true;
            if (st.status === "success") {
              succeeded++;
              markUpdated(plugin.slug ?? plugin.name.toLowerCase().replace(/\s+/g, "-"));
            } else { failed++; }
          }
        }
        if (!done) failed++;
      } catch { failed++; }
    }
    setUpdatingAll(null);
    bumpHistory();
    if (failed === 0) toast.success(`All ${succeeded} plugin${succeeded !== 1 ? "s" : ""} updated successfully`);
    else toast.warning(`${succeeded} succeeded, ${failed} failed`);
  }

  if (allPlugins.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-elevated-sm flex flex-col items-center justify-center py-16 gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

      {/* ── Kill switch paused banner ── */}
      {updatesPaused && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Scheduled updates paused</p>
              <p className="text-xs text-red-600 mt-0.5">
                The portfolio kill switch fired because the update failure rate exceeded 5% in the last 24 hours.
                Review recent update history before resuming.
              </p>
            </div>
          </div>
          <button
            onClick={resumeUpdates}
            disabled={resumingKillSwitch}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {resumingKillSwitch ? <Loader2 size={11} className="animate-spin" /> : null}
            Resume Updates
          </button>
        </div>
      )}

      {/* ── Safe Updates settings card ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm p-5 space-y-5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
        {!canUseAdvancedFeatures ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Safe Updates</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-click plugin updates with automatic rollback protection.
              </p>
            </div>
            <UpgradeBanner message="Safe plugin updates with auto-rollback require the Growth plan or above." compact />
          </div>
        ) : (
        <>
        {/* Enable / disable toggle row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Safe Updates</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {updatesEnabled
                ? "Updates are enabled — one-click plugin updates with auto-rollback protection."
                : "Enable to allow one-click plugin updates with automatic rollback if the health check fails."}
            </p>
          </div>
          <button
            onClick={toggleUpdates}
            disabled={togglingUpdates}
            className="flex items-center gap-2 text-sm font-semibold shrink-0 disabled:opacity-50 transition-colors"
            style={{ color: updatesEnabled ? "#10b981" : "#9ca3af" }}
          >
            {togglingUpdates ? <Loader2 size={22} className="animate-spin" /> : updatesEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            {updatesEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {updatesEnabled && (
          <>
            <div className="border-t border-border" />

            {/* Visual review toggle row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Manual Review Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hold updates for approval when the before/after screenshot diff exceeds 5%.
                </p>
              </div>
              <button
                onClick={toggleVisualReview}
                disabled={togglingReview}
                className="flex items-center gap-2 text-sm font-semibold shrink-0 disabled:opacity-50 transition-colors"
                style={{ color: visualReview ? "#1f5fb8" : "#9ca3af" }}
              >
                {togglingReview ? <Loader2 size={22} className="animate-spin" /> : visualReview ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                {visualReview ? "On" : "Off"}
              </button>
            </div>

            <div className="border-t border-border" />

            {/* Scheduled update window */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={14} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Scheduled Update Window</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Automatically run pending updates at a specific day and hour (UTC). Leave blank to disable scheduling.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={windowDay ?? ""}
                  onChange={(e) => setWindowDay(e.target.value === "" ? null : Number(e.target.value))}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No schedule</option>
                  {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
                <select
                  value={windowHour ?? ""}
                  onChange={(e) => setWindowHour(e.target.value === "" ? null : Number(e.target.value))}
                  disabled={windowDay === null}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                >
                  <option value="">Select hour (UTC)</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:00 UTC</option>
                  ))}
                </select>
                <button
                  onClick={saveUpdateWindow}
                  disabled={savingWindow}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {savingWindow ? <Loader2 size={11} className="animate-spin" /> : null}
                  Save
                </button>
                {(windowDay !== null) && (
                  <button
                    onClick={() => { setWindowDay(null); setWindowHour(null); }}
                    className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        </>
        )}
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { label: "Total Plugins",  value: allPlugins.length,                      color: brandColor,  icon: <Package size={15} /> },
          { label: "Active",         value: activePlugins.length,                   color: "#10b981",   icon: <CheckCircle2 size={15} /> },
          { label: "Inactive",       value: inactPlugins.length,                    color: "#1f5fb8",   icon: <Package size={15} /> },
          { label: "Need Updates",   value: activeNeedsUpdate + inactNeedsUpdate,   color: "#f59e0b",   icon: <RefreshCw size={15} /> },
          { label: "Abandoned",      value: outdated12m.length,                     color: "#f97316",   icon: <AlertTriangle size={15} /> },
          { label: "Vulnerable",     value: pluginVulns.length,                     color: "#ef4444",   icon: <ShieldAlert size={15} /> },
        ] as { label: string; value: number; color: string; icon: React.ReactNode }[]).map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-2xl shadow-elevated-sm p-4 flex items-center gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Plugins</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{activePlugins.length} plugins running</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeNeedsUpdate > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {activeNeedsUpdate} update{activeNeedsUpdate !== 1 ? "s" : ""} available
                </span>
              )}
              {activeNeedsUpdate > 0 && updatesEnabled && (
                <button
                  onClick={() => handleUpdateAll("active")}
                  disabled={updatingAll !== null}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {updatingAll === "active" ? <><Loader2 size={11} className="animate-spin" />Updating…</> : <><RefreshCw size={11} />Update All</>}
                </button>
              )}
            </div>
          </div>
          <PluginTable plugins={activePlugins} brandColor={brandColor} showUpdateStatus vulnMap={vulnMap} siteId={site.id} updatesEnabled={updatesEnabled} updatedSlugs={updatedSlugs} excluded={excluded} onUpdateComplete={bumpHistory} onUpdateSuccess={markUpdated} onExclude={handleExclude} onUnexclude={handleUnexclude} />
        </div>
      )}

      {/* ── Inactive Plugins ── */}
      {inactPlugins.length > 0 && (
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Inactive Plugins</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{inactPlugins.length} installed but not active</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {inactNeedsUpdate > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {inactNeedsUpdate} update{inactNeedsUpdate !== 1 ? "s" : ""} available
                </span>
              )}
              {inactNeedsUpdate > 0 && updatesEnabled && (
                <button
                  onClick={() => handleUpdateAll("inactive")}
                  disabled={updatingAll !== null}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {updatingAll === "inactive" ? <><Loader2 size={11} className="animate-spin" />Updating…</> : <><RefreshCw size={11} />Update All</>}
                </button>
              )}
            </div>
          </div>
          <PluginTable plugins={inactPlugins} brandColor="#1f5fb8" showUpdateStatus={true} vulnMap={vulnMap} siteId={site.id} updatesEnabled={updatesEnabled} updatedSlugs={updatedSlugs} excluded={excluded} onUpdateComplete={bumpHistory} onUpdateSuccess={markUpdated} onExclude={handleExclude} onUnexclude={handleUnexclude} />
        </div>
      )}

      {/* ── Abandoned Plugins ── */}
      {outdated12m.length > 0 && (
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

      {/* ── Update History ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Update History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All plugin updates run from this dashboard</p>
        </div>
        <div className="p-5">
          <UpdateHistoryPanel siteId={site.id} externalRefreshKey={historyVersion} />
        </div>
      </div>

    </div>
  );
}

// ── WooCommerce Tab ───────────────────────────────────────────────────────────

function WooCommerceTab({ site, audits, brandColor }: { site: Site; audits: Audit[]; brandColor: string }) {
  const hasWoo       = site.woocommerce_active ?? false;
  const orderCount   = site.woo_order_count;
  const revenue      = site.woo_revenue;
  const fatalErrors: WooFatalError[] = site.woo_fatal_errors ?? [];
  const gateways: WooGateway[]       = site.woo_active_gateways ?? [];

  const fmt = (v: number | null | undefined) =>
    v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
  const revenueStr = fmt(revenue);

  const hasExtended = site.woo_orders_7d != null || site.woo_orders_30d != null;

  const wooNarrative = audits?.find(a => a.status === "completed")?.ai_narrative?.woocommerce;

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
                ? "Store data is being collected from your WooCommerce installation."
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm p-5 flex flex-col gap-3 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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

      {/* ── WooCommerce Fatal Errors ── */}
      {hasWoo && (
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fatal Errors (last 24h)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">PHP fatal errors from WooCommerce logs</p>
            </div>
            {fatalErrors.length > 0 ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                {fatalErrors.length} error{fatalErrors.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">Clean</span>
            )}
          </div>
          {fatalErrors.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">No fatal errors detected in the last 24 hours.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {fatalErrors.map((err: WooFatalError, i: number) => (
                <div key={i} className="px-5 py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-red-600 truncate">{err.error_type || "Fatal Error"}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(err.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-mono break-all leading-relaxed">{err.message}</p>
                  {err.file && (
                    <p className="text-[10px] text-muted-foreground truncate">{err.file}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AI Store Insight ── */}
      {hasWoo && wooNarrative && (
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: brandColor + "18" }}>
              <Bot size={14} style={{ color: brandColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Store Insight</p>
              <p className="text-[11px] text-muted-foreground">Generated after last audit</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-foreground leading-relaxed">{wooNarrative}</p>
          </div>
        </div>
      )}

      {/* ── Extended analytics ── */}
      {hasWoo && (
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Extended Analytics</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Windowed order and revenue metrics</p>
            </div>
            {!hasExtended && (
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: brandColor + "18", color: brandColor }}>
                Awaiting data
              </span>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Orders 7d */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-gray-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: brandColor + "18" }}>
                  <ShoppingCart size={15} style={{ color: brandColor }} />
                </div>
                <p className="text-xs font-semibold text-foreground">Orders (7 days)</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {site.woo_orders_7d != null ? site.woo_orders_7d.toLocaleString() : "—"}
              </p>
            </div>

            {/* Orders 30d */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-gray-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                  <BarChart2 size={15} className="text-[var(--accent)]" />
                </div>
                <p className="text-xs font-semibold text-foreground">Orders (30 days)</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {site.woo_orders_30d != null ? site.woo_orders_30d.toLocaleString() : "—"}
              </p>
            </div>

            {/* Revenue 7d */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-gray-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <TrendingUp size={15} className="text-green-600" />
                </div>
                <p className="text-xs font-semibold text-foreground">Revenue (7 days)</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(site.woo_revenue_7d)}</p>
            </div>

            {/* Revenue 30d */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-gray-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <DollarSign size={15} className="text-emerald-600" />
                </div>
                <p className="text-xs font-semibold text-foreground">Revenue (30 days)</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(site.woo_revenue_30d)}</p>
            </div>

            {/* Failed / Cancelled */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-gray-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <XCircle size={15} className="text-red-500" />
                </div>
                <p className="text-xs font-semibold text-foreground">Failed / Cancelled (30d)</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${(site.woo_failed_orders ?? 0) > 0 ? "text-red-600" : "text-foreground"}`}>
                {site.woo_failed_orders != null ? site.woo_failed_orders.toLocaleString() : "—"}
              </p>
            </div>

            {/* Active Gateways */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-gray-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={15} className="text-cyan-600" />
                </div>
                <p className="text-xs font-semibold text-foreground">Payment Gateways</p>
              </div>
              {gateways.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {gateways.map((gw) => (
                    <span key={gw.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
                      {gw.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-2xl font-bold tabular-nums text-foreground">—</p>
              )}
            </div>

          </div>
          {!hasExtended && (
            <div className="px-5 pb-5">
              <div className="rounded-xl border border-dashed border-border bg-gray-50/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Update the BrandBees plugin to the latest version to start sending windowed order and revenue metrics.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
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
      <div className="bg-white rounded-2xl shadow-elevated-sm p-10 flex flex-col items-center gap-3 text-center hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
          { label: "WP Cron",      value: wpCount,       color: "#1f5fb8" },
          { label: "Action Sched", value: asCount,       color: "#3b82f6" },
          { label: "Failed",       value: failedCnt,     color: failedCnt > 0 ? "#ef4444" : "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl shadow-elevated-sm p-4 flex flex-col gap-1.5 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
      <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
      <div className="bg-white rounded-2xl shadow-elevated-sm p-10 flex flex-col items-center gap-3 text-center hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
        <div className="bg-white rounded-2xl shadow-elevated-sm overflow-hidden hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
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
  return (
    <Suspense>
      <SiteDetailContent />
    </Suspense>
  );
}

function SiteDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { site, loading, error, refetch } = useSite(id);
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#1f5fb8";
  const canUseAdvancedFeatures = agency?.plan === "premium" || agency?.plan === "agency_plus";
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
  const scanInFlightRef = useRef(false); // prevents double-trigger on fast double-click
  const narrativeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);

  useEffect(() => {
    api.get<Benchmarks>("/benchmarks")
      .then(({ data }) => setBenchmarks(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (scanPollRef.current) clearInterval(scanPollRef.current);
      if (narrativeTimerRef.current) clearTimeout(narrativeTimerRef.current);
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
  const [showSSHModal, setShowSSHModal] = useState(false);
  const { status: sshStatus, refreshStatus: refreshSSHStatus } = useSSHSettings(id);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");
    if (connected === "google") toast.success("Google account connected successfully.");
    if (oauthError === "oauth_failed") toast.error("Google OAuth failed. Please try again.");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { done: auditDone } = useAuditStatus(pendingAuditId);
  useEffect(() => {
    if (!auditDone) return;
    setPendingAuditId(null);
    refetch();
    // Narrative is written async ~2-5s after audit completes — refetch again to pick it up.
    // Use a ref so the timer survives the auditDone→false flip that runs effect cleanup.
    if (narrativeTimerRef.current) clearTimeout(narrativeTimerRef.current);
    narrativeTimerRef.current = setTimeout(() => refetch(), 8000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditDone]);

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
    if (scanInFlightRef.current || scanLoading) return;
    scanInFlightRef.current = true;
    setScanLoading(true);
    setScanError(null);
    try {
      const { data: triggerData } = await api.post<{ scan_id: string; mode?: string }>(`/scan/sites/${id}/trigger`);
      const newScanId = triggerData.scan_id;
      const isPollingMode = triggerData.mode === "polling";

      // Hard stop after 8 minutes — prevents infinite loop when scan is queued
      // but the WP plugin hasn't run yet (e.g. pending cron or polling mode)
      const deadlineMs = Date.now() + 8 * 60 * 1000;
      let pendingTicks = 0;

      scanPollRef.current = setInterval(async () => {
        // Bail out past the deadline
        if (Date.now() > deadlineMs) {
          clearInterval(scanPollRef.current!);
          scanPollRef.current = null;
          setScanLoading(false);
          setScanError(
            isPollingMode
              ? "Scan scheduled — the site's security scanner will run it automatically within 2 minutes. Refresh the page to see results."
              : "Scan is taking longer than expected. It will complete in the background — check back shortly."
          );
          return;
        }

        try {
          const { data } = await api.get<{ status: string; threats_found?: number }>(`/scan/sites/${id}/status?scan_id=${newScanId}`);

          // pending/claimed = still waiting for WP to pick it up; don't count as failure
          if (data.status === "pending" || data.status === "claimed") {
            pendingTicks++;
            // After 30 ticks (~2 min) in pending, show a softer "waiting" message
            if (pendingTicks === 30 && isPollingMode) {
              setScanError("Waiting for site scanner to respond… (this can take up to 2 minutes)");
            }
            return;
          }

          // Clear any interim message once the scan actually starts
          if (data.status === "queued" || data.status === "running") {
            setScanError(null);
          }

          if (data.status === "completed" || data.status === "failed") {
            clearInterval(scanPollRef.current!);
            scanPollRef.current = null;
            setScanLoading(false);
            if (data.status === "completed") {
              window.dispatchEvent(new Event("bb:refresh"));
              toast.success("Malware scan complete — review findings in the Malware tab.");
            }
            if (data.status === "failed") {
              setScanError("Scan failed. Please try again.");
              toast.error("Malware scan failed. Please try again.");
            }
          }
        } catch {
          clearInterval(scanPollRef.current!);
          scanPollRef.current = null;
          setScanLoading(false);
          setScanError("Failed to check scan status.");
        }
      }, 4000);
    } catch (err: unknown) {
      setScanLoading(false);
      scanInFlightRef.current = false;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setScanError(msg || "Failed to start scan.");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteLoading(true);
    try {
      await api.delete(`/sites/${id}`);
      await api.post('/sites/cache/clear').catch(() => {});
      window.dispatchEvent(new Event('bb:refresh'));
      toast.success("Site deleted successfully.");
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
        <div className="px-6 pb-3 flex items-center justify-between gap-4 flex-wrap border-t border-gray-100 bg-gray-50/60 pt-2.5">
          <div className="flex items-center gap-4 flex-wrap">
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
          <button
            onClick={() => setShowSSHModal(true)}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0 ${
              sshStatus.saved
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                : "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
            }`}
          >
            {sshStatus.saved ? "✓ SSH Connected" : "SSH Access"}
          </button>
        </div>

        {/* Audit running banner */}
        {pendingAuditId && (
          <div className="mx-6 mb-3 flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-light)] border border-[var(--accent)]/20 rounded-xl">
            <RefreshCw size={13} className="animate-spin text-[var(--accent-hover)] shrink-0" />
            <p className="text-xs text-[var(--accent-hover)] font-medium">
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
            benchmarks={benchmarks}
            setTab={setActiveTab}
          />
        )}
        {activeTab === "issues"      && <IssuesTab site={site} brandColor={brandColor} />}
        {activeTab === "seo"         && <SeoTab site={site} audits={site.audits} brandColor={brandColor} />}
        {activeTab === "security"    && <SecurityTab site={site} audits={site.audits} brandColor={brandColor} runAudit={runAudit} canRunAudit={canRunAudit} />}
        {activeTab === "performance" && <PerformanceTab site={site} audits={site.audits} brandColor={brandColor} runAudit={runAudit} canRunAudit={canRunAudit} />}
        {activeTab === "malware"     && (
          <MalwareTab
            site={site}
            onRunScan={runScan}
            scanning={scanLoading}
            canRunScan={canRunAudit}
            scanError={scanError}
            brandColor={brandColor}
          />
        )}
        {activeTab === "uptime"      && <UptimeTab site={site} brandColor={brandColor} />}
        {activeTab === "plugins"     && <PluginsTab site={site} audits={site.audits} brandColor={brandColor} onSiteRefetch={refetch} canUseAdvancedFeatures={canUseAdvancedFeatures} />}
        {activeTab === "woocommerce" && <WooCommerceTab site={site} audits={site.audits} brandColor={brandColor} />}
        {activeTab === "cron"        && <CronTab site={site} brandColor={brandColor} />}
        {activeTab === "health"      && <SiteHealthTab site={site} />}
        {activeTab === "backups"     && <BackupsTab site={site} brandColor={brandColor} canUseAdvancedFeatures={canUseAdvancedFeatures} />}
      </div>

      {/* SSH Modal */}
      {showSSHModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => { setShowSSHModal(false); refreshSSHStatus(); }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  SSH Access
                </h2>
                <button
                  onClick={() => { setShowSSHModal(false); refreshSSHStatus(); }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <SSHSettingsPanel
                  site={site}
                  onCredentialsSaved={() => refreshSSHStatus()}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
