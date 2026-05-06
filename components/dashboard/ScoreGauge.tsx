"use client";

import { scoreColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

interface ScoreGaugeProps {
  score: number;
  label: string;
  sublabel?: string;
  sublabelVariant?: "good" | "warn" | "bad" | "muted";
  size?: "sm" | "md" | "lg";
  isMalware?: boolean;
  className?: string;
}

const sizePx = { sm: 72, md: 104, lg: 136 };
const strokeW = { sm: 6, md: 8, lg: 10 };
const fontSizes = { sm: "text-xl", md: "text-3xl", lg: "text-4xl" };
const labelSizes = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };

const sublabelColors = {
  good: "text-green-600",
  warn: "text-amber-600",
  bad: "text-red-600",
  muted: "text-muted-foreground",
};

export function ScoreGauge({
  score,
  label,
  sublabel,
  sublabelVariant = "muted",
  size = "md",
  isMalware = false,
  className,
}: ScoreGaugeProps) {
  const px = sizePx[size];
  const sw = strokeW[size];
  const r = (px - sw * 2) / 2;
  const cx = px / 2;
  const cy = px / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const color = scoreColor(clamped);

  if (isMalware) {
    const isClean = clamped >= 80;
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div
          className="flex flex-col items-center justify-center rounded-full"
          style={{
            width: px,
            height: px,
            background: isClean ? "var(--score-good-bg)" : "var(--score-bad-bg)",
            border: `${sw}px solid ${isClean ? "var(--score-good-border)" : "var(--score-bad-border)"}`,
          }}
        >
          <Shield
            size={px * 0.28}
            style={{ color: isClean ? "var(--score-good)" : "var(--score-bad)" }}
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className={cn("font-semibold uppercase tracking-wide text-foreground", labelSizes[size])}>
            {label}
          </span>
          {sublabel && (
            <span className={cn("font-medium", labelSizes[size], sublabelColors[sublabelVariant])}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: px, height: px }}>
        {/* Track ring */}
        <svg
          width={px}
          height={px}
          viewBox={`0 0 ${px} ${px}`}
          className="-rotate-90 absolute inset-0"
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={sw}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        {/* Score */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn("font-bold tabular-nums leading-none", fontSizes[size])}
            style={{ color }}
          >
            {clamped}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className={cn("font-semibold uppercase tracking-wide text-foreground", labelSizes[size])}>
          {label}
        </span>
        {sublabel && (
          <span className={cn("font-medium", labelSizes[size], sublabelColors[sublabelVariant])}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
