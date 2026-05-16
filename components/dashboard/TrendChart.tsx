"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
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
    return audits.filter((a) => now - new Date(a.created_at).getTime() <= 7 * msPerDay);
  if (range === "Last 30 Days")
    return audits.filter((a) => now - new Date(a.created_at).getTime() <= 30 * msPerDay);
  return audits;
}

export function TrendChart({ audits }: TrendChartProps) {
  const [range, setRange] = useState<Range>("Last 30 Days");

  const completed = audits.filter((a) => a.status === "completed" && a.scores);
  const filtered = filterByRange(completed, range);

  const grouped = new Map<string, number[]>();
  for (const a of filtered) {
    const key = new Date(a.created_at).toLocaleDateString("en-GB", {
      day: "numeric", month: "short",
    });
    const score =
      a.overall_score ??
      Math.round(
        ((a.scores!.performance + a.scores!.seo + a.scores!.security + a.scores!.malware) / 4) * 10
      ) / 10;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(score);
  }

  const data = [...grouped.entries()].slice(-20).map(([date, scores]) => ({
    date,
    score: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
  }));

  return (
    <div>
      {/* Range selector */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Range:</span>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                range === r
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No completed audits in this range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
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
              formatter={(v) => [`${v}`, "Score"]}
              labelStyle={{ color: "#6b7280", marginBottom: 2 }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#trendGrad)"
              dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#6366f1" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
