"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity, CheckCircle2, ExternalLink,
  Search, ChevronUp, ChevronDown, ChevronsUpDown, Wifi, WifiOff,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, PieChart, Pie,
} from "recharts";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Site } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function responseColor(ms: number | undefined | null): string {
  if (ms == null) return "#9ca3af";
  if (ms < 300)   return "#16a34a";
  if (ms < 700)   return "#d97706";
  return "#dc2626";
}

function responseLabel(ms: number | undefined | null): string {
  if (ms == null) return "Unknown";
  if (ms < 300)   return "Excellent";
  if (ms < 700)   return "Good";
  if (ms < 1200)  return "Slow";
  return "Critical";
}

function uptimeColor(pct: number | undefined | null): string {
  if (pct == null) return "#9ca3af";
  if (pct >= 99.5) return "#16a34a";
  if (pct >= 98)   return "#d97706";
  return "#dc2626";
}

function uptimeLabel(pct: number | undefined | null): string {
  if (pct == null) return "—";
  if (pct >= 99.9) return "Excellent";
  if (pct >= 99)   return "Good";
  if (pct >= 95)   return "Fair";
  return "Poor";
}

type SortKey = "name" | "uptime" | "response" | "status";
type SortDir  = "asc" | "desc";
type FilterTab = "all" | "up" | "down" | "unknown";

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, dir }: { col: SortKey; sortBy: SortKey; dir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={11} className="text-muted-foreground/40" />;
  return dir === "asc" ? <ChevronUp size={11} className="text-accent" /> : <ChevronDown size={11} className="text-accent" />;
}

function LiveDot({ status }: { status: Site["uptime_status"] }) {
  if (status === "up") {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
    );
  }
  if (status === "down") {
    return <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-gray-300 shrink-0" />;
}

