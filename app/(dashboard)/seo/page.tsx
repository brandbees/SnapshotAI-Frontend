"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertCircle, CheckCircle2, TrendingUp, Globe, Award, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreHex, scoreBgTailwind } from "@/lib/utils";
import type { Site } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "seo" | "last_scan";
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
  { key: "good",    label: "Good (80+)" },
  { key: "warning", label: "Warning (50–79)" },
  { key: "poor",    label: "Poor (<50)" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, dir }: { col: SortKey; sortBy: SortKey; dir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={11} className="text-muted-foreground/40" />;
  return dir === "asc"
    ? <ChevronUp size={11} className="text-accent" />
    : <ChevronDown size={11} className="text-accent" />;
}

// Large donut gauge
function ScoreRing({ score, color, size }: { score: number; color: string; size: number }) {
  const data = [{ v: score }, { v: 100 - score }];
  const ir = size * 0.34;
  const or = size * 0.46;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie data={data} cx={size / 2 - 2} cy={size / 2 - 2}
          innerRadius={ir} outerRadius={or}
          startAngle={90} endAngle={-270} dataKey="v" strokeWidth={0}>
          <Cell fill={color} />
          <Cell fill="#f1f5f9" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span style={{ fontSize: size * 0.22, color }} className="font-bold tabular-nums leading-none">{score}</span>
        <span className="text-muted-foreground mt-0.5" style={{ fontSize: size * 0.1 }}>/100</span>
      </div>
    </div>
  );
}

// Custom bar tooltip
function BarTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; score: number } }> }) {
  if (!active || !payload?.length) return null;
  const { fullName, score } = payload[0].payload;
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{fullName}</p>
      <p className="font-bold mt-0.5" style={{ color: color }}>Score: {score}/100</p>
    </div>
  );
}

