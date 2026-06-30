"use client";

import { PieChart, Pie, Cell } from "recharts";
import { Shield } from "lucide-react";
import { scoreHex, cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  sublabel?: string;
  sublabelVariant?: "good" | "warn" | "bad" | "muted";
  size?: "sm" | "md" | "lg";
  isMalware?: boolean;
  color?: string;
  className?: string;
}

const sublabelColors = {
  good: "text-green-600",
  warn: "text-amber-600",
  bad:  "text-red-600",
  muted: "text-muted-foreground",
};

const sizeConfig = {
  sm: { px: 72,  inner: 22, outer: 32, cx: 34, numCls: "text-xl",  shield: 18, labelCls: "text-[10px]" },
  md: { px: 88,  inner: 28, outer: 40, cx: 42, numCls: "text-2xl", shield: 22, labelCls: "text-xs"     },
  lg: { px: 120, inner: 40, outer: 56, cx: 58, numCls: "text-3xl", shield: 30, labelCls: "text-sm"     },
};

export function ScoreGauge({
  score,
  label,
  sublabel,
  sublabelVariant = "muted",
  size = "md",
  isMalware = false,
  color,
  className,
}: ScoreGaugeProps) {
  const cfg = sizeConfig[size];
  const clamped = Math.max(0, Math.min(100, score));
  const hex = scoreHex(clamped);
  const ringColor = isMalware ? (clamped >= 80 ? "#16a34a" : "#dc2626") : (color ?? hex);
  const pct = Math.max(4, Math.min(98, clamped));

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Donut ring — pointerEvents none so parent card cursor:pointer is not overridden by Recharts SVG */}
      <div className="relative shrink-0" style={{ width: cfg.px, height: cfg.px, pointerEvents: "none" }}>
        <PieChart width={cfg.px} height={cfg.px}>
          <Pie
            data={[{ value: pct }, { value: 100 - pct }]}
            cx={cfg.cx}
            cy={cfg.cx}
            innerRadius={cfg.inner}
            outerRadius={cfg.outer}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={ringColor} />
            <Cell fill="#f3f4f6" />
          </Pie>
        </PieChart>
        {/* Shield icon in center for malware */}
        {isMalware && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield size={cfg.shield} style={{ color: ringColor }} />
          </div>
        )}
      </div>

      {/* Score number */}
      <p
        className={cn("font-bold tabular-nums leading-tight mt-2", cfg.numCls)}
        style={{ color: ringColor }}
      >
        {clamped}
      </p>

      {/* Label */}
      {label && (
        <p className={cn("font-semibold uppercase tracking-wide text-foreground mt-0.5", cfg.labelCls)}>
          {label}
        </p>
      )}

      {/* Sublabel */}
      {sublabel && (
        <p className={cn("font-medium mt-0.5", cfg.labelCls, sublabelColors[sublabelVariant])}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