function SiteUptimeCard({ site }: { site: Site }) {
  const isUp   = site.uptime_status === "up";
  const isDown = site.uptime_status === "down";

  const uptime     = site.uptime_percentage;
  const response   = site.avg_response_ms;
  const uColor     = uptimeColor(uptime);
  const rColor     = responseColor(response);
  const initials   = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const cardShadow = isDown    ? "shadow-status-red hover:shadow-status-red"
                   : isUp      ? "shadow-status-green hover:shadow-status-green"
                   : "shadow-status-gray hover:shadow-elevated-md";
  const cardBg     = isDown    ? "bg-red-50/50"
                   : isUp      ? "bg-white"
                   : "bg-muted/20";

  return (
    <Link href={`/sites/${site.id}`}>
      <div className={`rounded-2xl ${cardShadow} ${cardBg} p-4 transition-all duration-base hover:-translate-y-0.5 group`}>
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: uColor }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate max-w-[110px] group-hover:text-accent transition-colors leading-tight">
                {site.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                {site.url.replace(/^https?:\/\//, "")}
              </p>
            </div>
          </div>
          <LiveDot status={site.uptime_status} />
        </div>

        {/* Uptime % — big number */}
        <div className="mb-3">
          {uptime != null ? (
            <>
              <p className="text-3xl font-black tabular-nums leading-none" style={{ color: uColor }}>
                {uptime.toFixed(1)}<span className="text-base font-semibold text-muted-foreground">%</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{uptimeLabel(uptime)} uptime</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground font-medium">Not monitored</p>
          )}
        </div>

        {/* Response time + status badge */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          {response != null ? (
            <span className="text-xs font-bold tabular-nums flex items-center gap-1"
              style={{ color: rColor }}>
              <Activity size={10} />
              {response}ms
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">— ms</span>
          )}
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
            isDown    ? "bg-red-100 text-red-600"
            : isUp    ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-muted-foreground"
          }`}>
            {isDown ? "DOWN" : isUp ? "UP" : "UNKNOWN"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Response time bar tooltip
interface BarEntry { name: string; ms: number; label: string }
function ResponseTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BarEntry }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = responseColor(d.ms);
  return (
    <div className="bg-white border border-border rounded-xl p-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-bold text-foreground text-sm mb-1.5 truncate">{d.name}</p>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Response</span>
        <span className="font-bold tabular-nums" style={{ color }}>{d.ms}ms</span>
      </div>
      <p className="mt-1" style={{ color }}>{d.label}</p>
    </div>
  );
}

function PieTip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <span className="font-semibold text-foreground">{payload[0].name}</span>
      <span className="ml-2 text-muted-foreground">{payload[0].value} site{payload[0].value !== 1 ? "s" : ""}</span>
    </div>
  );
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all",     label: "All Sites" },
  { key: "up",      label: "Online" },
  { key: "down",    label: "Down" },
  { key: "unknown", label: "Unknown" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UptimePage() {
  const { sites, loading, error } = useSites();
  const { agency } = useAuth();
  const brandColor = agency?.accent_color ?? "#1f5fb8";

  const [filter, setFilter]   = useState<FilterTab>("all");
  const [sortBy, setSortBy]   = useState<SortKey>("uptime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch]   = useState("");

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const upSites      = useMemo(() => sites.filter(s => s.uptime_status === "up"), [sites]);
  const downSites    = useMemo(() => sites.filter(s => s.uptime_status === "down"), [sites]);
  const unknownSites = useMemo(() => sites.filter(s => s.uptime_status === "unknown" || !s.uptime_status), [sites]);

  const withUptime   = useMemo(() => sites.filter(s => s.uptime_percentage != null), [sites]);
  const withResponse = useMemo(() => sites.filter(s => s.avg_response_ms != null), [sites]);

  const avgUptime = useMemo(() => {
    if (!withUptime.length) return null;
    return withUptime.reduce((sum, s) => sum + (s.uptime_percentage ?? 0), 0) / withUptime.length;
  }, [withUptime]);

  const avgResponse = useMemo(() => {
    if (!withResponse.length) return null;
    return Math.round(withResponse.reduce((sum, s) => sum + (s.avg_response_ms ?? 0), 0) / withResponse.length);
  }, [withResponse]);

  const allOperational = downSites.length === 0 && unknownSites.length === 0 && upSites.length > 0;

  // Response time bar chart data (sorted: fastest first)
  const responseBarData = useMemo(() =>
    [...withResponse]
      .sort((a, b) => (a.avg_response_ms ?? 0) - (b.avg_response_ms ?? 0))
      .map(s => ({
        name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
        fullName: s.name,
        ms: s.avg_response_ms!,
        label: responseLabel(s.avg_response_ms),
        id: s.id,
      })),
  [withResponse]);

  // Uptime distribution donut
  const distPie = useMemo(() => [
    { name: "Online",  value: upSites.length,      color: "#16a34a" },
    { name: "Down",    value: downSites.length,     color: "#dc2626" },
    { name: "Unknown", value: unknownSites.length,  color: "#e2e8f0" },
  ].filter(d => d.value > 0), [upSites, downSites, unknownSites]);

  // ── Filtered / sorted table ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let base: Site[] =
      filter === "all"     ? sites
      : filter === "up"    ? upSites
      : filter === "down"  ? downSites
      :                      unknownSites;

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(s => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
    }

    return [...base].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortBy === "name")     { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === "uptime")   { va = a.uptime_percentage ?? -1; vb = b.uptime_percentage ?? -1; }
      else if (sortBy === "response") { va = a.avg_response_ms ?? 99999; vb = b.avg_response_ms ?? 99999; }
      else {
        const rank = (s: Site) => s.uptime_status === "down" ? 0 : s.uptime_status === "up" ? 1 : 2;
        va = rank(a); vb = rank(b);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sites, upSites, downSites, unknownSites, filter, search, sortBy, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir(col === "response" ? "asc" : "desc"); }
  }

  const th  = "px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors";
  const thC = th + " text-center";

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (error)   return <div className="bg-red-50 shadow-status-red rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>;
  if (sites.length === 0) return <EmptyState icon={<Activity size={22} />} title="No sites yet" description="Add your first site to start monitoring uptime." />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">Intelligence</p>
          <h1 className="text-2xl font-bold text-foreground">Uptime</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Availability and response time monitoring across all {sites.length} site{sites.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-2 mt-1 text-xs text-muted-foreground bg-white border border-border rounded-full px-3 py-1.5 shadow-xs">
          <Activity size={11} style={{ color: brandColor }} />
          {upSites.length} of {sites.length} online
        </span>
      </div>

      {/* ── System Status Banner ── */}
      {downSites.length > 0 ? (
        <div className="bg-red-50 shadow-status-red rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <WifiOff size={17} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">
                {downSites.length} Site{downSites.length !== 1 ? "s" : ""} Currently Down
              </p>
              <p className="text-xs text-red-600 mt-0.5">These sites are unreachable — check server status immediately.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {downSites.map(s => (
              <Link key={s.id} href={`/sites/${s.id}`}>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors">
                  <WifiOff size={10} />{s.name}<ExternalLink size={9} className="opacity-60" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 shadow-status-green rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <div>
            <p className="text-sm font-bold text-green-700">
              {upSites.length > 0 ? "All systems operational" : "Monitoring starting…"}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {upSites.length > 0
                ? `All ${upSites.length} monitored sites are online and responding normally.`
                : "No uptime data yet — enable monitoring for your sites."}
            </p>
          </div>
          {avgResponse != null && (
            <div className="ml-auto text-right hidden sm:block">
              <p className="text-lg font-black tabular-nums" style={{ color: responseColor(avgResponse) }}>{avgResponse}ms</p>
              <p className="text-[10px] text-green-600">avg response</p>
            </div>
          )}
        </div>
      )}

      {/* ── 3 Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sites Online */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Wifi size={22} className="text-green-500" />
          </div>
          <div>
            <p className="text-3xl font-black tabular-nums text-green-600">{upSites.length}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Sites Online</p>
            {avgUptime != null && (
              <p className="text-[10px] text-green-600 font-medium mt-0.5">{avgUptime.toFixed(2)}% avg uptime</p>
            )}
          </div>
        </div>

        {/* Sites Down */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            downSites.length > 0 ? "bg-red-50" : "bg-gray-50"}`}>
            <WifiOff size={22} className={downSites.length > 0 ? "text-red-500" : "text-muted-foreground/40"} />
          </div>
          <div>
            <p className={`text-3xl font-black tabular-nums ${downSites.length > 0 ? "text-red-600" : "text-muted-foreground/50"}`}>
              {downSites.length}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Sites Down</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {downSites.length === 0 ? "All clear" : "Immediate action needed"}
            </p>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${responseColor(avgResponse)}15` }}>
            <Activity size={22} style={{ color: responseColor(avgResponse) }} />
          </div>
          <div>
            <p className="text-3xl font-black tabular-nums" style={{ color: responseColor(avgResponse) }}>
              {avgResponse != null ? avgResponse : "—"}
              {avgResponse != null && <span className="text-base font-semibold text-muted-foreground">ms</span>}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Avg Response Time</p>
            <p className="text-[10px] mt-0.5" style={{ color: responseColor(avgResponse) }}>
              {responseLabel(avgResponse)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Site Uptime Board ── */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Live Site Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time availability for all monitored sites</p>
          </div>
          {allOperational && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} />All operational
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {sites.map(site => <SiteUptimeCard key={site.id} site={site} />)}
        </div>
      </div>

      {/* ── Response Time Chart + Uptime Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Response Time Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Response Time Comparison</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Average server response time per site (fastest first)</p>
            </div>
            {avgResponse != null && (
              <span className="text-[10px] font-medium bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
                Avg <span className="font-bold text-foreground">{avgResponse}ms</span>
              </span>
            )}
          </div>

          {responseBarData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Activity size={24} />
              <p className="text-xs">Enable uptime monitoring to see response times</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(responseBarData.length * 48 + 32, 180)}>
                <BarChart
                  layout="vertical"
                  data={responseBarData}
                  margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}ms`}
                  />
                  <YAxis
                    type="category" dataKey="name" width={110}
                    tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<ResponseTip />} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="ms" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {responseBarData.map((d, i) => (
                      <Cell key={i} fill={responseColor(d.ms)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Response time legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                {[
                  { label: "Excellent (<300ms)", color: "#16a34a" },
                  { label: "Good (<700ms)",      color: "#d97706" },
                  { label: "Slow (700ms+)",      color: "#dc2626" },
                ].map(b => (
                  <span key={b.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                    {b.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Uptime Distribution */}
        <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Sites by current availability</p>

          <div className="flex justify-center relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={distPie} cx="50%" cy="50%"
                  innerRadius={50} outerRadius={72}
                  startAngle={90} endAngle={-270}
                  dataKey="value" paddingAngle={2}
                >
                  {distPie.map((d, i) => (
                    <Cell key={i} fill={d.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black" style={{ color: downSites.length > 0 ? "#dc2626" : "#16a34a" }}>
                {upSites.length}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">online</span>
            </div>
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

          {/* Uptime % per site */}
          {withUptime.length > 0 && (
            <div className="mt-auto pt-5 border-t border-border space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Uptime by site</p>
              {[...withUptime]
                .sort((a, b) => (a.uptime_percentage ?? 0) - (b.uptime_percentage ?? 0))
                .map(s => {
                  const pct = s.uptime_percentage!;
                  const color = uptimeColor(pct);
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground truncate flex-1 max-w-[90px]">{s.name}</span>
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="font-bold tabular-nums text-[10px] w-10 text-right" style={{ color }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter + Search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1 shadow-xs">
          {filterTabs.map(({ key, label }) => {
            const count =
              key === "all"     ? sites.length
              : key === "up"    ? upSites.length
              : key === "down"  ? downSites.length
              :                   unknownSites.length;
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
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base overflow-hidden">
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
                  <th className={thC} onClick={() => toggleSort("status")}>
                    <span className="flex items-center justify-center gap-1.5">Status <SortIcon col="status" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("uptime")}>
                    <span className="flex items-center gap-1.5">Uptime % <SortIcon col="uptime" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th} onClick={() => toggleSort("response")}>
                    <span className="flex items-center gap-1.5">Avg Response <SortIcon col="response" sortBy={sortBy} dir={sortDir} /></span>
                  </th>
                  <th className={th}>Quality</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(site => {
                  const isUp    = site.uptime_status === "up";
                  const isDown  = site.uptime_status === "down";
                  const uptime  = site.uptime_percentage;
                  const resp    = site.avg_response_ms;
                  const uColor  = uptimeColor(uptime);
                  const rColor  = responseColor(resp);
                  const initials = site.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

                  return (
                    <tr key={site.id}
                      className={`hover:bg-muted/20 transition-colors group ${isDown ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ background: uColor }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/sites/${site.id}`}
                              className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate max-w-[160px] block">
                              {site.name}
                            </Link>
                            <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
                              {site.url.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDown    ? "bg-red-50 text-red-600"
                          : isUp    ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-muted-foreground"
                        }`}>
                          <LiveDot status={site.uptime_status} />
                          {isDown ? "DOWN" : isUp ? "UP" : "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {uptime != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${uptime}%`, background: uColor }} />
                            </div>
                            <span className="text-sm font-bold tabular-nums" style={{ color: uColor }}>
                              {uptime.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not monitored</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {resp != null ? (
                          <span className="text-sm font-bold tabular-nums" style={{ color: rColor }}>{resp}ms</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-muted-foreground">{responseLabel(resp)}</span>
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
