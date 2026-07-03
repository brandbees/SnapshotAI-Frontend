"use client";

import { useState, useEffect } from "react";
import { Activity, TrendingUp, Search, Shield, Bug, Eye, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { truncateUrl, scoreHex } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
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
  const [hovered, setHovered] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!hovered) setDeleteConfirm(false); }, [hovered]);

  async function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await api.delete(`/sites/${site.id}`);
      await api.post('/sites/cache/clear').catch(() => {});
      window.dispatchEvent(new Event('bb:refresh'));
      toast.success("Site deleted.");
    } catch {
      toast.error("Failed to delete site.");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

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
    <div
      className="relative bg-white rounded-2xl border border-border shadow-sm transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
      style={hovered ? { boxShadow: "0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1)", borderColor: "var(--accent)" } : {}}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Card content (visible through frosted overlay) ── */}
      <div
        className="flex flex-col transition-all duration-200"
        style={{ filter: hovered && !isClientPortal ? "blur(0.5px)" : "none" }}
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
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 rounded-2xl transition-opacity duration-200"
          style={{
            background: "rgba(255,255,255,0.60)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-150 active:scale-95"
            style={{
              borderColor: "var(--accent)",
              color: "var(--accent)",
              background: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              transform: hovered ? "translateY(0)" : "translateY(10px)",
              opacity: hovered ? 1 : 0,
              transitionDelay: "30ms",
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "var(--accent)";
              btn.style.color = "white";
              btn.style.boxShadow = "0 8px 20px rgba(0,0,0,0.18)";
              btn.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "rgba(255,255,255,0.85)";
              btn.style.color = "var(--accent)";
              btn.style.boxShadow = "none";
              btn.style.transform = "translateY(0)";
            }}
          >
            <Eye size={15} />
            Quick View
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-95"
            style={{
              background: "var(--accent)",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              transform: hovered ? "translateY(0)" : "translateY(10px)",
              opacity: hovered ? 1 : 0,
              transitionDelay: "60ms",
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.filter = "brightness(1.12)";
              btn.style.boxShadow = "0 8px 22px rgba(0,0,0,0.25)";
              btn.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.filter = "none";
              btn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)";
              btn.style.transform = "translateY(0)";
            }}
          >
            Detailed View
            <ArrowRight size={15} />
          </button>

          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{
              background: deleteConfirm ? "#ef4444" : "rgba(239,68,68,0.08)",
              color: deleteConfirm ? "white" : "#ef4444",
              border: "2px solid #ef4444",
              cursor: "pointer",
              transform: hovered ? "translateY(0)" : "translateY(10px)",
              opacity: hovered ? 1 : 0,
              transitionDelay: "90ms",
            }}
          >
            {deleting
              ? <Loader2 size={13} className="animate-spin" />
              : <Trash2 size={13} />}
            {deleting ? "Deleting…" : deleteConfirm ? "Confirm Delete?" : "Delete Site"}
          </button>
        </div>
      )}

      {/* Client portal — single bottom button, no overlay */}
      {isClientPortal && (
        <div className="px-3 pb-3 -mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(siteHref); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md active:scale-95"
            style={{ background: "var(--accent)", cursor: "pointer" }}
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}
