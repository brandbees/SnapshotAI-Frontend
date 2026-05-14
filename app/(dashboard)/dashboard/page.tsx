"use client";

import { useState } from "react";
import {
  Plus,
  Globe,
  Search,
  Shield,
  Zap,
  AlertTriangle,
  TrendingUp,
  WifiOff,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";
import { AddSiteModal } from "@/components/sites/AddSiteModal";
import { Button } from "@/components/ui/Button";
import { PLAN_LIMITS } from "@/lib/constants";
import { scoreColor } from "@/lib/utils";
import type { Site } from "@/types";

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}

function StatCard({ label, value, sub, icon, accent = "var(--accent)" }: StatCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none tabular-nums">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Portfolio Health Score ────────────────────────────────────────────────────

function PortfolioHealthScore({ sites }: { sites: Site[] }) {
  const sitesWithScores = sites.filter((s) => s.latest_scores);
  if (sitesWithScores.length === 0) return null;

  const avg = Math.round(
    sitesWithScores.reduce((sum, s) => {
      const sc = s.latest_scores!;
      return sum + (sc.performance + sc.seo + sc.security + sc.malware) / 4;
    }, 0) / sitesWithScores.length
  );

  const label =
    avg >= 80 ? "Healthy" : avg >= 50 ? "Needs Attention" : "Critical";
  const variant: "good" | "warn" | "bad" =
    avg >= 80 ? "good" : avg >= 50 ? "warn" : "bad";

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-xs p-6 flex flex-col items-center justify-center gap-3 h-full">
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        Portfolio Health
      </p>
      <ScoreGauge
        score={avg}
        label="Overall"
        sublabel={label}
        sublabelVariant={variant}
        size="lg"
      />
      <p className="text-xs text-muted-foreground">
        Weighted avg across {sitesWithScores.length} audited site
        {sitesWithScores.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ── Alerts Summary ────────────────────────────────────────────────────────────

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

interface AlertRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sub: string;
  href: string;
}

function AlertRow({ icon, iconBg, label, sub, href }: AlertRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 -mx-4 px-4 transition-colors"
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </Link>
  );
}

function AlertsSummary({ sites }: { sites: Site[] }) {
  const threats = sites.filter((s) => s.malware_status === "threat");
  const down = sites.filter((s) => s.uptime_status === "down");
  const sslExpiring = sites.filter((s) => {
    const d = sslDaysRemaining(s.ssl_expiry_date);
    return d !== null && d <= 30;
  });

  const all = [...threats, ...down, ...sslExpiring];
  const unique = [...new Map(all.map((s) => [s.id, s])).values()];

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-xs p-5 h-full">
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
        Critical Alerts
      </p>
      {unique.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <Shield size={16} className="text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            All sites look healthy
          </p>
        </div>
      ) : (
        <div>
          {threats.slice(0, 3).map((s) => (
            <AlertRow
              key={`threat-${s.id}`}
              icon={<Shield size={13} className="text-red-500" />}
              iconBg="#fee2e2"
              label={s.name}
              sub="Malware threat detected"
              href={`/sites/${s.id}`}
            />
          ))}
          {down.slice(0, 3).map((s) => (
            <AlertRow
              key={`down-${s.id}`}
              icon={<WifiOff size={13} className="text-red-500" />}
              iconBg="#fee2e2"
              label={s.name}
              sub="Site is currently down"
              href={`/sites/${s.id}`}
            />
          ))}
          {sslExpiring.slice(0, 3).map((s) => {
            const d = sslDaysRemaining(s.ssl_expiry_date)!;
            return (
              <AlertRow
                key={`ssl-${s.id}`}
                icon={<Lock size={13} className="text-amber-500" />}
                iconBg="#fef3c7"
                label={s.name}
                sub={`SSL expiring in ${d} day${d !== 1 ? "s" : ""}`}
                href={`/sites/${s.id}`}
              />
            );
          })}
          {unique.length > 9 && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              +{unique.length - 9} more — check{" "}
              <Link href="/security" className="text-accent hover:underline">
                Security Dashboard
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pillar Bar ────────────────────────────────────────────────────────────────

function PillarBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-bold tabular-nums w-8 text-right"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ── Attention Item ────────────────────────────────────────────────────────────

function AttentionItem({ site }: { site: Site }) {
  const issues: string[] = [];
  if (site.malware_status === "threat") issues.push("Malware threat");
  if (site.latest_scores) {
    if (site.latest_scores.performance < 50) issues.push("Low perf");
    if (site.latest_scores.seo < 50) issues.push("Low SEO");
    if (site.latest_scores.security < 50) issues.push("Security risk");
    if (site.latest_scores.malware < 50) issues.push("Malware risk");
  }
  return (
    <Link
      href={`/sites/${site.id}`}
      className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 -mx-4 px-4 transition-colors"
    >
      <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle size={12} className="text-red-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{site.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{issues.join(" · ")}</p>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { sites, loading, error, refetch } = useSites();
  const { agency } = useAuth();
  const { roleCanDo } = useRole();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const limit = agency ? PLAN_LIMITS[agency.plan] : 1;
  const atLimit = sites.length >= limit;
  const canAddSite = roleCanDo("add_site");

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
          performance: Math.round(
            sitesWithScores.reduce((s, a) => s + a.latest_scores!.performance, 0) /
              sitesWithScores.length
          ),
          seo: Math.round(
            sitesWithScores.reduce((s, a) => s + a.latest_scores!.seo, 0) /
              sitesWithScores.length
          ),
          security: Math.round(
            sitesWithScores.reduce((s, a) => s + a.latest_scores!.security, 0) /
              sitesWithScores.length
          ),
          malware: Math.round(
            sitesWithScores.reduce((s, a) => s + a.latest_scores!.malware, 0) /
              sitesWithScores.length
          ),
        }
      : null;

  const needsAttention = sites.filter(
    (s) =>
      s.malware_status === "threat" ||
      (s.latest_scores &&
        (s.latest_scores.performance < 50 ||
          s.latest_scores.seo < 50 ||
          s.latest_scores.security < 50 ||
          s.latest_scores.malware < 50))
  );

  const filtered = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {atLimit && (
        <UpgradeBanner
          message={`You've reached your ${limit}-site limit on the ${agency?.plan} plan.`}
        />
      )}

      {/* Page header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-surface">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          Overview
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            Portfolio Overview
          </h1>
          {canAddSite && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setShowAdd(true)}
                disabled={atLimit}
                size="md"
                title={atLimit ? "Upgrade to add more sites" : undefined}
              >
                <Plus size={15} />
                Add Site
              </Button>
            </div>
          )}
        </div>

        {sites.length > 0 && (
          <div className="relative mt-4 sm:hidden">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              placeholder="Search sites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-muted border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && sites.length === 0 && (
          <EmptyState
            icon={<Globe size={22} />}
            title="No sites yet"
            description="Add your first client site to start monitoring performance, SEO, security, and malware."
            action={canAddSite ? (
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={15} />
                Add your first site
              </Button>
            ) : undefined}
          />
        )}

        {/* Portfolio health gauge + critical alerts */}
        {!loading && sites.length > 0 && sitesWithScores.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <PortfolioHealthScore sites={sites} />
            <div className="lg:col-span-2 h-full">
              <AlertsSummary sites={sites} />
            </div>
          </div>
        )}

        {/* KPI stat cards */}
        {!loading && sites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Sites"
              value={sites.length}
              icon={<Globe size={18} />}
              accent="var(--accent)"
            />
            <StatCard
              label="Plugin Connected"
              value={`${connectedCount} / ${sites.length}`}
              sub={
                connectedCount === sites.length
                  ? "All connected"
                  : `${sites.length - connectedCount} pending`
              }
              icon={<Zap size={18} />}
              accent="#10b981"
            />
            <StatCard
              label="Threats Detected"
              value={threatCount}
              sub={
                threatCount === 0
                  ? "All sites clean"
                  : `${threatCount} site${threatCount > 1 ? "s" : ""} affected`
              }
              icon={<Shield size={18} />}
              accent={threatCount > 0 ? "#ef4444" : "#10b981"}
            />
            <StatCard
              label="Avg Overall Score"
              value={avgScore ?? "—"}
              sub={
                sitesWithScores.length > 0
                  ? `Across ${sitesWithScores.length} audited site${sitesWithScores.length > 1 ? "s" : ""}`
                  : "No audits yet"
              }
              icon={<TrendingUp size={18} />}
              accent={avgScore ? scoreColor(avgScore) : "var(--muted-foreground)"}
            />
          </div>
        )}

        {/* Pillar health + needs attention */}
        {!loading && avgPillars && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-surface border border-border rounded-2xl shadow-xs p-5">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-4">
                Average Pillar Health
              </p>
              <div className="space-y-3.5">
                <PillarBar label="Performance" score={avgPillars.performance} />
                <PillarBar label="SEO" score={avgPillars.seo} />
                <PillarBar label="Security" score={avgPillars.security} />
                <PillarBar label="Malware Score" score={avgPillars.malware} />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl shadow-xs p-5">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-4">
                Needs Attention
              </p>
              {needsAttention.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                    <Shield size={16} className="text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    All sites look healthy
                  </p>
                </div>
              ) : (
                <div>
                  {needsAttention.slice(0, 5).map((s) => (
                    <AttentionItem key={s.id} site={s} />
                  ))}
                  {needsAttention.length > 5 && (
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      +{needsAttention.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search bar (desktop) */}
        {!loading && sites.length > 0 && (
          <div className="hidden sm:block">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                All Sites
              </p>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  placeholder="Search sites..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-muted border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface w-52"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search empty state */}
        {!loading && filtered.length === 0 && sites.length > 0 && (
          <EmptyState
            icon={<Search size={20} />}
            title="No results"
            description={`No sites match "${search}"`}
          />
        )}

        {/* Site cards grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
