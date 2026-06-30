"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield, ShieldCheck, Search, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertTriangle, CheckCircle2, Wifi, Pencil, Bug, Key, Settings, FileWarning, Upload,
  XCircle, Info,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreHex } from "@/lib/utils";
import type { Site } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function countRiskFlags(site: Site): number {
  let n = 0;
  if (site.xml_rpc_enabled === true)      n++;
  if (site.file_editor_enabled === true)  n++;
  if (site.wp_debug_enabled === true)     n++;
  if (site.login_url_default === true)    n++;
  if (site.wp_config_writable === true)   n++;
  if (site.htaccess_writable === true)    n++;
  if (site.uploads_php_enabled === true)  n++;
  return n;
}

function siteSeverity(site: Site): "critical" | "warning" | "healthy" {
  const score = site.latest_scores?.security ?? null;
  const isThreat = site.malware_status === "threat";
  const sslDays = sslDaysRemaining(site.ssl_expiry_date);
  if (isThreat || score === null || score < 50 || (sslDays !== null && sslDays <= 7)) return "critical";
  if (score < 80 || (sslDays !== null && sslDays <= 30)) return "warning";
  return "healthy";
}

function securityGrade(score: number | null): { letter: string; label: string } {
  if (score == null) return { letter: "—", label: "No Data" };
  if (score >= 90) return { letter: "A", label: "Excellent" };
  if (score >= 80) return { letter: "B", label: "Good" };
  if (score >= 70) return { letter: "C", label: "Fair" };
  if (score >= 60) return { letter: "D", label: "Needs Work" };
  return { letter: "F", label: "Critical" };
}

type SortKey = "name" | "security" | "malware" | "ssl" | "flags" | "last_scan";
type SortDir  = "asc" | "desc";
type FilterTab = "all" | "critical" | "warning" | "healthy";

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, dir }: { col: SortKey; sortBy: SortKey; dir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={11} className="text-muted-foreground/40" />;
  return dir === "asc" ? <ChevronUp size={11} className="text-accent" /> : <ChevronDown size={11} className="text-accent" />;
}

function HeroStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 bg-white text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function AreaTip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; score: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.score >= 80 ? "#16a34a" : d.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="bg-white border border-border rounded-xl p-3 shadow-lg text-xs min-w-[150px]">
      <p className="font-bold text-foreground text-sm truncate max-w-[160px]">{d.name}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-muted-foreground">Security Score</span>
        <span className="font-bold tabular-nums" style={{ color }}>{d.score}/100</span>
      </div>
    </div>
  );
}

// Static vulnerability definitions with icons and descriptions
const VULN_DEFS: Array<{
  filter: (s: Site) => boolean;
  label: string;
  desc: string;
  color: string;
  Icon: React.ElementType;
}> = [
  { filter: s => s.xml_rpc_enabled === true,      label: "XML-RPC",         desc: "Remote attack surface open",       color: "#dc2626", Icon: Wifi },
  { filter: s => s.login_url_default === true,     label: "Default Login",   desc: "Standard /wp-admin URL in use",    color: "#dc2626", Icon: Key },
  { filter: s => s.wp_config_writable === true,    label: "Config Writable", desc: "wp-config.php is writable",        color: "#dc2626", Icon: Settings },
  { filter: s => s.htaccess_writable === true,     label: ".htaccess Write", desc: ".htaccess can be modified",        color: "#dc2626", Icon: FileWarning },
  { filter: s => s.file_editor_enabled === true,   label: "File Editor",     desc: "In-dashboard code editing on",     color: "#f97316", Icon: Pencil },
  { filter: s => s.uploads_php_enabled === true,   label: "PHP Uploads",     desc: "PHP executes in uploads dir",      color: "#f97316", Icon: Upload },
  { filter: s => s.wp_debug_enabled === true,      label: "Debug Mode",      desc: "Error logs visible to visitors",   color: "#f59e0b", Icon: Bug },
];