// Custom pie tooltip
function PieTip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} site{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// Mini site row for performers panels
function SiteRow({ site, rank, showRank }: { site: Site; rank?: number; showRank?: boolean }) {
  const score = site.latest_scores!.seo;
  const hex = scoreHex(score);
  const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <Link
      href={`/sites/${site.id}?tab=seo`}
      className="flex items-center gap-3 py-2.5 -mx-4 px-4 hover:bg-gray-50 transition-colors rounded-xl group"
    >
      {showRank && (
        <span className="text-xs font-bold text-muted-foreground w-4 text-center shrink-0">{rank}</span>
      )}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ background: hex }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{site.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{site.url.replace(/^https?:\/\//, "")}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold tabular-nums" style={{ color: hex }}>{score}</span>
        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: hex }} />
        </div>
        <ExternalLink size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SeoPage() {
  const { sites, loading, error } = useSites();
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#1f5fb8";

  const [filter, setFilter]   = useState<FilterTab>("all");
  const [sortBy, setSortBy]   = useState<SortKey>("seo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch]   = useState("");

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const audited    = useMemo(() => sites.filter(s => s.latest_scores?.seo != null), [sites]);
  const notAudited = sites.length - audited.length;

  const avgScore = useMemo(() => {
    if (!audited.length) return null;
    return Math.round(audited.reduce((sum, s) => sum + s.latest_scores!.seo, 0) / audited.length);
  }, [audited]);

  const goodCount = useMemo(() => audited.filter(s => s.latest_scores!.seo >= 80).length, [audited]);
  const warnCount = useMemo(() => audited.filter(s => { const sc = s.latest_scores!.seo; return sc >= 50 && sc < 80; }).length, [audited]);
  const poorCount = useMemo(() => audited.filter(s => s.latest_scores!.seo < 50).length, [audited]);
  const goodPct   = audited.length > 0 ? Math.round(goodCount / audited.length * 100) : 0;

  const avgColor = avgScore != null ? scoreHex(avgScore) : "#9ca3af";
  const avgLabel = avgScore == null ? "No Data"
    : avgScore >= 80 ? "Excellent"
    : avgScore >= 60 ? "Good"
    : avgScore >= 40 ? "Needs Work"
    : "Poor";

  // Score bucket histogram
  const buckets = useMemo(() => [
    { range: "0–20",  min: 0,  max: 20,  color: "#ef4444" },
    { range: "20–40", min: 20, max: 40,  color: "#f97316" },
    { range: "40–60", min: 40, max: 60,  color: "#eab308" },
    { range: "60–80", min: 60, max: 80,  color: "#22c55e" },
    { range: "80+",   min: 80, max: 101, color: "#16a34a" },
  ].map(b => ({
    ...b,
    count: audited.filter(s => s.latest_scores!.seo >= b.min && s.latest_scores!.seo < b.max).length,
  })), [audited]);

  // Distribution pie data
  const distPie = useMemo(() => [
    { name: "Good (80+)",     value: goodCount,  color: "#16a34a" },
    { name: "Warning (50–79)", value: warnCount, color: "#f59e0b" },
    { name: "Poor (<50)",     value: poorCount,  color: "#ef4444" },
    { name: "Not audited",    value: notAudited, color: "#e2e8f0" },
  ].filter(d => d.value > 0), [goodCount, warnCount, poorCount, notAudited]);

  // Per-site bar data (all sites, sorted best first)
  const allBarData = useMemo(() =>
    [...audited]
      .sort((a, b) => b.latest_scores!.seo - a.latest_scores!.seo)
      .map(s => ({
        name: s.name.length > 20 ? s.name.slice(0, 18) + "…" : s.name,
        fullName: s.name,
        score: s.latest_scores!.seo,
        id: s.id,
      })),
  [audited]);

  // Top 5 + bottom 5
  const topSites    = useMemo(() => [...audited].sort((a, b) => b.latest_scores!.seo - a.latest_scores!.seo).slice(0, 5), [audited]);
  const bottomSites = useMemo(() => [...audited].filter(s => s.latest_scores!.seo < 80).sort((a, b) => a.latest_scores!.seo - b.latest_scores!.seo).slice(0, 5), [audited]);

  // ── Filtered / sorted table ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let base = filter === "all"
      ? sites
      : sites.filter(s => healthBucket(s.latest_scores?.seo) === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(s => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
    }
    return [...base].sort((a: Site, b: Site) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortBy === "name")     { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === "seo") { va = a.latest_scores?.seo ?? -1; vb = b.latest_scores?.seo ?? -1; }
      else                       { va = a.last_audit_at ?? ""; vb = b.last_audit_at ?? ""; }
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

  if (loading) return (
    <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
  );
  if (sites.length === 0) return (
    <EmptyState icon={<Search size={22} />} title="No sites yet" description="Add your first site to start monitoring SEO health." />
  );

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">Intelligence</p>
          <h1 className="text-2xl font-bold text-foreground">SEO Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search engine optimization health across all {sites.length} site{sites.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground bg-white border border-border rounded-full px-3 py-1.5 shadow-xs">
            {audited.length} of {sites.length} sites audited
          </span>
        </div>
      </div>

      {/* ── Hero overview card ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">

          {/* Left: big avg score donut */}
          <div className="md:col-span-2 flex flex-col items-center justify-center gap-3 p-8"
            style={{ background: `linear-gradient(135deg, ${avgColor}08 0%, transparent 70%)` }}>
            {avgScore != null ? (
              <>
                <ScoreRing score={avgScore} color={avgColor} size={160} />
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">Avg SEO Score</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: avgColor }}>{avgLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {audited.length} audited site{audited.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex items-center justify-center">
                  <Globe size={28} className="text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">No Audit Data</p>
                  <p className="text-xs text-muted-foreground mt-1">Run an audit to see SEO scores</p>
                </div>
              </>
            )}
          </div>

          {/* Right: 4 stat tiles */}
          <div className="md:col-span-3 grid grid-cols-2 gap-px bg-border">
            <div className="bg-white p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Good Sites</span>
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={13} className="text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold tabular-nums text-green-600">{goodCount}</p>
                <p className="text-xs text-green-500 font-medium mt-1">Score 80 or above</p>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${audited.length > 0 ? (goodCount / audited.length) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="bg-white p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Warning</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertCircle size={13} className="text-amber-500" />
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold tabular-nums text-amber-500">{warnCount}</p>
                <p className="text-xs text-amber-400 font-medium mt-1">Score 50–79</p>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${audited.length > 0 ? (warnCount / audited.length) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="bg-white p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Poor SEO</span>
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingUp size={13} className="text-red-500 rotate-180" />
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold tabular-nums text-red-500">{poorCount}</p>
                <p className="text-xs text-red-400 font-medium mt-1">Score below 50</p>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${audited.length > 0 ? (poorCount / audited.length) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="bg-white p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Healthy Rate</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${brandColor}15` }}>
                  <Zap size={13} style={{ color: brandColor }} />
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold tabular-nums" style={{ color: brandColor }}>{goodPct}%</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">Sites scoring 80+</p>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${goodPct}%`, background: brandColor }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts row: distribution + histogram ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Distribution donut with legend */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Score Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Sites by health status</p>
          {audited.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Run audits to see distribution</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={distPie} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72}
                    paddingAngle={distPie.length > 1 ? 3 : 0}
                    dataKey="value" strokeWidth={0}>
                    {distPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {distPie.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.value / sites.length) * 100}%`, background: d.color }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-foreground w-4 text-right">{d.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Score buckets histogram */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Score Ranges</h3>
          <p className="text-xs text-muted-foreground mb-4">Sites per score bracket</p>
          {audited.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No audit data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={buckets} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [v, "sites"]}
                  labelFormatter={(l) => `Range: ${l}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Insights panel */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Key Insights</h3>
          <div className="space-y-3">

            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shrink-0 shadow-xs">
                <Award size={14} style={{ color: brandColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {goodPct}% of sites are healthy
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {goodCount} site{goodCount !== 1 ? "s" : ""} scoring 80 or above
                </p>
              </div>
            </div>

            {topSites[0] && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50">
                <div className="w-8 h-8 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-xs">
                  <TrendingUp size={14} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Best: {topSites[0].name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Score <span className="font-bold text-green-600">{topSites[0].latest_scores!.seo}/100</span>
                  </p>
                </div>
              </div>
            )}

            {bottomSites[0] && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50">
                <div className="w-8 h-8 rounded-lg bg-white border border-red-200 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertCircle size={14} className="text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Needs Work: {bottomSites[0].name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Score <span className="font-bold text-red-600">{bottomSites[0].latest_scores!.seo}/100</span>
                  </p>
                </div>
              </div>
            )}

            {notAudited > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50">
                <div className="w-8 h-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                  <Globe size={14} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{notAudited} site{notAudited !== 1 ? "s" : ""} not audited</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Schedule an audit to get scores</p>
                </div>
              </div>
            )}

            {poorCount === 0 && audited.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50">
                <div className="w-8 h-8 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">No critical issues!</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">All sites score above 50</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Full-width per-site comparison bar chart ── */}
      {audited.length > 0 && (
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Site-by-Site SEO Comparison</h3>
              <p className="text-xs text-muted-foreground">All {audited.length} audited sites ranked by score</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Good 80+</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Warning 50–79</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Poor &lt;50</span>
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={Math.max(allBarData.length * 42, 120)}>
              <BarChart data={allBarData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  ticks={[0, 20, 40, 50, 60, 80, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<BarTip />} cursor={{ fill: "#f8fafc" }} />
                {/* Reference line at 80 */}
                <Bar dataKey="score" radius={[0, 5, 5, 0]} maxBarSize={22}
                  label={{ position: "right", fontSize: 11, fontWeight: 700, formatter: (v: unknown) => String(v) }}>
                  {allBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 80 ? "#16a34a" : entry.score >= 50 ? "#d97706" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Top performers + Needs attention (2-col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top performers */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <Award size={13} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top Performers</h3>
              <p className="text-[11px] text-muted-foreground">Highest SEO scores</p>
            </div>
          </div>
          {topSites.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Run audits to see top performers</div>
          ) : (
            <div>
              {topSites.map((site, i) => (
                <SiteRow key={site.id} site={site} rank={i + 1} showRank />
              ))}
            </div>
          )}
        </div>

        {/* Needs attention */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle size={13} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Needs Attention</h3>
                <p className="text-[11px] text-muted-foreground">Lowest scoring sites</p>
              </div>
            </div>
            {poorCount > 0 && (
              <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded-full">
                {poorCount} critical
              </span>
            )}
          </div>
          {bottomSites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={20} className="text-green-500" />
              <p className="text-xs text-muted-foreground">
                {audited.length === 0 ? "Run audits to see site health" : "All sites have good SEO!"}
              </p>
            </div>
          ) : (
            <div>
              {bottomSites.map((site, i) => (
                <SiteRow key={site.id} site={site} rank={i + 1} showRank />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter + search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1 shadow-xs flex-wrap">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                filter === key
                  ? "text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-50",
              ].join(" ")}
              style={filter === key ? { background: brandColor } : {}}
            >
              {label}
              {key !== "all" && (
                <span className={`ml-1.5 text-[10px] tabular-nums ${filter === key ? "opacity-80" : "opacity-50"}`}>
                  {sites.filter(s => healthBucket(s.latest_scores?.seo) === key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites…"
            className="pl-9 pr-3 py-2 text-sm bg-white border border-border rounded-xl outline-none focus:border-accent/40 transition w-56 shadow-xs"
          />
        </div>
      </div>

      {/* ── Sites table ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">All Sites</p>
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
                  <th className={th} onClick={() => toggleSort("seo")}>
                    <span className="flex items-center gap-1.5">SEO Score <SortIcon col="seo" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th}>Status</th>
                  <th className={th}>Uptime</th>
                  <th className={th} onClick={() => toggleSort("last_scan")}>
                    <span className="flex items-center gap-1.5">Last Audit <SortIcon col="last_scan" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((site) => {
                  const score = site.latest_scores?.seo;
                  const hex   = score != null ? scoreHex(score) : "#9ca3af";
                  const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <tr key={site.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: hex }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/sites/${site.id}?tab=seo`}
                              className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate block max-w-[180px]"
                            >
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
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold tabular-nums w-8" style={{ color: hex }}>{score}</span>
                            <div className="flex-1 max-w-[80px] h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: hex }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No audit</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {score != null ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBgTailwind(score)}`}>
                            {score >= 80 ? "Good" : score >= 50 ? "Warning" : "Poor"}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-muted-foreground font-medium">
                            Not audited
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {site.uptime_status === "up" ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
                            Online
                          </span>
                        ) : site.uptime_status === "down" ? (
                          <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            Down
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {site.last_audit_at ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(site.last_audit_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sites/${site.id}?tab=seo`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-accent inline-flex"
                        >
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
