"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface TrendChartProps {
  siteId: string;
}

const RANGES = [
  { label: "30d",  days: 30  },
  { label: "90d",  days: 90  },
  { label: "180d", days: 180 },
  { label: "365d", days: 365 },
] as const;

type RangeDays = 30 | 90 | 180 | 365;

interface AuditPoint {
  created_at: string;
  performance_score: number | null;
  seo_score: number | null;
  security_score: number | null;
  malware_score: number | null;
  overall_score: number | null;
  status: string;
}

interface ChartPoint {
  date: string;
  overall: number;
  perf: number;
  seo: number;
  security: number;
  sessions?: number;
}

const PILLARS = [
  { key: "overall",  label: "Overall",     color: "#1f5fb8" },
  { key: "perf",     label: "Performance", color: "#10b981" },
  { key: "seo",      label: "SEO",         color: "#ec4899" },
  { key: "security", label: "Security",    color: "#06b6d4" },
] as const;

type PillarKey = (typeof PILLARS)[number]["key"];

const TRAFFIC_COLOR = "#f97316";

function toChartPoint(a: AuditPoint): ChartPoint | null {
  if (a.status !== "completed") return null;
  const perf     = a.performance_score ?? 0;
  const seo      = a.seo_score         ?? 0;
  const security = a.security_score    ?? 0;
  const malware  = a.malware_score     ?? 100;
  const overall  = a.overall_score     ?? Math.round((perf + seo + security + malware) / 4);
  return {
    date:     new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overall,
    perf,
    seo,
    security,
  };
}

export function TrendChart({ siteId }: TrendChartProps) {
  const [range, setRange]           = useState<RangeDays>(30);
  const [data, setData]             = useState<ChartPoint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activePillars, setActive]  = useState<Set<PillarKey>>(new Set(["overall"]));
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficData, setTrafficData] = useState<{ date: string; sessions: number }[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [hasGA4, setHasGA4]         = useState(false);

  const fetchData = useCallback(async (days: RangeDays) => {
    setLoading(true);
    try {
      const res = await api.get<{ audits: AuditPoint[] }>(`/audits/${siteId}?days=${days}`);
      const points = res.data.audits
        .map(toChartPoint)
        .filter((p): p is ChartPoint => p !== null)
        .reverse();
      setData(points);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  const fetchTraffic = useCallback(async (days: RangeDays) => {
    setTrafficLoading(true);
    try {
      const res = await api.get<{ trend: { date: string; sessions: number }[] }>(
        `/analytics/${siteId}/ga4/trend?days=${days}`
      );
      setTrafficData(res.data.trend ?? []);
      if ((res.data.trend ?? []).length > 0) setHasGA4(true);
    } catch {
      setTrafficData([]);
    } finally {
      setTrafficLoading(false);
    }
  }, [siteId]);

  // Check GA4 availability on mount
  useEffect(() => {
    api.get<{ ga4_connected: boolean }>(`/analytics/${siteId}/status`)
      .then(({ data: s }) => setHasGA4(!!s.ga4_connected))
      .catch(() => {});
  }, [siteId]);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  useEffect(() => {
    if (showTraffic) fetchTraffic(range);
  }, [showTraffic, range, fetchTraffic]);

  function togglePillar(key: PillarKey) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size === 1) return prev;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Merge audit data with traffic data by date
  const mergedData: ChartPoint[] = data.map((pt) => {
    const traffic = trafficData.find((t) => t.date === pt.date);
    return { ...pt, sessions: traffic?.sessions };
  });

  // Max sessions for right Y-axis domain
  const maxSessions = Math.max(...trafficData.map((t) => t.sessions), 1);
  const sessionsDomain = [0, Math.ceil(maxSessions * 1.2)];

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Range buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Range:</span>
          {RANGES.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => setRange(days)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                range === days
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pillar toggles + traffic toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PILLARS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => togglePillar(key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor: activePillars.has(key) ? color : "#e5e7eb",
                background:  activePillars.has(key) ? color + "18" : "transparent",
                color:       activePillars.has(key) ? color : "#9ca3af",
              }}
            >
              <span className="inline-block w-2 h-2 rounded-full"
                style={{ background: activePillars.has(key) ? color : "#d1d5db" }} />
              {label}
            </button>
          ))}

          {hasGA4 && (
            <button
              onClick={() => setShowTraffic(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor: showTraffic ? TRAFFIC_COLOR : "#e5e7eb",
                background:  showTraffic ? TRAFFIC_COLOR + "18" : "transparent",
                color:       showTraffic ? TRAFFIC_COLOR : "#9ca3af",
              }}
            >
              <span className="inline-block w-2 h-2 rounded-full"
                style={{ background: showTraffic ? TRAFFIC_COLOR : "#d1d5db" }} />
              {trafficLoading ? "Loading…" : "Traffic"}
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No completed audits in this range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={showTraffic ? mergedData : data} margin={{ top: 5, right: showTraffic ? 40 : 5, left: -20, bottom: 0 }}>
            <defs>
              {PILLARS.map(({ key, color }) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="score"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            {showTraffic && (
              <YAxis
                yAxisId="sessions"
                orientation="right"
                domain={sessionsDomain}
                tick={{ fontSize: 10, fill: TRAFFIC_COLOR }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
            )}
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#6b7280", marginBottom: 4, fontWeight: 600 }}
              formatter={(value, name) => {
                if (name === "sessions") return [`${Number(value).toLocaleString()} sessions`, "Traffic"];
                const pillar = PILLARS.find(p => p.key === name);
                return [`${value}`, pillar?.label ?? String(name)];
              }}
            />
            {PILLARS.filter(p => activePillars.has(p.key)).map(({ key, color }) => (
              <Area
                key={key}
                yAxisId="score"
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${key})`}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            ))}
            {showTraffic && (
              <Line
                yAxisId="sessions"
                type="monotone"
                dataKey="sessions"
                stroke={TRAFFIC_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4, fill: TRAFFIC_COLOR, strokeWidth: 0 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {showTraffic && hasGA4 && trafficData.length === 0 && !trafficLoading && (
        <p className="text-[11px] text-center text-muted-foreground mt-1">
          No traffic data yet — GA4 needs a few days to accumulate sessions.
        </p>
      )}
    </div>
  );
}
