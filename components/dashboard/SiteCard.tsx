"use client";

import { Activity, TrendingUp, Search, Shield, Bug, Eye, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { truncateUrl, scoreHex } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Site } from "@/types";

interface SiteCardProps {
  site: Site;
  onClick: () => void; // quick view
}

const AVATAR_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function avatarColor(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

const pillars = [
  { key: "performance" as const, label: "Perf",    Icon: TrendingUp, iconColor: "#10b981" },
  { key: "seo"         as const, label: "SEO",     Icon: Search,     iconColor: "#ec4899" },
  { key: "security"    as const, label: "Sec",     Icon: Shield,     iconColor: "#06b6d4" },
  { key: "malware"     as const, label: "Malware", Icon: Bug,        iconColor: "#8b5cf6" },
];

function UptimeDonut({ pct }: { pct: number }) {
  const size = 44, stroke = 5, r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(pct, 100));
  const dash = (filled / 100) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      {filled > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      )}
    </svg>
  );
}

export function SiteCard({ site, onClick }: SiteCardProps) {
  const router = useRouter();
  const { agency } = useAuth();
  const isClientPortal = agency?.is_client_portal ?? false;
  const uptime   = site.uptime_percentage ?? 0;
  const isOnline = site.uptime_status === "up";
  const isDown   = site.uptime_status === "down";

  const statusLabel = isOnline ? "Online" : isDown ? "Down" : "Unknown";
  const statusDot   = isOnline ? "bg-green-500" : isDown ? "bg-red-500" : "bg-gray-400";
  const statusText  = isOnline ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500";
  const statusBg    = isOnline ? "bg-green-50"   : isDown ? "bg-red-50"   : "bg-gray-100";

  const siteHref = `/sites/${site.id}`;

  return (
    <div className="group relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-[var(--accent)]/30 transition-all duration-200 overflow-hidden flex flex-col">

      {/* ── Card content (dims slightly on hover) ── */}
      <div className="flex flex-col transition-opacity duration-200 group-hover:opacity-60">

        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
              style={{ background: avatarColor(site.id) }}
            >
              {site.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-snug truncate">{site.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <span className="text-[10px] opacity-60">⊕</span>
                {truncateUrl(site.url)}
              </p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusBg} ${statusText}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            {statusLabel}
          </span>
        </div>

        {/* Score pillars */}
        <div className="grid grid-cols-4 gap-2 px-3 py-3 border-t border-border/50">
          {pillars.map(({ key, label, Icon, iconColor }) => {
            const score = site.latest_scores?.[key];
            return (
              <div key={key} className="flex flex-col items-center gap-1.5 bg-[#f8fafc] rounded-xl py-3 px-1">
                <Icon size={14} style={{ color: iconColor }} />
                <span
                  className="text-lg font-bold tabular-nums leading-none"
                  style={{ color: score !== undefined ? scoreHex(score) : "#d1d5db" }}
                >
                  {score !== undefined ? score : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Uptime */}
        <div className="px-3 pb-4">
          <div className="flex items-center justify-between bg-[#f8fafc] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              <span className="text-sm font-medium text-muted-foreground">Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <UptimeDonut pct={uptime} />
              <span className="text-sm font-bold text-foreground">{uptime.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hover overlay — agency only ── */}
      {!isClientPortal && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)" }}
        >
          {/* Quick View */}
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="pointer-events-auto w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-150
              border-[var(--accent)] text-[var(--accent)] bg-white hover:bg-[var(--accent)] hover:text-white hover:shadow-md
              translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
            style={{ transitionDelay: "30ms" }}
          >
            <Eye size={15} />
            Quick View
          </button>

          {/* Detailed View */}
          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="pointer-events-auto w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150
              hover:brightness-110 hover:shadow-lg shadow-md
              translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
            style={{ background: "var(--accent)", transitionDelay: "70ms" }}
          >
            Detailed View
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Client portal — single bottom button, no overlay */}
      {isClientPortal && (
        <div className="px-3 pb-3 -mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}
