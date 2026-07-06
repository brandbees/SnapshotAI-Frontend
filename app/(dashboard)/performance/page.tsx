"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap, Search, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertCircle, CheckCircle2, Server, Globe, ImageIcon, Database,
  Activity, ShieldCheck, TrendingUp, Wifi,
} from "lucide-react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreHex, scoreBgTailwind } from "@/lib/utils";
import type { Site } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "performance" | "response" | "last_scan";
type SortDir  = "asc" | "desc";
type FilterTab = "all" | "good" | "warning" | "poor";

function healthBucket(score: number | undefined | null): FilterTab {
  if (score == null) return "poor";
  if (score >= 80)   return "good";
  if (score >= 50)   return "warning";
  return "poor";
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all",     label: "All Sites" },
  { key: "good",    label: "Fast (80+)" },
  { key: "warning", label: "Warning (50–79)" },
  { key: "poor",    label: "Slow (<50)" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, dir }: { col: SortKey; sortBy: SortKey; dir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={11} className="text-muted-foreground/40" />;
  return dir === "asc" ? <ChevronUp size={11} className="text-accent" /> : <ChevronDown size={11} className="text-accent" />;
}

// Big metric card
function MetricCard({
  label, value, unit, sub, color, icon: Icon, progress,
}: {
  label: string; value: string | number | null; unit?: string; sub?: string;
  color: string; icon: React.ElementType; progress?: number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-6 translate-x-6"
        style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground leading-tight max-w-[120px]">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-4xl font-bold tabular-nums leading-none" style={{ color: value != null ? color : "#9ca3af" }}>
          {value ?? "—"}
        </span>
        {unit && value != null && <span className="text-base text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {progress != null && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

// Custom scatter tooltip
interface ScatterEntry { x: number; y: number; name: string; caching: boolean; cdn: boolean }
function ScatterTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterEntry }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.y >= 80 ? "#16a34a" : d.y >= 50 ? "#d97706" : "#dc2626";
  const rColor = d.x < 300 ? "#16a34a" : d.x < 800 ? "#d97706" : "#dc2626";
  return (
    <div className="bg-white border border-border rounded-xl p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-foreground text-sm mb-2">{d.name}</p>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">Perf Score</span>
        <span className="font-bold" style={{ color: color }}>{d.y}/100</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">Response</span>
        <span className="font-bold" style={{ color: rColor }}>{d.x}ms</span>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${d.caching ? "bg-green-50 text-green-600" : "bg-gray-100 text-muted-foreground"}`}>
          {d.caching ? "✓ Cache" : "No Cache"}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${d.cdn ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-muted-foreground"}`}>
          {d.cdn ? "✓ CDN" : "No CDN"}
        </span>
      </div>
    </div>
  );
}

// Custom scatter dot colored by score
function ScatterDot(props: unknown) {
  const p = props as { cx?: number; cy?: number; payload?: ScatterEntry };
  if (p.cx == null || p.cy == null || !p.payload) return null;
  const color = p.payload.y >= 80 ? "#16a34a" : p.payload.y >= 50 ? "#d97706" : "#dc2626";
  const initials = p.payload.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <g>
      <circle cx={p.cx} cy={p.cy} r={18} fill={color} fillOpacity={0.12} />
      <circle cx={p.cx} cy={p.cy} r={11} fill={color} stroke="white" strokeWidth={2} />
      <text x={p.cx} y={p.cy + 4} textAnchor="middle" fill="white" fontSize={8} fontWeight={700}>{initials}</text>
      <text x={p.cx} y={p.cy + 28} textAnchor="middle" fill="#374151" fontSize={9} fontWeight={600}>
        {p.payload.name.length > 12 ? p.payload.name.slice(0, 10) + "…" : p.payload.name}
      </text>
    </g>
  );
}

