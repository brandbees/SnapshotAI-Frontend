"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertCircle, CheckCircle2, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreHex, scoreColor, scoreBgTailwind } from "@/lib/utils";
import type { Site } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "seo" | "last_scan";
type SortDir = "asc" | "desc";
type FilterTab = "all" | "good" | "warning" | "poor";

function healthBucket(score: number | undefined | null): FilterTab {
  if (score == null) return "poor";
  if (score >= 80) return "good";
  if (score >= 50) return "warning";
  return "poor";
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "good",    label: "Good (80+)" },
  { key: "warning", label: "Warning (50–79)" },
  { key: "poor",    label: "Poor (<50)" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, dir }: { col: SortKey; sortBy: SortKey; dir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={12} className="text-muted-foreground/50" />;
  return dir === "asc"
    ? <ChevronUp size={12} className="text-accent" />
    : <ChevronDown size={12} className="text-accent" />;
}

function AvgScoreDonut({ score, color }: { score: number; color: string }) {
  const data = [{ v: score }, { v: 100 - score }];
  return (
    <div className="relative" style={{ width: 120, height: 120 }}>
      <PieChart width={120} height={120}>
        <Pie
          data={data}
          cx={56} cy={56}
          innerRadius={40} outerRadius={54}
          startAngle={90} endAngle={-270}
          dataKey="v"
          strokeWidth={0}
        >
          <Cell fill={color} />
          <Cell fill="#f3f4f6" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SeoPage() {
  const { sites, loading, error } = useSites();
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#6366f1";

  const [filter, setFilter]   = useState<FilterTab>("all");
  const [sortBy, setSortBy]   = useState<SortKey>("seo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch]   = useState("");

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const audited = useMemo(() => sites.filter((s) => s.latest_scores?.seo != null), [sites]);

  const avgScore = useMemo(() => {
    if (!audited.length) return null;
    return Math.round(audited.reduce((sum, s) => sum + s.latest_scores!.seo, 0) / audited.length);
  }, [audited]);

  const goodCount = useMemo(() => audited.filter((s) => s.latest_scores!.seo >= 80).length, [audited]);
  const warnCount = useMemo(() => audited.filter((s) => { const sc = s.latest_scores!.seo; return sc >= 50 && sc < 80; }).length, [audited]);
  const poorCount = useMemo(() => audited.filter((s) => s.latest_scores!.seo < 50).length, [audited]);
  const notAudited = sites.length - audited.length;

  const avgColor = avgScore != null ? scoreHex(avgScore) : "#9ca3af";
  const avgLabel = avgScore == null ? "No Data"
    : avgScore >= 80 ? "Excellent"
    : avgScore >= 60 ? "Good"
    : avgScore >= 40 ? "Needs Work"
    : "Poor";

  // Horizontal bar chart — top 10 by score desc
  const barData = useMemo(() =>
    [...audited]
      .sort((a, b) => b.latest_scores!.seo - a.latest_scores!.seo)
      .slice(0, 10)
      .map((s) => ({
        name: s.name.length > 18 ? s.name.slice(0, 16) + "…" : s.name,
        score: s.latest_scores!.seo,
        id: s.id,
      })),
  [audited]);

  // Sites needing attention (score < 80, sorted worst first)
  const attentionSites = useMemo(() =>
    [...audited]
      .filter((s) => s.latest_scores!.seo < 80)
      .sort((a, b) => a.latest_scores!.seo - b.latest_scores!.seo)
      .slice(0, 6),
  [audited]);

  // ── Filtered / sorted table ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let base = filter === "all"
      ? sites
      : sites.filter((s) => healthBucket(s.latest_scores?.seo) === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((s) => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
    }
    return [...base].sort((a: Site, b: Site) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortBy === "name")      { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === "seo")  { va = a.latest_scores?.seo ?? -1; vb = b.latest_scores?.seo ?? -1; }
      else                        { va = a.last_audit_at ?? ""; vb = b.last_audit_at ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sites, filter, search, sortBy, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  }

  const th = "px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-surface">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          Intelligence
        </p>
        <h1 className="text-2xl font-bold text-foreground">SEO</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search engine optimization issues and recommendations across all sites.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && sites.length === 0 && (
          <EmptyState
            icon={<Search size={22} />}
            title="No sites yet"
            description="Add your first site to start monitoring SEO health."
          />
        )}

        {!loading && !error && sites.length > 0 && (
          <>
            {/* ── Top 3 stat cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Avg SEO Score donut */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-1">
                {avgScore != null ? (
                  <>
                    <AvgScoreDonut score={avgScore} color={avgColor} />
                    <p className="text-sm font-semibold text-foreground mt-1">Avg SEO Score</p>
                    <p className="text-xs font-semibold" style={{ color: avgColor }}>{avgLabel}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Across {audited.length} audited site{audited.length !== 1 ? "s" : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-full border-4 border-gray-100 flex items-center justify-center">
                      <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">No<br/>data yet</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-2">Avg SEO Score</p>
                    <p className="text-xs text-muted-foreground">Run audits to see scores</p>
                  </>
                )}
              </div>

              {/* Health Distribution */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <p className="text-xs font-medium text-muted-foreground mb-3">Health Distribution</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center bg-green-50 rounded-xl py-3">
                    <span className="text-2xl font-bold text-green-600 tabular-nums">{goodCount}</span>
                    <span className="text-[10px] text-green-500 font-medium mt-0.5">Good</span>
                  </div>
                  <div className="flex flex-col items-center bg-amber-50 rounded-xl py-3">
                    <span className="text-2xl font-bold text-amber-500 tabular-nums">{warnCount}</span>
                    <span className="text-[10px] text-amber-400 font-medium mt-0.5">Warning</span>
                  </div>
                  <div className="flex flex-col items-center bg-red-50 rounded-xl py-3">
                    <span className="text-2xl font-bold text-red-500 tabular-nums">{poorCount}</span>
                    <span className="text-[10px] text-red-400 font-medium mt-0.5">Poor</span>
                  </div>
                </div>
                {/* Stacked distribution bar */}
                {audited.length > 0 && (
                  <div className="mt-4 flex gap-0.5 h-2 rounded-full overflow-hidden bg-gray-100">
                    {goodCount > 0 && (
                      <div className="bg-green-500" style={{ flex: goodCount }} />
                    )}
                    {warnCount > 0 && (
                      <div className="bg-amber-400" style={{ flex: warnCount }} />
                    )}
                    {poorCount > 0 && (
                      <div className="bg-red-500" style={{ flex: poorCount }} />
                    )}
                    {notAudited > 0 && (
                      <div className="bg-gray-200" style={{ flex: notAudited }} />
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {notAudited > 0
                    ? `${notAudited} site${notAudited !== 1 ? "s" : ""} not yet audited`
                    : "All sites have been audited"}
                </p>
              </div>

              {/* SEO Coverage */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">SEO Coverage</p>
                <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
                  {audited.length}
                  <span className="text-sm font-normal text-muted-foreground"> / {sites.length} sites</span>
                </p>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${sites.length > 0 ? (audited.length / sites.length) * 100 : 0}%`,
                      background: brandColor,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {audited.length === sites.length
                    ? "All sites audited"
                    : `${notAudited} site${notAudited !== 1 ? "s" : ""} need${notAudited === 1 ? "s" : ""} an audit`}
                </p>
                {poorCount > 0 && (
                  <p className="text-xs font-semibold text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {poorCount} site{poorCount !== 1 ? "s" : ""} need immediate attention
                  </p>
                )}
              </div>
            </div>

            {/* ── Middle: Score comparison + Attention list ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Horizontal bar chart — score per site */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-semibold text-foreground">SEO Score by Site</h3>
                  {audited.length > 10 && (
                    <span className="text-[10px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                      Top 10 shown
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">Current scores, sorted best to worst</p>
                {audited.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <TrendingUp size={20} />
                    <p className="text-xs">Run audits to see score comparison</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(barData.length * 32, 120)}>
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                        formatter={(v) => [`${v}/100`, "SEO Score"]}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {barData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.score >= 80 ? "#16a34a" : entry.score >= 50 ? "#d97706" : "#dc2626"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Sites Needing Attention */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Sites Needing Attention</h3>
                  {poorCount > 0 && (
                    <span className="text-xs bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                      {poorCount} critical
                    </span>
                  )}
                </div>

                {attentionSites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <CheckCircle2 size={24} className="text-green-500" />
                    <p className="text-xs text-muted-foreground text-center">
                      {audited.length === 0
                        ? "Run audits to see site health"
                        : "All audited sites have good SEO scores!"}
                    </p>
                  </div>
                ) : (
                  <div>
                    {attentionSites.map((site) => {
                      const sc = site.latest_scores!.seo;
                      const isCritical = sc < 50;
                      return (
                        <Link
                          key={site.id}
                          href={`/sites/${site.id}?tab=seo`}
                          className="flex items-center justify-between py-2.5 border-b border-border last:border-0 -mx-5 px-5 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AlertCircle
                              size={14}
                              className={`shrink-0 ${isCritical ? "text-red-500" : "text-amber-500"}`}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate leading-tight">{site.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {site.url.replace(/^https?:\/\//, "")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                              isCritical ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                            }`}>
                              {sc}
                            </span>
                            <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      );
                    })}
                    {attentionSites.length === 6 && (audited.filter(s => s.latest_scores!.seo < 80).length > 6) && (
                      <p className="text-[11px] text-muted-foreground text-center pt-3">
                        + {audited.filter(s => s.latest_scores!.seo < 80).length - 6} more — use the table below
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Filter tabs + search ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1 flex-wrap">
                {filterTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={[
                      "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                      filter === key
                        ? "bg-surface text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {label}
                    {key !== "all" && (
                      <span className="ml-1.5 text-[10px] tabular-nums opacity-60">
                        {sites.filter((s) => healthBucket(s.latest_scores?.seo) === key).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative sm:ml-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sites…"
                  className="pl-9 pr-3 py-2 text-sm bg-white border border-border rounded-xl outline-none focus:ring-2 transition w-56"
                  style={{ "--tw-ring-color": `${brandColor}33` } as React.CSSProperties}
                />
              </div>
            </div>

            {/* ── Sites table ── */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No sites match your filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-gray-50/60">
                      <tr>
                        <th className={th} onClick={() => toggleSort("name")}>
                          <span className="flex items-center gap-1.5">
                            Site <SortIcon col="name" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th className={th} onClick={() => toggleSort("seo")}>
                          <span className="flex items-center gap-1.5">
                            SEO Score <SortIcon col="seo" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th className={th}>Status</th>
                        <th className={th}>Uptime</th>
                        <th className={th} onClick={() => toggleSort("last_scan")}>
                          <span className="flex items-center gap-1.5">
                            Last Audit <SortIcon col="last_scan" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th className="px-4 py-3 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((site) => {
                        const score = site.latest_scores?.seo;
                        const hex = score != null ? scoreHex(score) : "#9ca3af";
                        return (
                          <tr key={site.id} className="hover:bg-gray-50/60 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/sites/${site.id}?tab=seo`}
                                  className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate block max-w-[200px]"
                                >
                                  {site.name}
                                </Link>
                                <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                                  {site.url.replace(/^https?:\/\//, "")}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {score != null ? (
                                <div className="flex items-center gap-2.5">
                                  <span className="text-sm font-bold tabular-nums w-8" style={{ color: hex }}>
                                    {score}
                                  </span>
                                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${score}%`, background: hex }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No audit</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {score != null ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBgTailwind(score)}`}>
                                  {score >= 80 ? "Good" : score >= 50 ? "Warning" : "Poor"}
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground font-medium">
                                  Not audited
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {site.uptime_status === "up" ? (
                                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
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
                                  {new Date(site.last_audit_at).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "2-digit",
                                  })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/sites/${site.id}?tab=seo`}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent"
                              >
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
          </>
        )}
      </div>
    </div>
  );
}