function SignalCell({ value, dangerous }: { value: boolean | null | undefined; dangerous?: boolean }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/40 text-xs">—</span>;
  }
  if (dangerous && value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
        <AlertTriangle size={10} className="text-red-500" />
      </span>
    );
  }
  if (dangerous && value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
        <CheckCircle2 size={10} className="text-green-500" />
      </span>
    );
  }
  return <span className="text-muted-foreground/40 text-xs">—</span>;
}

function SslBadge({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const days = sslDaysRemaining(date);
  if (days === null) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const color = days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "#16a34a";
  const bg    = days <= 7 ? "#fef2f2" : days <= 30 ? "#fffbeb" : "#f0fdf4";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
      style={{ color, background: bg }}>
      {days <= 0 ? "Expired" : `${days}d`}
    </span>
  );
}

function MalwareBadge({ status }: { status: Site["malware_status"] }) {
  if (!status) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const clean = status === "clean";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: clean ? "#16a34a" : "#dc2626", background: clean ? "#f0fdf4" : "#fef2f2" }}>
      {clean ? "CLEAN" : "THREAT"}
    </span>
  );
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all",      label: "All Sites" },
  { key: "critical", label: "Critical" },
  { key: "warning",  label: "Warning" },
  { key: "healthy",  label: "Healthy" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const { sites, loading, error } = useSites();
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#6366f1";

  const [filter, setFilter]   = useState<FilterTab>("all");
  const [sortBy, setSortBy]   = useState<SortKey>("security");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch]   = useState("");

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const sitesWithMeta = useMemo(() =>
    sites.map(s => ({ ...s, _severity: siteSeverity(s), _flags: countRiskFlags(s) })),
  [sites]);

  const audited    = useMemo(() => sites.filter(s => s.latest_scores?.security != null), [sites]);
  const notAudited = sites.length - audited.length;

  const avgScore = useMemo(() => {
    if (!audited.length) return null;
    return Math.round(audited.reduce((sum, s) => sum + s.latest_scores!.security, 0) / audited.length);
  }, [audited]);

  const avgColor = avgScore != null ? scoreHex(avgScore) : "#9ca3af";
  const { letter: grade, label: gradeLabel } = securityGrade(avgScore);

  const healthyCount  = useMemo(() => sitesWithMeta.filter(s => s._severity === "healthy").length, [sitesWithMeta]);
  const warnCount     = useMemo(() => sitesWithMeta.filter(s => s._severity === "warning").length, [sitesWithMeta]);
  const criticalCount = useMemo(() => sitesWithMeta.filter(s => s._severity === "critical").length, [sitesWithMeta]);
  const malwareCount  = useMemo(() => sites.filter(s => s.malware_status === "threat").length, [sites]);
  const sslIssues     = useMemo(() => sites.filter(s => {
    const d = sslDaysRemaining(s.ssl_expiry_date);
    return d !== null && d <= 30;
  }).length, [sites]);

  // Area chart: sites sorted by score (worst → best)
  const areaData = useMemo(() =>
    [...audited]
      .sort((a, b) => a.latest_scores!.security - b.latest_scores!.security)
      .map((s, i) => ({
        idx: i + 1,
        name: s.name,
        score: s.latest_scores!.security,
      })),
  [audited]);

  // Distribution pie
  const distPie = useMemo(() => [
    { name: "Healthy (80+)",   value: healthyCount,  color: "#16a34a" },
    { name: "Warning (50–79)", value: warnCount,     color: "#f59e0b" },
    { name: "Critical (<50)",  value: criticalCount, color: "#ef4444" },
    { name: "Not audited",     value: notAudited,    color: "#e2e8f0" },
  ].filter(d => d.value > 0), [healthyCount, warnCount, criticalCount, notAudited]);

  const total     = sites.length;
  const vulnStats = useMemo(() =>
    VULN_DEFS.map(d => ({ ...d, count: sites.filter(d.filter).length }))
      .sort((a, b) => b.count - a.count),
  [sites]);

  // ── Filtered / sorted table ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let base = filter === "all" ? sitesWithMeta : sitesWithMeta.filter(s => s._severity === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(s => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
    }
    return [...base].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortBy === "name")          { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === "security") { va = a.latest_scores?.security ?? -1; vb = b.latest_scores?.security ?? -1; }
      else if (sortBy === "malware")  { va = a.malware_status === "threat" ? 0 : 1; vb = b.malware_status === "threat" ? 0 : 1; }
      else if (sortBy === "ssl")      { va = sslDaysRemaining(a.ssl_expiry_date) ?? 9999; vb = sslDaysRemaining(b.ssl_expiry_date) ?? 9999; }
      else if (sortBy === "flags")    { va = a._flags; vb = b._flags; }
      else                            { va = a.last_audit_at ?? ""; vb = b.last_audit_at ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sitesWithMeta, filter, search, sortBy, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  const th  = "px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors";
  const thC = th + " text-center";

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (error)   return <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>;
  if (sites.length === 0) return <EmptyState icon={<Shield size={22} />} title="No sites yet" description="Add your first site to start monitoring security signals." />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">Intelligence</p>
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Threat exposure, vulnerability signals, and SSL health across all {sites.length} site{sites.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-2 mt-1 text-xs text-muted-foreground bg-white border border-border rounded-full px-3 py-1.5 shadow-xs">
          <Shield size={11} style={{ color: brandColor }} />
          {audited.length} of {sites.length} audited
        </span>
      </div>

      {/* ── Intelligence Summary ── */}
      {(() => {
        const totalFlags  = sites.reduce((n, s) => n + countRiskFlags(s), 0);
        const pluginVulns = sites.reduce((n, s) => n + (s.plugin_vuln_count ?? 0), 0);
        const hasCritical = criticalCount > 0;
        const hasWarning  = warnCount > 0;

        const bullets: { text: string; color: string; icon: React.ReactNode }[] = [];

        if (malwareCount > 0)
          bullets.push({ text: `${malwareCount} site${malwareCount > 1 ? "s have" : " has"} active malware threats — immediate remediation required`, color: "#dc2626", icon: <XCircle size={11} /> });
        if (criticalCount > 0)
          bullets.push({ text: `${criticalCount} site${criticalCount > 1 ? "s are" : " is"} in Critical range (score below 50) — high exposure to attacks`, color: "#dc2626", icon: <AlertTriangle size={11} /> });
        if (sslIssues > 0)
          bullets.push({ text: `${sslIssues} SSL certificate${sslIssues > 1 ? "s" : ""} expiring within 30 days — visitors will see security warnings`, color: "#d97706", icon: <AlertTriangle size={11} /> });
        if (pluginVulns > 0)
          bullets.push({ text: `${pluginVulns} plugin CVE${pluginVulns > 1 ? "s" : ""} detected across your sites — update affected plugins to patch`, color: "#d97706", icon: <AlertTriangle size={11} /> });
        if (totalFlags > 0)
          bullets.push({ text: `${totalFlags} configuration risk flag${totalFlags > 1 ? "s" : ""} found (XML-RPC, default login URL, writable config, etc.)`, color: "#f59e0b", icon: <Info size={11} /> });
        if (warnCount > 0 && !hasCritical)
          bullets.push({ text: `${warnCount} site${warnCount > 1 ? "s" : ""} in Warning range — review vulnerability flags and harden configurations`, color: "#d97706", icon: <Info size={11} /> });
        if (bullets.length === 0 && audited.length > 0)
          bullets.push({ text: "All audited sites are in good standing — no critical issues detected", color: "#16a34a", icon: <CheckCircle2 size={11} /> });
        if (audited.length === 0)
          bullets.push({ text: "Run a security audit on your sites to populate this dashboard", color: "#6b7280", icon: <Info size={11} /> });

        const headline = malwareCount > 0
          ? "Active malware detected — action required"
          : hasCritical
          ? `${criticalCount} site${criticalCount > 1 ? "s" : ""} at critical security risk`
          : hasWarning
          ? "Some sites need attention to improve their security posture"
          : audited.length === 0
          ? "No audit data yet"
          : "Security posture looks healthy across your portfolio";

        const headlineColor = malwareCount > 0 || hasCritical ? "#dc2626" : hasWarning ? "#d97706" : audited.length === 0 ? "#6b7280" : "#16a34a";
        const headlineBg    = malwareCount > 0 || hasCritical ? "#fef2f2" : hasWarning ? "#fffbeb" : audited.length === 0 ? "#f8fafc" : "#f0fdf4";
        const headlineBorder= malwareCount > 0 || hasCritical ? "#fecaca" : hasWarning ? "#fde68a" : audited.length === 0 ? "#e2e8f0" : "#bbf7d0";

        return (
          <div className="rounded-2xl border p-5" style={{ background: headlineBg, borderColor: headlineBorder }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${headlineColor}18` }}>
                {malwareCount > 0 || hasCritical
                  ? <XCircle size={15} style={{ color: headlineColor }} />
                  : hasWarning
                  ? <AlertTriangle size={15} style={{ color: headlineColor }} />
                  : audited.length === 0
                  ? <Shield size={15} style={{ color: headlineColor }} />
                  : <ShieldCheck size={15} style={{ color: headlineColor }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: headlineColor }}>{headline}</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Score is based on: configuration hardening (XML-RPC, login URL, file editor, debug mode, writable files), SSL certificate health, plugin CVE exposure, and malware status.
                </p>
                <ul className="space-y-1.5">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: b.color }}>
                      <span className="shrink-0 mt-0.5">{b.icon}</span>
                      <span className="leading-snug">{b.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Security Grade Hero ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">

          {/* Grade letter */}
          <div className="flex flex-col items-center justify-center gap-2 p-8"
            style={{ background: `${avgColor}08` }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: `${avgColor}18` }}>
              {avgScore == null
                ? <Shield size={36} className="text-muted-foreground/40" />
                : <span className="text-5xl font-black leading-none" style={{ color: avgColor }}>{grade}</span>}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Security Grade</p>
              <p className="text-xs text-muted-foreground mt-0.5">{gradeLabel}</p>
              {avgScore != null && (
                <p className="text-xs font-bold mt-1 tabular-nums" style={{ color: avgColor }}>
                  {avgScore} / 100
                </p>
              )}
            </div>
          </div>

          {/* 6-stat grid */}
          <div className="col-span-3 grid grid-cols-3 gap-px bg-border">
            <HeroStat label="Sites Monitored"  value={sites.length} />
            <HeroStat label="Healthy"           value={healthyCount}  color={healthyCount > 0 ? "#16a34a" : undefined} />
            <HeroStat label="Critical"          value={criticalCount} color={criticalCount > 0 ? "#dc2626" : "#9ca3af"} />
            <HeroStat label="Warning"           value={warnCount}     color={warnCount > 0 ? "#d97706" : "#9ca3af"} />
            <HeroStat label="Malware Threats"   value={malwareCount}  color={malwareCount > 0 ? "#dc2626" : "#16a34a"} />
            <HeroStat label="SSL Issues"        value={sslIssues}     color={sslIssues > 0 ? "#d97706" : "#16a34a"} />
          </div>

        </div>
      </div>

      {/* ── Area Chart + Distribution Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Security Score Landscape — Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Security Score Landscape</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sites ranked from lowest to highest security score
            </p>
          </div>

          {areaData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Shield size={24} />
              <p className="text-xs">Run security audits to see this chart</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={areaData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="secFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={brandColor} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => (typeof v === "string" && v.length > 10 ? v.slice(0, 8) + "…" : String(v))}
                />
                <YAxis
                  domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<AreaTip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={brandColor}
                  strokeWidth={2.5}
                  fill="url(#secFill)"
                  dot={{ r: 4, fill: brandColor, stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: brandColor, stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Score band legend */}
          {areaData.length > 0 && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
              {[
                { label: "Healthy (80+)",   color: "#16a34a" },
                { label: "Warning (50–79)", color: "#f59e0b" },
                { label: "Critical (<50)",  color: "#ef4444" },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Risk Distribution Donut */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Risk Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Sites by security posture</p>

          {distPie.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No data yet</div>
          ) : (
            <>
              <div className="flex justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={distPie} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={72}
                      startAngle={90} endAngle={-270}
                      dataKey="value" paddingAngle={2}
                    >
                      {distPie.map((d, i) => <Cell key={i} fill={d.color} stroke="white" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [`${v} sites`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2.5">
                {distPie.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${(d.value / sites.length) * 100}%`, background: d.color }} />
                      </div>
                      <span className="font-semibold tabular-nums w-4 text-right text-foreground">{d.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-5 border-t border-border grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Healthy",  value: healthyCount,  color: "#16a34a" },
                  { label: "Warning",  value: warnCount,     color: "#f59e0b" },
                  { label: "Critical", value: criticalCount, color: "#ef4444" },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Vulnerability Exposure Cards ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Vulnerability Exposure</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active security risks across {total} site{total !== 1 ? "s" : ""}
            </p>
          </div>
          {vulnStats.every(v => v.count === 0) && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={10} />All clear
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {vulnStats.map(item => {
            const pct = Math.round((item.count / Math.max(total, 1)) * 100);
            const safe = item.count === 0;
            const displayColor = safe ? "#16a34a" : item.color;
            return (
              <div key={item.label}
                className="rounded-xl border border-border p-4 transition-all hover:shadow-sm"
                style={{ background: safe ? "#f0fdf4" : `${item.color}06` }}>
                <div className="flex items-start gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${displayColor}15` }}>
                    <item.Icon size={14} style={{ color: displayColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {safe ? "0" : item.count} / {total} sites
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: displayColor }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden border border-border/50">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: displayColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Security Signals Matrix ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Security Signals Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Per-site breakdown of all vulnerability flags</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-50">
                <AlertTriangle size={9} className="text-red-500" />
              </span>
              Vulnerable
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-50">
                <CheckCircle2 size={9} className="text-green-500" />
              </span>
              Secure
            </span>
            <span className="text-muted-foreground/50">— Unknown</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase min-w-[160px]">Site</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Score</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">XML-RPC</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">File Editor</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">Debug</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">Login URL</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">Config W.</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">.htaccess</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">PHP Upload</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">SSL</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Malware</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap">Plugin CVEs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sitesWithMeta.map(site => {
                const score    = site.latest_scores?.security;
                const sColor   = score != null ? scoreHex(score) : "#9ca3af";
                const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={site.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: sColor }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/sites/${site.id}`}
                            className="text-xs font-semibold text-foreground hover:text-accent transition-colors truncate block max-w-[130px]">
                            {site.name}
                          </Link>
                          <span className="text-[10px] text-muted-foreground truncate block max-w-[130px]">
                            {site.url.replace(/^https?:\/\//, "")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {score != null
                        ? <span className="text-xs font-bold tabular-nums" style={{ color: sColor }}>{score}</span>
                        : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.xml_rpc_enabled} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.file_editor_enabled} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.wp_debug_enabled} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.login_url_default} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.wp_config_writable} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.htaccess_writable} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SignalCell value={site.uploads_php_enabled} dangerous /></td>
                    <td className="px-3 py-3 text-center"><SslBadge date={site.ssl_expiry_date} /></td>
                    <td className="px-3 py-3 text-center"><MalwareBadge status={site.malware_status} /></td>
                    <td className="px-3 py-3 text-center">
                      {site.plugin_vuln_count == null
                        ? <span className="text-muted-foreground/40 text-xs">—</span>
                        : site.plugin_vuln_count > 0
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{site.plugin_vuln_count}</span>
                          : <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-50"><CheckCircle2 size={9} className="text-green-500" /></span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border">
                <td className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Exposed Total</td>
                <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground">—</td>
                {[
                  sites.filter(s => s.xml_rpc_enabled === true).length,
                  sites.filter(s => s.file_editor_enabled === true).length,
                  sites.filter(s => s.wp_debug_enabled === true).length,
                  sites.filter(s => s.login_url_default === true).length,
                  sites.filter(s => s.wp_config_writable === true).length,
                  sites.filter(s => s.htaccess_writable === true).length,
                  sites.filter(s => s.uploads_php_enabled === true).length,
                ].map((count, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] font-bold tabular-nums ${count > 0 ? "text-red-600" : "text-green-600"}`}>
                      {count > 0 ? count : "✓"}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center text-[10px] font-bold">
                  {sslIssues > 0 ? <span className="text-amber-600">{sslIssues}</span> : <span className="text-green-600">✓</span>}
                </td>
                <td className="px-3 py-2.5 text-center text-[10px] font-bold">
                  {malwareCount > 0 ? <span className="text-red-600">{malwareCount}</span> : <span className="text-green-600">✓</span>}
                </td>
                {(() => {
                  const total = sites.reduce((sum, s) => sum + (s.plugin_vuln_count ?? 0), 0);
                  return (
                    <td className="px-3 py-2.5 text-center text-[10px] font-bold">
                      {total > 0 ? <span className="text-red-600">{total}</span> : <span className="text-green-600">✓</span>}
                    </td>
                  );
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Filter + Search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1 shadow-xs">
          {filterTabs.map(({ key, label }) => {
            const count = key === "all" ? sites.length : sitesWithMeta.filter(s => s._severity === key).length;
            const active = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={active ? { background: brandColor, color: "white" } : {}}>
                <span className={active ? "" : "text-muted-foreground"}>{label}</span>
                <span className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text" placeholder="Search sites…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-xs bg-white border border-border rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-52 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* ── Sites Table ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">No sites match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className={th} onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1.5">Site <SortIcon col="name" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("security")}>
                    <span className="flex items-center gap-1.5">Security Score <SortIcon col="security" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("flags")}>
                    <span className="flex items-center gap-1.5">Risk Flags <SortIcon col="flags" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={thC} onClick={() => toggleSort("malware")}>
                    <span className="flex items-center justify-center gap-1.5">Malware <SortIcon col="malware" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("ssl")}>
                    <span className="flex items-center gap-1.5">SSL <SortIcon col="ssl" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("last_scan")}>
                    <span className="flex items-center gap-1.5">Last Scan <SortIcon col="last_scan" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(site => {
                  const score    = site.latest_scores?.security;
                  const sColor   = score != null ? scoreHex(score) : "#9ca3af";
                  const severity = site._severity;
                  const flags    = site._flags;
                  const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

                  const severityPill =
                    severity === "critical" ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wide ml-1.5">Critical</span>
                    : severity === "warning" ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 uppercase tracking-wide ml-1.5">Warning</span>
                    : null;

                  return (
                    <tr key={site.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ background: sColor }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center">
                              <Link href={`/sites/${site.id}`}
                                className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate max-w-[150px]">
                                {site.name}
                              </Link>
                              {severityPill}
                            </div>
                            <span className="text-xs text-muted-foreground truncate block max-w-[170px]">
                              {site.url.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${score}%`, background: sColor }} />
                            </div>
                            <span className="text-sm font-bold tabular-nums" style={{ color: sColor }}>{score}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not audited</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 7 }).map((_, i) => (
                              <div key={i} className="w-2 h-2 rounded-sm"
                                style={{ background: i < flags ? "#ef4444" : "#f3f4f6" }} />
                            ))}
                          </div>
                          <span className="text-xs font-semibold tabular-nums">
                            {flags}<span className="text-muted-foreground font-normal">/7</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center"><MalwareBadge status={site.malware_status} /></td>
                      <td className="px-4 py-3.5"><SslBadge date={site.ssl_expiry_date} /></td>
                      <td className="px-4 py-3.5">
                        {site.last_audit_at
                          ? <span className="text-xs text-muted-foreground">{new Date(site.last_audit_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          : <span className="text-xs text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/sites/${site.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent">
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
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