// Feature chip for tech matrix
function FeatureChip({ value, label }: { value: string | boolean | null | undefined; label?: string }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (typeof value === "boolean") {
    return value
      ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600"><CheckCircle2 size={9} />On</span>
      : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground">Off</span>;
  }
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 truncate max-w-[80px] inline-block">{label ?? value}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { sites, loading, error } = useSites();
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#1f5fb8";

  const [filter, setFilter]   = useState<FilterTab>("all");
  const [sortBy, setSortBy]   = useState<SortKey>("performance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch]   = useState("");

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const audited    = useMemo(() => sites.filter(s => s.latest_scores?.performance != null), [sites]);
  const notAudited = sites.length - audited.length;

  const avgScore = useMemo(() => {
    if (!audited.length) return null;
    return Math.round(audited.reduce((sum, s) => sum + s.latest_scores!.performance, 0) / audited.length);
  }, [audited]);

  const goodCount = useMemo(() => audited.filter(s => s.latest_scores!.performance >= 80).length, [audited]);
  const warnCount = useMemo(() => audited.filter(s => { const sc = s.latest_scores!.performance; return sc >= 50 && sc < 80; }).length, [audited]);
  const poorCount = useMemo(() => audited.filter(s => s.latest_scores!.performance < 50).length, [audited]);

  const avgColor  = avgScore != null ? scoreHex(avgScore) : "#9ca3af";
  const avgLabel  = avgScore == null ? "No Data" : avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : avgScore >= 40 ? "Needs Work" : "Poor";

  const responseSites  = useMemo(() => sites.filter(s => s.avg_response_ms != null), [sites]);
  const avgResponse    = responseSites.length > 0
    ? Math.round(responseSites.reduce((sum, s) => sum + (s.avg_response_ms ?? 0), 0) / responseSites.length)
    : null;
  const responseColor  = avgResponse == null ? "#9ca3af" : avgResponse < 300 ? "#16a34a" : avgResponse < 800 ? "#d97706" : "#dc2626";
  const responseLabel  = avgResponse == null ? "—" : avgResponse < 300 ? "Excellent" : avgResponse < 800 ? "Acceptable" : "Needs Improvement";

  const cachingCount  = useMemo(() => sites.filter(s => s.caching_plugin).length, [sites]);
  const cdnCount      = useMemo(() => sites.filter(s => s.cdn_plugin).length, [sites]);
  const imgOptCount   = useMemo(() => sites.filter(s => s.image_optimization_plugin).length, [sites]);
  const objCacheCount = useMemo(() => sites.filter(s => s.object_cache_enabled === true).length, [sites]);

  const total = sites.length;
  // Composite tech health: avg of 4 adoption rates
  const techHealth = total > 0
    ? Math.round(([cachingCount, cdnCount, imgOptCount, objCacheCount].reduce((a, b) => a + b, 0) / (4 * total)) * 100)
    : 0;
  const techColor = techHealth >= 70 ? "#16a34a" : techHealth >= 40 ? "#d97706" : "#dc2626";

  // Scatter chart data
  const scatterData = useMemo(() =>
    audited
      .filter(s => s.avg_response_ms != null)
      .map(s => ({
        x: s.avg_response_ms!,
        y: s.latest_scores!.performance,
        name: s.name,
        caching: !!s.caching_plugin,
        cdn: !!s.cdn_plugin,
        id: s.id,
      })),
  [audited]);

  // X axis domain for scatter chart
  const maxResponse = useMemo(() =>
    scatterData.length > 0
      ? Math.max(...scatterData.map(d => d.x), 1200) + 200
      : 2000,
  [scatterData]);

  // Optimization opportunities (sorted by impact)
  const missingCaching  = useMemo(() => sites.filter(s => !s.caching_plugin), [sites]);
  const missingCDN      = useMemo(() => sites.filter(s => !s.cdn_plugin), [sites]);
  const missingImgOpt   = useMemo(() => sites.filter(s => !s.image_optimization_plugin), [sites]);

  // Distribution pie
  const distPie = useMemo(() => [
    { name: "Fast (80+)",     value: goodCount,  color: "#16a34a" },
    { name: "Warning (50–79)", value: warnCount, color: "#f59e0b" },
    { name: "Slow (<50)",     value: poorCount,  color: "#ef4444" },
    { name: "Not audited",    value: notAudited, color: "#e2e8f0" },
  ].filter(d => d.value > 0), [goodCount, warnCount, poorCount, notAudited]);

  // Score buckets for histogram
  const buckets = useMemo(() => [
    { range: "0–20",  min: 0,  max: 20,  color: "#ef4444" },
    { range: "20–40", min: 20, max: 40,  color: "#f97316" },
    { range: "40–60", min: 40, max: 60,  color: "#eab308" },
    { range: "60–80", min: 60, max: 80,  color: "#22c55e" },
    { range: "80+",   min: 80, max: 101, color: "#16a34a" },
  ].map(b => ({
    ...b,
    count: audited.filter(s => s.latest_scores!.performance >= b.min && s.latest_scores!.performance < b.max).length,
  })), [audited]);

  // ── Filtered / sorted table ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let base = filter === "all" ? sites : sites.filter(s => healthBucket(s.latest_scores?.performance) === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(s => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
    }
    return [...base].sort((a: Site, b: Site) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortBy === "name")          { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === "performance") { va = a.latest_scores?.performance ?? -1; vb = b.latest_scores?.performance ?? -1; }
      else if (sortBy === "response") { va = a.avg_response_ms ?? 99999; vb = b.avg_response_ms ?? 99999; }
      else                            { va = a.last_audit_at ?? ""; vb = b.last_audit_at ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sites, filter, search, sortBy, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  const th = "px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors";

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (error)   return <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>;
  if (sites.length === 0) return <EmptyState icon={<Zap size={22} />} title="No sites yet" description="Add your first site to start tracking performance metrics." />;

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">Intelligence</p>
          <h1 className="text-2xl font-bold text-foreground">Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Speed, caching, and Core Web Vitals across all {sites.length} site{sites.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-2 mt-1 text-xs text-muted-foreground bg-white border border-border rounded-full px-3 py-1.5 shadow-xs">
          <Activity size={11} className="text-accent" />
          {audited.length} of {sites.length} sites audited
        </span>
      </div>

      {/* ── 4 Metric cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Avg Performance Score"
          value={avgScore}
          unit="/100"
          sub={avgLabel}
          color={avgColor}
          icon={Zap}
          progress={avgScore ?? 0}
        />
        <MetricCard
          label="Avg Server Response Time"
          value={avgResponse}
          unit="ms"
          sub={responseLabel}
          color={responseColor}
          icon={Activity}
          progress={avgResponse != null ? Math.max(0, 100 - (avgResponse / 20)) : 0}
        />
        <MetricCard
          label="Sites with Page Caching"
          value={cachingCount}
          unit={`/ ${total}`}
          sub={`${Math.round(cachingCount / Math.max(total, 1) * 100)}% adoption`}
          color={cachingCount / Math.max(total, 1) >= 0.7 ? "#16a34a" : "#d97706"}
          icon={Server}
          progress={Math.round(cachingCount / Math.max(total, 1) * 100)}
        />
        <MetricCard
          label="Tech Stack Health Score"
          value={techHealth}
          unit="%"
          sub="Caching · CDN · ImgOpt · ObjCache"
          color={techColor}
          icon={ShieldCheck}
          progress={techHealth}
        />
      </div>

      {/* ── Scatter Chart: Response Time vs Score ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Response Time vs Performance Score</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each dot is a site — ideal zone is top-left (fast response + high score)
            </p>
          </div>
          <div className="hidden sm:grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-100 border border-green-300 inline-block" />Optimized</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-100 border border-amber-300 inline-block" />Partial</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-50 border border-blue-200 inline-block" />Fast server</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-50 border border-red-200 inline-block" />Needs work</span>
          </div>
        </div>
        {scatterData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Activity size={24} />
            <p className="text-xs">Run audits and enable uptime monitoring to see this chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 24, right: 32, left: 0, bottom: 24 }}>
              {/* Quadrant backgrounds */}
              <ReferenceArea x1={0} x2={500} y1={80} y2={100} fill="#dcfce7" fillOpacity={0.5} />
              <ReferenceArea x1={500} x2={maxResponse} y1={80} y2={100} fill="#fef3c7" fillOpacity={0.4} />
              <ReferenceArea x1={0} x2={500} y1={0} y2={80} fill="#dbeafe" fillOpacity={0.3} />
              <ReferenceArea x1={500} x2={maxResponse} y1={0} y2={80} fill="#fee2e2" fillOpacity={0.4} />

              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                type="number" dataKey="x" name="Response Time"
                domain={[0, maxResponse]}
                tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                label={{ value: "Server Response Time (ms)", position: "insideBottom", offset: -12, fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={v => `${v}ms`}
              />
              <YAxis
                type="number" dataKey="y" name="Performance Score"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                label={{ value: "Performance Score", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#9ca3af" }}
              />
              {/* Threshold lines */}
              <ReferenceLine x={500} stroke="#d1d5db" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: "500ms", position: "top", fontSize: 9, fill: "#9ca3af" }} />
              <ReferenceLine y={80} stroke="#d1d5db" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: "80", position: "right", fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip content={<ScatterTip />} cursor={false} />
              <Scatter data={scatterData} shape={<ScatterDot />} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
        {/* Quadrant labels */}
        {scatterData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4 border-t border-border pt-4">
            {[
              { label: "Optimized", desc: "Fast server + high score", color: "#16a34a", bg: "bg-green-50" },
              { label: "High Score, Slow Server", desc: "Score is good but server is slow", color: "#d97706", bg: "bg-amber-50" },
              { label: "Fast Server, Low Score", desc: "Server is quick but page is heavy", color: "#0ea5e9", bg: "bg-blue-50" },
              { label: "Needs Attention", desc: "Slow server + low score", color: "#dc2626", bg: "bg-red-50" },
            ].map(q => (
              <div key={q.label} className={`flex items-start gap-2 p-2.5 rounded-lg ${q.bg}`}>
                <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: q.color }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: q.color }}>{q.label}</p>
                  <p className="text-[10px] text-muted-foreground">{q.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Score distribution + Histogram + Optimization ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Distribution donut */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Score Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Sites by performance health</p>
          {audited.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No audit data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={distPie} cx="50%" cy="50%"
                    innerRadius={44} outerRadius={64}
                    paddingAngle={distPie.length > 1 ? 3 : 0}
                    dataKey="value" strokeWidth={0}>
                    {distPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v) => [v, "sites"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {distPie.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.value / sites.length) * 100}%`, background: d.color }} />
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums w-4 text-right">{d.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Score histogram */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Score Buckets</h3>
          <p className="text-xs text-muted-foreground mb-4">Sites per 20-point score range</p>
          {audited.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No audit data</div>
          ) : (
            <ResponsiveContainer width="100%" height={186}>
              <BarChart data={buckets} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v) => [v, "sites"]}
                  labelFormatter={(l) => `Score range: ${l}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Optimization opportunities */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Optimization Gaps</h3>
          <p className="text-xs text-muted-foreground mb-4">Missing performance technologies</p>
          <div className="space-y-3">
            {[
              { label: "Page Caching",    missing: missingCaching,  icon: Server,    color: "#1f5fb8" },
              { label: "CDN",             missing: missingCDN,      icon: Globe,     color: "#0ea5e9" },
              { label: "Image Optimizer", missing: missingImgOpt,   icon: ImageIcon, color: "#10b981" },
            ].map(({ label, missing, icon: Icon, color }) => {
              const pct = total > 0 ? Math.round(((total - missing.length) / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} style={{ color }} />
                      <span className="text-xs font-medium text-foreground">{label}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>
                      {total - missing.length}/{total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  {missing.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {missing.slice(0, 2).map(s => s.name).join(", ")}
                      {missing.length > 2 && ` +${missing.length - 2} more`} missing
                    </p>
                  )}
                </div>
              );
            })}

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Database size={12} className="text-amber-500" />
                <span className="text-xs font-medium text-foreground">Object Cache</span>
                <span className="ml-auto text-xs font-bold text-amber-500 tabular-nums">{objCacheCount}/{total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${total > 0 ? (objCacheCount / total) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tech Stack Matrix ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Tech Stack Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Performance technology adoption per site</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />Not detected</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/70 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Site</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Zap size={10} />Score</span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Activity size={10} />Response</span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Server size={10} />Caching</span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Globe size={10} />CDN</span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><ImageIcon size={10} />Img Opt</span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Database size={10} />Obj Cache</span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Wifi size={10} />Uptime</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sites.map(site => {
                const score = site.latest_scores?.performance;
                const hex   = score != null ? scoreHex(score) : "#9ca3af";
                const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                const techCount = [
                  !!site.caching_plugin, !!site.cdn_plugin,
                  !!site.image_optimization_plugin, site.object_cache_enabled === true
                ].filter(Boolean).length;
                return (
                  <tr key={site.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: hex }}>{initials}</div>
                        <div className="min-w-0">
                          <Link href={`/sites/${site.id}?tab=performance`}
                            className="text-xs font-semibold text-foreground hover:text-accent truncate block max-w-[140px] transition-colors">
                            {site.name}
                          </Link>
                          <span className="text-[10px] text-muted-foreground truncate block max-w-[140px]">
                            {site.url.replace(/^https?:\/\//, "")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {score != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums" style={{ color: hex }}>{score}</span>
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, background: hex }} />
                          </div>
                        </div>
                      ) : <span className="text-xs text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {site.avg_response_ms != null ? (
                        <span className={`text-xs font-semibold tabular-nums ${
                          site.avg_response_ms < 300 ? "text-green-600" : site.avg_response_ms < 800 ? "text-amber-500" : "text-red-500"
                        }`}>{site.avg_response_ms}ms</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3"><FeatureChip value={site.caching_plugin} /></td>
                    <td className="px-4 py-3"><FeatureChip value={site.cdn_plugin} /></td>
                    <td className="px-4 py-3"><FeatureChip value={site.image_optimization_plugin} /></td>
                    <td className="px-4 py-3"><FeatureChip value={site.object_cache_enabled ?? null} /></td>
                    <td className="px-4 py-3">
                      {site.uptime_status === "up" ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Online
                        </span>
                      ) : site.uptime_status === "down" ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Down
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary row */}
            <tfoot className="bg-gray-50/70 border-t-2 border-border">
              <tr>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coverage</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs font-bold" style={{ color: avgColor }}>{avgScore ?? "—"}/100</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs font-bold" style={{ color: responseColor }}>
                    {avgResponse != null ? `${avgResponse}ms` : "—"}
                  </span>
                </td>
                {[
                  { count: cachingCount, color: "#1f5fb8" },
                  { count: cdnCount, color: "#0ea5e9" },
                  { count: imgOptCount, color: "#10b981" },
                  { count: objCacheCount, color: "#f59e0b" },
                ].map((col, i) => (
                  <td key={i} className="px-4 py-2.5">
                    <span className="text-xs font-bold" style={{ color: col.color }}>{col.count}/{total}</span>
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <span className="text-xs font-bold text-green-600">
                    {sites.filter(s => s.uptime_status === "up").length}/{total}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Filter + search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1 shadow-xs flex-wrap">
          {filterTabs.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={["px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                filter === key ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-gray-50",
              ].join(" ")}
              style={filter === key ? { background: brandColor } : {}}>
              {label}
              {key !== "all" && (
                <span className={`ml-1.5 text-[10px] tabular-nums ${filter === key ? "opacity-80" : "opacity-50"}`}>
                  {sites.filter(s => healthBucket(s.latest_scores?.performance) === key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites…"
            className="pl-9 pr-3 py-2 text-sm bg-white border border-border rounded-xl outline-none focus:border-accent/40 transition w-56 shadow-xs" />
        </div>
      </div>

      {/* ── Detailed sites table ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Site Performance Details</p>
          <p className="text-xs text-muted-foreground">{filtered.length} site{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">No sites match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-gray-50/70">
                <tr>
                  <th className={th} onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1.5">Site <SortIcon col="name" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("performance")}>
                    <span className="flex items-center gap-1.5">Score <SortIcon col="performance" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("response")}>
                    <span className="flex items-center gap-1.5">Response <SortIcon col="response" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th}>Status</th>
                  <th className={th}>Caching</th>
                  <th className={th}>CDN</th>
                  <th className={th} onClick={() => toggleSort("last_scan")}>
                    <span className="flex items-center gap-1.5">Last Audit <SortIcon col="last_scan" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(site => {
                  const score = site.latest_scores?.performance;
                  const hex   = score != null ? scoreHex(score) : "#9ca3af";
                  const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <tr key={site.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: hex }}>{initials}</div>
                          <div className="min-w-0">
                            <Link href={`/sites/${site.id}?tab=performance`}
                              className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate block max-w-[180px]">
                              {site.name}
                            </Link>
                            <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
                              {site.url.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {score != null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tabular-nums w-8" style={{ color: hex }}>{score}</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${score}%`, background: hex }} />
                            </div>
                          </div>
                        ) : <span className="text-xs text-muted-foreground italic">No audit</span>}
                      </td>
                      <td className="px-4 py-3">
                        {site.avg_response_ms != null ? (
                          <span className={`text-xs font-semibold tabular-nums ${
                            site.avg_response_ms < 300 ? "text-green-600" : site.avg_response_ms < 800 ? "text-amber-500" : "text-red-500"
                          }`}>{site.avg_response_ms}ms</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {score != null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBgTailwind(score)}`}>
                            {score >= 80 ? "Fast" : score >= 50 ? "Warning" : "Slow"}
                          </span>
                        ) : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground font-medium">Not audited</span>}
                      </td>
                      <td className="px-4 py-3"><FeatureChip value={site.caching_plugin} /></td>
                      <td className="px-4 py-3"><FeatureChip value={site.cdn_plugin} /></td>
                      <td className="px-4 py-3">
                        {site.last_audit_at
                          ? <span className="text-xs text-muted-foreground">{new Date(site.last_audit_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/sites/${site.id}?tab=performance`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-accent inline-flex">
                          <ExternalLink size={13} />
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
