"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useState } from "react";
import type { Audit } from "@/types";

interface TrendChartProps {
  audits: Audit[];
}

const RANGES = ["Last 7 Days", "Last 30 Days", "All Time"] as const;
type Range = (typeof RANGES)[number];

function filterByRange(audits: Audit[], range: Range): Audit[] {
  const now = Date.now();
  const msPerDay = 86_400_000;
  if (range === "Last 7 Days")
    return audits.filter(
      (a) => now - new Date(a.created_at).getTime() <= 7 * msPerDay
    );
  if (range === "Last 30 Days")
    return audits.filter(
      (a) => now - new Date(a.created_at).getTime() <= 30 * msPerDay
    );
  return audits;
}

/* Interpolate from light steel-blue → dark teal based on index position */
function barColor(index: number, total: number): string {
  const t = total <= 1 ? 1 : index / (total - 1); // 0 = oldest, 1 = newest
  // light: hsl(210,40%,75%)  →  dark: hsl(203,68%,26%)
  const h = 206;
  const s = Math.round(40 + t * 28);   // 40% → 68%
  const l = Math.round(75 - t * 49);   // 75% → 26%
  return `hsl(${h},${s}%,${l}%)`;
}

interface TooltipPayload {
  payload?: { overall: number; date: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-0.5">{d?.date}</p>
      <p className="font-bold text-foreground text-sm">{d?.overall}</p>
    </div>
  );
}

export function TrendChart({ audits }: TrendChartProps) {
  const [range, setRange] = useState<Range>("Last 30 Days");

  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const filtered = filterByRange(completed, range);

  // Group by calendar date, average the overall score per day
  const grouped = new Map<string, number[]>();
  for (const a of filtered) {
    const key = new Date(a.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const score = a.overall_score
      ?? Math.round(
          ((a.scores!.performance +
            a.scores!.seo +
            a.scores!.security +
            a.scores!.malware) /
            4) * 10
        ) / 10;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(score);
  }

  const data = [...grouped.entries()].slice(-20).map(([date, scores]) => ({
    date,
    overall: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
  }));

  return (
    <div>
      {/* Range selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">RANGE:</span>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
              range === r
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-border-strong hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No completed audits in this range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            barCategoryGap={data.length === 1 ? "70%" : "18%"}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            />
            <Bar dataKey="overall" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => (
                <Cell key={i} fill={barColor(i, data.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
