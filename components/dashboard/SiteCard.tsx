"use client";

import { RefreshCw, FileText, Settings, Activity, TrendingUp, Search, Shield, Bug } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { useRouter } from "next/navigation";
import { truncateUrl, scoreHex } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Site } from "@/types";

interface SiteCardProps {
  site: Site;
  onClick: () => void;
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
  const filled = Math.max(pct, 0);
  const empty = 100 - filled;
  return (
    <PieChart width={64} height={64}>
      <Pie
        data={[{ value: filled }, { value: empty }]}
        cx={27} cy={27}
        innerRadius={20} outerRadius={30}
        startAngle={90} endAngle={-270}
        dataKey="value"
        strokeWidth={0}
      >
        <Cell fill={filled > 0 ? "#10b981" : "#e5e7eb"} />
        <Cell fill="#e5e7eb" />
      </Pie>
    </PieChart>
  );
}

export function SiteCard({ site, onClick }: SiteCardProps) {
  const router = useRouter();
  const { agency } = useAuth();
  const isClientPortal = agency?.is_client_portal ?? false;
  const uptime = site.uptime_percentage ?? 0;
  const isOnline = site.uptime_status === "up";
  const isDown = site.uptime_status === "down";

  const statusLabel = isOnline ? "Online" : isDown ? "Down" : "Unknown";
  const statusDot   = isOnline ? "bg-green-500" : isDown ? "bg-red-500" : "bg-gray-400";
  const statusText  = isOnline ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500";
  const statusBg    = isOnline ? "bg-green-50"  : isDown ? "bg-red-50"  : "bg-gray-100";

  const siteHref = `/sites/${site.id}`;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
    >
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
            <p className="font-semibold text-sm text-foreground leading-snug truncate">
              {site.name}
            </p>
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

      {/* Score pillars — each pillar in its own light card */}
      <div className="grid grid-cols-4 gap-2 px-3 py-3 border-t border-border/50">
        {pillars.map(({ key, label, Icon, iconColor }) => {
          const score = site.latest_scores?.[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 bg-[#f8fafc] rounded-xl py-3 px-1"
            >
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

      {/* Uptime — light card row */}
      <div className="px-3 pb-3">
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

      {/* Client: single "View Details" button */}
      {isClientPortal && (
        <div className="px-3 pb-3 pt-0">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            View Details
          </button>
        </div>
      )}

      {/* Agency/team action buttons */}
      {!isClientPortal && (
        <div className="flex items-center gap-2 px-3 pb-3 pt-0">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <RefreshCw size={13} />
            Audit Now
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/reports/${site.id}`); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-gray-50 transition-colors"
          >
            <FileText size={13} />
            Reports
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-gray-50 border border-border transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
