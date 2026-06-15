"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { BarChart2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

interface PlanScore {
  plan: string; audit_count: number;
  avg_overall: number; avg_performance: number; avg_seo: number;
  avg_security: number; avg_malware: number;
}
interface TrendPoint { month: string; avg_overall: number; avg_performance: number; avg_seo: number; avg_security: number; audit_count: number; }
interface SiteRank { id: string; url: string; name: string; agency_name: string; plan: string; overall_score: number; }
interface DistBucket { bucket: string; count: number; }
interface VolumePoint { week: string; total: number; completed: number; failed: number; }
interface Stats {
  total_audits: number; completed: number; failed: number; in_progress: number;
  platform_avg_score: number; sites_audited: number; agencies_with_audits: number;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8", freemium: "#3b82f6", premium: "#8b5cf6",
  agency: "#64748b", agency_plus: "#f59e0b",
};
const BUCKET_COLORS: Record<string, string> = {
  "Excellent (90–100)": "#22c55e",
  "Good (75–89)":       "#84cc16",
  "Needs work (50–74)": "#eab308",
  "Poor (<50)":         "#ef4444",
};

function planLabel(p: string) {
  const MAP: Record<string, string> = { free: "Free", freemium: "Starter", premium: "Growth", agency: "Agency", agency_plus: "Agency+" };
  return MAP[p] ?? p;
}
function scoreColor(s: number) {
  if (s >= 90) return "#22c55e"; if (s >= 75) return "#84cc16"; if (s >= 50) return "#eab308"; return "#ef4444";
}

export default function InsightsPage() {
  const [planScores,   setPlanScores]   = useState<PlanScore[]>([]);
  const [trend,        setTrend]        = useState<TrendPoint[]>([]);
  const [topSites,     setTopSites]     = useState<SiteRank[]>([]);
  const [bottomSites,  setBottomSites]  = useState<SiteRank[]>([]);
  const [dist,         setDist]         = useState<DistBucket[]>([]);
  const [volume,       setVolume]       = useState<VolumePoint[]>([]);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/insights");
      setPlanScores(data.plan_scores);
      setTrend(data.score_trend);
      setTopSites(data.top_sites);
      setBottomSites(data.bottom_sites);
      setDist(data.score_distribution);
      setVolume(data.audit_volume);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <BarChart2 size={20} style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Audit Insights</h1>
              <p className="text-sm text-muted-foreground">
                {stats ? `${stats.completed.toLocaleString()} completed audits across ${stats.sites_audited} sites` : "Platform-wide audit analytics"}
              </p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Platform Avg Score", value: stats.platform_avg_score ?? "—", color: scoreColor(stats.platform_avg_score ?? 0) },
            { label: "Total Audits",       value: stats.total_audits.toLocaleString(),   color: "#6366f1" },
            { label: "Sites Audited",      value: stats.sites_audited.toLocaleString(),  color: "#8b5cf6" },
            { label: "Failed",             value: stats.failed.toLocaleString(),         color: "#ef4444" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Score trend */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <p className="text-sm font-bold text-foreground mb-1">Platform Score Trend</p>
        <p className="text-xs text-muted-foreground mb-4">Monthly average scores — last 12 months</p>
        {loading ? (
          <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
        ) : trend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="insightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="avg_overall"     stroke="#8b5cf6" strokeWidth={2} fill="url(#insightGrad)" dot={false} name="Overall" />
              <Area type="monotone" dataKey="avg_performance" stroke="#3b82f6" strokeWidth={1.5} fill="none" dot={false} name="Performance" />
              <Area type="monotone" dataKey="avg_seo"         stroke="#10b981" strokeWidth={1.5} fill="none" dot={false} name="SEO" />
              <Area type="monotone" dataKey="avg_security"    stroke="#f59e0b" strokeWidth={1.5} fill="none" dot={false} name="Security" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scores by plan */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">Average Score by Plan</p>
          {loading ? <div className="h-40 bg-gray-50 rounded-xl animate-pulse" /> : planScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-3">
              {planScores.map(p => (
                <div key={p.plan} className="flex items-center gap-4">
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${PLAN_COLORS[p.plan] ?? "#64748b"}15`, color: PLAN_COLORS[p.plan] ?? "#64748b" }}>
                      {planLabel(p.plan)}
                    </span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.avg_overall}%`, background: scoreColor(p.avg_overall) }} />
                  </div>
                  <span className="text-sm font-bold w-8 text-right" style={{ color: scoreColor(p.avg_overall) }}>{p.avg_overall}</span>
                  <span className="text-xs text-muted-foreground w-20 text-right">{p.audit_count} audits</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribution */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">Score Distribution</p>
          {loading ? <div className="h-40 bg-gray-50 rounded-xl animate-pulse" /> : dist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dist} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={b => b.split(" ")[0]} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {dist.map(d => <Cell key={d.bucket} fill={BUCKET_COLORS[d.bucket] ?? "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Audit volume */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <p className="text-sm font-bold text-foreground mb-4">Weekly Audit Volume — Last 12 weeks</p>
        {loading ? <div className="h-36 bg-gray-50 rounded-xl animate-pulse" /> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={volume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
              <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="failed"    name="Failed"    fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top & bottom sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: "Top 10 Sites", sites: topSites, icon: TrendingUp, iconColor: "#22c55e" },
          { title: "Bottom 10 Sites", sites: bottomSites, icon: TrendingDown, iconColor: "#ef4444" },
        ].map(({ title, sites, icon: Icon, iconColor }) => (
          <div key={title} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon size={15} style={{ color: iconColor }} />
              <p className="text-sm font-bold text-foreground">{title}</p>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
              ) : sites.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No data</div>
              ) : sites.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-muted-foreground flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name || s.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.agency_name}</p>
                  </div>
                  <span className="text-sm font-bold w-8 text-right" style={{ color: scoreColor(s.overall_score) }}>{s.overall_score}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
