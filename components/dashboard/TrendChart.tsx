"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
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
}

const PILLARS = [
  { key: "overall",  label: "Overall",     color: "#6366f1" },
  { key: "perf",     label: "Performance", color: "#10b981" },
  { key: "seo",      label: "SEO",         color: "#ec4899" },
  { key: "security", label: "Security",    color: "#06b6d4" },
] as const;

type PillarKey = (typeof PILLARS)[number]["key"];

function toChartPoint(a: AuditPoint): ChartPoint | null {
  if (a.status !== "completed") return null;
  const perf     = a.performance_score ?? 0;
  const seo      = a.seo_score         ?? 0;
  const security = a.security_score    ?? 0;
  const malware  = a.malware_score     ?? 100;
  const overall  = a.overall_score     ?? Math.round((perf + seo + security + malware) / 4);
  return {
    date:     new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    overall,
    perf,
    seo,
    security,
  };
}

export function TrendChart({ siteId }: TrendChartProps) {
  const [range, setRange]         = useState<RangeDays>(30);
  const [data, setData]           = useState<ChartPoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activePillars, setActive] = useState<Set<PillarKey>>(new Set(["overall"]));

  const fetchData = useCallback(async (days: RangeDays) => {
    setLoading(true);
    try {
      const res = await api.get<{ audits: AuditPoint[] }>(
        `/audits/${siteId}?days=${days}`
      );
      const points = res.data.audits
        .map(toChartPoint)
        .filter((p): p is ChartPoint => p !== null)
        .reverse(); // ascending time order for chart
      setData(points);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  function togglePillar(key: PillarKey) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size === 1) return prev; // keep at least one
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

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

        {/* Pillar toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PILLARS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => togglePillar(key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor:     activePillars.has(key) ? color : "#e5e7eb",
                background:      activePillars.has(key) ? color + "18" : "transparent",
                color:           activePillars.has(key) ? color : "#9ca3af",
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: activePillars.has(key) ? color : "#d1d5db" }}
              />
              {label}
            </button>
          ))}
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
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#6b7280", marginBottom: 4, fontWeight: 600 }}
              formatter={(value, name) => {
                const pillar = PILLARS.find(p => p.key === name);
                return [`${value}`, pillar?.label ?? String(name)];
              }}
            />
            {PILLARS.filter(p => activePillars.has(p.key)).map(({ key, color }) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${key})`}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
