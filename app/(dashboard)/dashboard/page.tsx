"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Search,
  Shield,
  Zap,
  WifiOff,
  Lock,
  Clock,
  Activity,
  Puzzle,
  Plus,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ZAxis, Cell,
  PieChart, Pie,
} from "recharts";
import { useSites, type PortfolioStats } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";
import { AddSiteModal } from "@/components/sites/AddSiteModal";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Button } from "@/components/ui/Button";
import { PLAN_LIMITS } from "@/lib/constants";
import type { Site } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const days = Math.floor(diff / 86400);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

// For Recharts fills — needs actual hex, not CSS variables
function scoreHex(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

// ── Mini donut (inside stat card) ─────────────────────────────────────────────

function MiniDonut({ score }: { score: number }) {
  return (
    <PieChart width={44} height={44}>
      <Pie
        data={[{ value: score }, { value: 100 - score }]}
        cx={17} cy={17}
        innerRadius={13} outerRadius={20}
        startAngle={90} endAngle={-270}
        dataKey="value" strokeWidth={0}
      >
        <Cell fill={scoreHex(score)} />
        <Cell fill="#f3f4f6" />
      </Pie>
    </PieChart>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: "green" | "amber" | "red" | "muted";
  icon: React.ReactNode;
  iconBg?: string;
  miniGauge?: number;
  href?: string;
}

function StatCard({ label, value, sub, subColor = "muted", icon, iconBg = "#6366f1", miniGauge, href }: StatCardProps) {
  const subCls =
    subColor === "green" ? "text-green-600" :
    subColor === "amber" ? "text-amber-500" :
    subColor === "red"   ? "text-red-500"   : "text-muted-foreground";

  const inner = (
    <div className={`bg-white rounded-2xl border border-border shadow-sm p-5 h-full transition-all duration-150 ${href ? "cursor-pointer hover:shadow-md hover:border-[var(--accent)]/40 hover:-translate-y-px" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${iconBg}1a`, color: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none mt-1">
          {value}
        </p>
        {miniGauge !== undefined && <MiniDonut score={miniGauge} />}
      </div>
      {sub && <p className={`text-xs mt-2 font-medium ${subCls}`}>{sub}</p>}
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

// ── Portfolio Health ──────────────────────────────────────────────────────────

function AlertRow({ icon, label, sub, severity }: {
  icon: React.ReactNode; label: string; sub: string; severity: "critical" | "warning";
}) {
  const crit = severity === "critical";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-opacity hover:opacity-80 ${crit ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${crit ? "bg-red-100 text-red-500" : "bg-amber-100 text-amber-500"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${crit ? "text-red-700" : "text-amber-700"}`}>{label}</p>
        <p className={`text-[10px] ${crit ? "text-red-400" : "text-amber-400"}`}>{sub}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${crit ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
        {crit ? "Critical" : "Warning"}
      </span>
    </div>
  );
}

function PortfolioHealthSection({ portfolio, sites }: { portfolio: PortfolioStats; sites: Site[] }) {
  const router = useRouter();
  const { avg_score, total_sites, healthy, warning, critical, malware_detected, sites_down, ssl_expiring } = portfolio;
  const threatSites = sites.filter(s => s.malware_status === "threat");

  const score      = avg_score ?? 0;
  const scoreLabel = avg_score == null ? "No data" : score >= 80 ? "Healthy" : score >= 50 ? "Needs Attention" : "Critical";
  const pct        = (n: number) => total_sites > 0 ? Math.round((n / total_sites) * 100) : 0;
  const hasAlerts  = malware_detected > 0 || sites_down > 0 || ssl_expiring > 0;

  // SVG arc gauge — 240° arc opening at the bottom (150° → 30° clockwise)
  const W = 200, H = 145, cx = W / 2, cy = 92, R = 67;
  function pt(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return `${(cx + R * Math.cos(rad)).toFixed(2)} ${(cy + R * Math.sin(rad)).toFixed(2)}`;
  }
  const bgArc     = `M ${pt(150)} A ${R} ${R} 0 1 1 ${pt(30)}`;
  const filledDeg = 150 + (score / 100) * 240;
  const fgArc     = score > 0
    ? `M ${pt(150)} A ${R} ${R} 0 ${(score / 100) * 240 > 180 ? 1 : 0} 1 ${pt(filledDeg)}`
    : null;

  const statusRows = [
    { label: "Healthy",  count: healthy,  color: "#16a34a", numBg: "#f0fdf4", trackBg: "#dcfce7", filter: "healthy"  },
    { label: "Warning",  count: warning,  color: "#d97706", numBg: "#fffbeb", trackBg: "#fef9c3", filter: "warning"  },
    { label: "Critical", count: critical, color: "#dc2626", numBg: "#fef2f2", trackBg: "#fee2e2", filter: "critical" },
  ];

  const alertCount = (malware_detected > 0 ? 1 : 0) + (sites_down > 0 ? 1 : 0) + (ssl_expiring > 0 ? 1 : 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* ── Card 1: Score gauge ── */}
      <Link href="/sites" className="rounded-2xl overflow-hidden relative block cursor-pointer group"
        style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
        {/* Hover insights overlay — fades in, gauge fades out */}
        <div className="absolute inset-0 flex flex-col justify-center gap-4 px-6 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          style={{ background: "rgba(18, 10, 60, 0.92)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
            Active Risks &amp; Improvements
          </p>
          <div className="space-y-3">
            {/* Always shown: critical / warning counts as risk items */}
            {critical > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f87171" }} />
                <span className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.8)" }}>
                  <span className="font-bold text-white">{critical} {critical === 1 ? "site" : "sites"}</span> in critical state — score below 50
                </span>
              </div>
            )}
            {warning > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#fbbf24" }} />
                <span className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.8)" }}>
                  <span className="font-bold text-white">{warning} {warning === 1 ? "site" : "sites"}</span> need attention — score 50–79
                </span>
              </div>
            )}
            {malware_detected > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f87171" }} />
                <span className="text-xs leading-snug" style={{ color: "#fca5a5" }}>
                  <span className="font-bold">{malware_detected} malware {malware_detected === 1 ? "threat" : "threats"}</span> detected — immediate action required
                </span>
              </div>
            )}
            {sites_down > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f87171" }} />
                <span className="text-xs leading-snug" style={{ color: "#fca5a5" }}>
                  <span className="font-bold">{sites_down} {sites_down === 1 ? "site is" : "sites are"} offline</span> — uptime monitoring active
                </span>
              </div>
            )}
            {ssl_expiring > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#fbbf24" }} />
                <span className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.75)" }}>
                  <span className="font-bold text-white">{ssl_expiring} SSL {ssl_expiring === 1 ? "certificate" : "certificates"}</span> expiring within 30 days
                </span>
              </div>
            )}
            {critical === 0 && warning === 0 && malware_detected === 0 && sites_down === 0 && ssl_expiring === 0 && (
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#4ade80" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                  All {total_sites} {total_sites === 1 ? "site is" : "sites are"} healthy — no active risks
                </span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
            Click to view all sites →
          </span>
        </div>

        <div className="relative p-5 flex flex-col h-full justify-between transition-opacity duration-200 group-hover:opacity-0">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
              Portfolio Health
            </p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
              {total_sites} {total_sites === 1 ? "site" : "sites"}
            </span>
          </div>

          <div className="flex justify-center">
            <svg width={W} height={H} style={{ overflow: "visible" }}>
              <path d={bgArc} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={13} strokeLinecap="round" />
              {fgArc && (
                <path d={fgArc} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={13} strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.45))" }} />
              )}
              <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={40} fontWeight={800} fontFamily="system-ui,sans-serif">
                {avg_score ?? "—"}
              </text>
              <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.4)" fontSize={11} fontFamily="system-ui,sans-serif">
                out of 100
              </text>
            </svg>
          </div>

          <div className="flex justify-center">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
              {scoreLabel}
            </span>
          </div>
        </div>
      </Link>

      {/* ── Card 2: Site status breakdown ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-4">Site Status</p>
        <div className="space-y-3.5">
          {statusRows.map(({ label, count, color, numBg, trackBg, filter }) => (
            <button
              key={label}
              onClick={() => router.push(`/sites?filter=${filter}`)}
              className="w-full flex items-center gap-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer p-1 -mx-1"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold tabular-nums"
                style={{ background: numBg, color }}>
                {count}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct(count)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct(count)}%`, background: color }} />
                </div>
              </div>
            </button>
          ))}
        </div>
        <Link href="/sites" className="mt-4 pt-3.5 border-t border-border flex items-center justify-between group hover:text-[var(--accent)] transition-colors">
          <span className="text-xs text-muted-foreground group-hover:text-[var(--accent)]">Monitored sites</span>
          <span className="text-sm font-bold text-foreground tabular-nums group-hover:text-[var(--accent)]">{total_sites}</span>
        </Link>
      </div>

      {/* ── Card 3: Active alerts ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Active Alerts</p>
          {hasAlerts && (
            <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
              {alertCount} active
            </span>
          )}
        </div>

        {!hasAlerts ? (
          <div className="flex flex-col items-center justify-center py-5 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <Shield size={22} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All Clear</p>
              <p className="text-xs text-muted-foreground mt-0.5">No active threats detected</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {malware_detected > 0 && (
              threatSites.length > 0
                ? threatSites.map(s => (
                    <Link key={s.id} href={`/sites/${s.id}?tab=malware`} className="block">
                      <AlertRow
                        icon={<Shield size={13} />}
                        label={s.name}
                        sub="Malware threat — immediate action required"
                        severity="critical"
                      />
                    </Link>
                  ))
                : (
                  <Link href="/malware" className="block">
                    <AlertRow
                      icon={<Shield size={13} />}
                      label={`${malware_detected} malware threat${malware_detected !== 1 ? "s" : ""}`}
                      sub="Immediate action required"
                      severity="critical"
                    />
                  </Link>
                )
            )}
            {sites_down > 0 && (
              <Link href="/uptime" className="block">
                <AlertRow
                  icon={<WifiOff size={13} />}
                  label={`${sites_down} site${sites_down !== 1 ? "s" : ""} offline`}
                  sub="Check uptime monitor"
                  severity="critical"
                />
              </Link>
            )}
            {ssl_expiring > 0 && (
              <Link href="/security" className="block">
                <AlertRow
                  icon={<Lock size={13} />}
                  label={`${ssl_expiring} SSL expiring soon`}
                  sub="Renew before expiry"
                  severity="warning"
                />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sites Overview table ───────────────────────────────────────────────────────

function SitesOverviewCard({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const top = sites.slice(0, 5);
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Sites Overview</h3>
        <Link href="/sites" className="text-xs font-medium text-accent hover:underline">
          View all →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Site", "URL", "Status", "Perf", "SEO", "Sec", "Malware"].map((h) => (
                <th key={h} className="text-left text-xs text-muted-foreground font-medium pb-2 pr-3 last:pr-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.map((site) => {
              const sc = site.latest_scores;
              const isUp = site.uptime_status !== "down";
              return (
                <tr
                  key={site.id}
                  onClick={() => { router.push(`/sites/${site.id}`); }}
                  className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-3 pr-3 font-medium text-foreground truncate max-w-[110px]">
                    {site.name}
                  </td>
                  <td className="py-3 pr-3 max-w-[110px]">
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-muted-foreground hover:text-accent hover:underline truncate block"
                    >
                      {site.url.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isUp ? "bg-green-500" : "bg-red-500"}`} />
                      {isUp ? "Online" : "Offline"}
                    </span>
                  </td>
                  {sc ? (
                    [sc.performance, sc.seo, sc.security, sc.malware].map((v, i) => (
                      <td key={i} className="py-3 pr-3 font-bold tabular-nums" style={{ color: scoreHex(v) }}>
                        {v}
                      </td>
                    ))
                  ) : (
                    <td colSpan={4} className="py-3 text-xs text-muted-foreground italic">No audit yet</td>
                  )}
                </tr>
              );
            })}
            {top.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  No sites added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Needs Attention ────────────────────────────────────────────────────────────

function NeedsAttentionCard({ sites }: { sites: Site[] }) {
  const issues: { icon: React.ReactNode; title: string; site: string; href: string; severity: "Critical" | "Warning" }[] = [];

  for (const site of sites) {
    if (site.malware_status === "threat")
      issues.push({ icon: <Shield size={12} className="text-red-500" />, title: "Malware threat detected", site: site.name, href: `/sites/${site.id}?tab=malware`, severity: "Critical" });
    if (site.uptime_status === "down")
      issues.push({ icon: <WifiOff size={12} className="text-red-500" />, title: "Site is currently down", site: site.name, href: `/sites/${site.id}?tab=uptime`, severity: "Critical" });
    const d = sslDaysRemaining(site.ssl_expiry_date);
    if (d !== null && d <= 30)
      issues.push({ icon: <Lock size={12} className="text-amber-500" />, title: `SSL expiring in ${d} day${d !== 1 ? "s" : ""}`, site: site.name, href: `/sites/${site.id}?tab=security`, severity: d <= 7 ? "Critical" : "Warning" });
    if (site.latest_scores) {
      if (site.latest_scores.performance < 50)
        issues.push({ icon: <Zap size={12} className="text-amber-500" />, title: "Low performance score", site: site.name, href: `/sites/${site.id}?tab=performance`, severity: "Warning" });
      if (site.latest_scores.seo < 50)
        issues.push({ icon: <Search size={12} className="text-amber-500" />, title: "Low SEO score", site: site.name, href: `/sites/${site.id}?tab=seo`, severity: "Warning" });
      if (site.latest_scores.security < 50)
        issues.push({ icon: <Shield size={12} className="text-amber-500" />, title: "Security score critical", site: site.name, href: `/sites/${site.id}?tab=security`, severity: "Critical" });
    }
    if (issues.length >= 6) break;
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Needs Attention</h3>
        {issues.length > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
            {issues.length} Issue{issues.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <Shield size={16} className="text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground text-center">All sites look healthy</p>
        </div>
      ) : (
        <div className="space-y-1">
          {issues.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.site}</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                item.severity === "Critical" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
              }`}>
                {item.severity}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Next Steps Panel ─────────────────────────────────────────────────────────
// Shown when a site is connected but has never been audited.
// Disappears once every connected site has at least one audit.

function NextStepsPanel({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null); // site id being triggered

  const needsAudit = sites.filter((s) => s.plugin_connected && !s.last_audit_at);
  if (needsAudit.length === 0) return null;

  async function runAudit(siteId: string) {
    setLoading(siteId);
    try {
      await api.post(`/audits/${siteId}/run`);
      router.push(`/sites/${siteId}`);
    } catch {
      setLoading(null);
    }
  }

  const single = needsAudit.length === 1;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <PlayCircle size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-900">
            {single
              ? `Run your first audit on ${needsAudit[0].name}`
              : `${needsAudit.length} connected sites haven't been audited yet`}
          </p>
          <p className="text-xs text-indigo-700 mt-0.5 mb-4 leading-relaxed">
            {single
              ? "The plugin is connected and ready. Run an audit to get your security score, SEO grade, performance metrics, and malware check."
              : "Run audits to get security scores, SEO grades, performance metrics, and malware checks for each site."}
          </p>

          {single ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => runAudit(needsAudit[0].id)}
                disabled={!!loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)" }}
              >
                {loading === needsAudit[0].id ? (
                  <><Loader2 size={14} className="animate-spin" /> Starting…</>
                ) : (
                  <><PlayCircle size={14} /> Run First Audit</>
                )}
              </button>
              <Link
                href={`/sites/${needsAudit[0].id}`}
                className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
              >
                View site <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAudit.map((site) => (
                <div key={site.id} className="flex items-center justify-between gap-3 bg-white/60 rounded-xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{site.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => runAudit(site.id)}
                      disabled={!!loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                      style={{ background: "var(--accent)" }}
                    >
                      {loading === site.id ? (
                        <><Loader2 size={12} className="animate-spin" /> Starting…</>
                      ) : (
                        <><PlayCircle size={12} /> Run Audit</>
                      )}
                    </button>
                    <Link
                      href={`/sites/${site.id}`}
                      className="text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { sites, portfolio, loading, error, refetch } = useSites();
  const { agency } = useAuth();
  const { roleCanDo } = useRole();
  const [showAdd, setShowAdd] = useState(false);

  const limit = agency ? PLAN_LIMITS[agency.plan] : 1;
  const atLimit = sites.length >= limit;
  const canAddSite = roleCanDo("add_site");
  const isIndividual = agency?.account_type === "individual";

  const connectedCount = sites.filter((s) => s.plugin_connected).length;
  const threatCount = sites.filter((s) => s.malware_status === "threat").length;
  const sitesWithScores = sites.filter((s) => s.latest_scores);

  const avgScore =
    sitesWithScores.length > 0
      ? Math.round(
          sitesWithScores.reduce((sum, s) => {
            const sc = s.latest_scores!;
            return sum + (sc.performance + sc.seo + sc.security + sc.malware) / 4;
          }, 0) / sitesWithScores.length
        )
      : null;

  const avgPillars =
    sitesWithScores.length > 0
      ? {
          performance: Math.round(sitesWithScores.reduce((s, a) => s + a.latest_scores!.performance, 0) / sitesWithScores.length),
          seo:         Math.round(sitesWithScores.reduce((s, a) => s + a.latest_scores!.seo,         0) / sitesWithScores.length),
          security:    Math.round(sitesWithScores.reduce((s, a) => s + a.latest_scores!.security,    0) / sitesWithScores.length),
          malware:     Math.round(sitesWithScores.reduce((s, a) => s + a.latest_scores!.malware,     0) / sitesWithScores.length),
        }
      : null;

  const avgUptime =
    sites.length > 0
      ? Math.round((sites.reduce((sum, s) => sum + (s.uptime_percentage ?? 100), 0) / sites.length) * 10) / 10
      : null;

  const lastAuditAt =
    sites.map((s) => s.last_audit_at).filter(Boolean).sort().reverse()[0] ?? null;

  // Trend: each site's latest score at its audit date — sorted chronologically
  const trendData = sitesWithScores
    .filter((s) => s.last_audit_at)
    .sort((a, b) => new Date(a.last_audit_at!).getTime() - new Date(b.last_audit_at!).getTime())
    .map((s) => {
      const sc = s.latest_scores!;
      return {
        month: new Date(s.last_audit_at!).toLocaleDateString("en-US", { month: "short" }),
        score: Math.round((sc.performance + sc.seo + sc.security + sc.malware) / 4),
      };
    });

  const scoreDelta =
    trendData.length >= 2
      ? trendData[trendData.length - 1].score - trendData[0].score
      : null;

  // Show chart even with a single audit — duplicate point to render a flat line
  const displayTrendData =
    trendData.length === 1
      ? [{ month: "—", score: trendData[0].score }, trendData[0]]
      : trendData;

  // Radar chart
  const radarData = avgPillars
    ? [
        { subject: "Performance", value: avgPillars.performance },
        { subject: "SEO",         value: avgPillars.seo },
        { subject: "Security",    value: avgPillars.security },
        { subject: "Malware",     value: avgPillars.malware },
      ]
    : [];

  // Scatter: performance score → approximate load time
  const scatterData = sitesWithScores.map((site, i) => ({
    x: i + 1,
    y: Math.round(2200 - (site.latest_scores!.performance / 100) * 1600),
    name: site.name,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <EmptyState
        icon={<Globe size={22} />}
        title="No sites yet"
        description={
          isIndividual
            ? "Add your WordPress site to start monitoring performance, SEO, security, and malware."
            : "Add your first client site to start monitoring performance, SEO, security, and malware."
        }
        action={
          canAddSite ? (
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={15} /> {isIndividual ? "Add my site" : "Add your first site"}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {atLimit && canAddSite && !isIndividual && (
        <UpgradeBanner
          message={`You've reached your ${limit}-site limit on the ${agency?.plan} plan.`}
        />
      )}

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isIndividual
            ? "Your site health overview and key metrics"
            : "Overview of all monitored sites and key metrics"}
        </p>
      </div>

      {/* ── Onboarding checklist (agency/team only) */}
      {agency && !agency.is_client_portal && (
        <OnboardingChecklist agency={agency} sites={sites} />
      )}

      {/* ── Next steps: run first audit (agency/team only) */}
      {!agency?.is_client_portal && (
        <NextStepsPanel sites={sites} />
      )}

      {/* ── Portfolio Health (agency/team only) */}
      {portfolio && !agency?.is_client_portal && <PortfolioHealthSection portfolio={portfolio} sites={sites} />}

      {/* ── 6 Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Health Score"
          value={avgScore !== null ? `${avgScore}/100` : "—"}
          sub={avgScore === null ? "No audits yet" : avgScore >= 80 ? "Healthy" : avgScore >= 50 ? "Needs Attention" : "Critical"}
          subColor={avgScore === null ? "muted" : avgScore >= 80 ? "green" : avgScore >= 50 ? "amber" : "red"}
          icon={<TrendingUp size={14} />}
          iconBg="#6366f1"
          miniGauge={avgScore ?? undefined}
          href="/sites"
        />
        <StatCard
          label="Total Sites"
          value={sites.length}
          sub="Active"
          subColor="green"
          icon={<Globe size={14} />}
          iconBg="#3b82f6"
          href="/sites"
        />
        <StatCard
          label="Threats Detected"
          value={threatCount}
          sub={threatCount === 0 ? "All Clear" : `${threatCount} site${threatCount > 1 ? "s" : ""} affected`}
          subColor={threatCount === 0 ? "green" : "red"}
          icon={<Shield size={14} />}
          iconBg={threatCount > 0 ? "#ef4444" : "#10b981"}
          href="/malware"
        />
        <StatCard
          label="Avg Uptime"
          value={avgUptime !== null ? `${avgUptime}%` : "—"}
          sub="30-day window"
          subColor="muted"
          icon={<Activity size={14} />}
          iconBg="#10b981"
          href="/uptime"
        />
        <StatCard
          label="Plugin Status"
          value={`${connectedCount}/${sites.length}`}
          sub={connectedCount === sites.length ? "All Connected" : `${sites.length - connectedCount} Not Connected`}
          subColor={connectedCount === sites.length ? "green" : "amber"}
          icon={<Puzzle size={14} />}
          iconBg={connectedCount === sites.length ? "#10b981" : "#f59e0b"}
          href="/sites"
        />
        <StatCard
          label="Last Audit"
          value={lastAuditAt ? timeAgo(lastAuditAt) : "Never"}
          sub={lastAuditAt ? fmtDate(lastAuditAt) : "Run your first audit"}
          subColor="muted"
          icon={<Clock size={14} />}
          iconBg="#6b7280"
          href="/sites"
        />
      </div>

      {/* ── 3 Chart Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Health Score Trend */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-semibold text-foreground">Health Score Trend</h3>
            {scoreDelta !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                scoreDelta >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}>
                {scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
          {displayTrendData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground text-center px-6 leading-relaxed">
              Run audits across your sites to start building the health score trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <AreaChart data={displayTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => [`${v}`, "Score"]}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Score by Pillar — Radar */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Score by Pillar</h3>
          <p className="text-xs text-muted-foreground mb-4">Performance, SEO, Security, Malware</p>
          {radarData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              No audit data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Radar
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="#6366f1"
                  fillOpacity={0.15}
                  dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Page Load Speed — Scatter */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-semibold text-foreground">Page Load Speed</h3>
            <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                &lt;1000ms
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                &gt;1000ms
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">ms per site (derived from score)</p>
          {scatterData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              No performance data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" dataKey="x" hide />
                <YAxis type="number" dataKey="y" domain={[400, 2400]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <ZAxis range={[55, 55]} />
                <Tooltip
                  cursor={false}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload as { name: string; y: number };
                    return (
                      <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-md">
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p className="text-muted-foreground">{d.y}ms</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={entry.y < 1000 ? "#16a34a" : "#dc2626"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom: Sites table + Needs Attention ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SitesOverviewCard sites={sites} />
        <NeedsAttentionCard sites={sites} />
      </div>

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onSuccess={(siteId) => { setShowAdd(false); router.push(`/sites/${siteId}`); }}
        />
      )}
    </div>
  );
}
