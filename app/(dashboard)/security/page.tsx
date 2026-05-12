"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreColor } from "@/lib/utils";
import type { Site } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function siteSeverity(site: Site): "critical" | "warning" | "healthy" {
  const score = site.latest_scores?.security ?? null;
  const isThreat = site.malware_status === "threat";
  const sslDays = sslDaysRemaining(site.ssl_expiry_date);
  if (isThreat || score === null || score < 50 || (sslDays !== null && sslDays <= 7)) {
    return "critical";
  }
  if (score < 80 || (sslDays !== null && sslDays <= 30)) {
    return "warning";
  }
  return "healthy";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl px-5 py-4 shadow-xs">
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: color || "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

type SortKey = "name" | "security" | "malware" | "ssl" | "last_scan";
type SortDir = "asc" | "desc";

function SortIcon({
  col,
  sortBy,
  dir,
}: {
  col: SortKey;
  sortBy: SortKey;
  dir: SortDir;
}) {
  if (sortBy !== col) return <ChevronsUpDown size={12} className="text-muted-foreground/50" />;
  return dir === "asc" ? (
    <ChevronUp size={12} className="text-accent" />
  ) : (
    <ChevronDown size={12} className="text-accent" />
  );
}

function IndicatorDot({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div
      className="w-2.5 h-2.5 rounded-full mx-auto"
      style={{ background: value ? "var(--score-bad)" : "var(--score-good)" }}
    />
  );
}

function SslCell({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  const days = sslDaysRemaining(date);
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;

  const color =
    days <= 7
      ? "var(--score-bad)"
      : days <= 30
      ? "var(--score-warn)"
      : "var(--score-good)";

  return (
    <span className="text-xs font-medium tabular-nums" style={{ color }}>
      {days <= 0 ? "Expired" : `${days}d`}
    </span>
  );
}

function MalwareCell({ status }: { status: Site["malware_status"] }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const isClean = status === "clean";
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        color: isClean ? "var(--score-good)" : "var(--score-bad)",
        background: isClean ? "var(--score-good-bg)" : "var(--score-bad-bg)",
      }}
    >
      {isClean ? "CLEAN" : "THREAT"}
    </span>
  );
}

type FilterTab = "all" | "critical" | "warning" | "healthy";

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "Warning" },
  { key: "healthy", label: "Healthy" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const { sites, loading, error } = useSites();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortKey>("security");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sitesWithSeverity = useMemo(
    () => sites.map((s) => ({ ...s, _severity: siteSeverity(s) })),
    [sites]
  );

  const criticalCount = sitesWithSeverity.filter(
    (s) => s._severity === "critical"
  ).length;
  const malwareCount = sites.filter((s) => s.malware_status === "threat").length;
  const sslExpiring = sites.filter((s) => {
    const d = sslDaysRemaining(s.ssl_expiry_date);
    return d !== null && d <= 30;
  }).length;

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? sitesWithSeverity
        : sitesWithSeverity.filter((s) => s._severity === filter);

    return [...base].sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      switch (sortBy) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "security":
          va = a.latest_scores?.security ?? -1;
          vb = b.latest_scores?.security ?? -1;
          break;
        case "malware":
          va = a.malware_status === "threat" ? 0 : 1;
          vb = b.malware_status === "threat" ? 0 : 1;
          break;
        case "ssl":
          va = sslDaysRemaining(a.ssl_expiry_date) ?? 9999;
          vb = sslDaysRemaining(b.ssl_expiry_date) ?? 9999;
          break;
        case "last_scan":
          va = a.last_audit_at ?? "";
          vb = b.last_audit_at ?? "";
          break;
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sitesWithSeverity, filter, sortBy, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  const th =
    "px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors";
  const thCenter = th + " text-center";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-surface">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          Intelligence
        </p>
        <h1 className="text-2xl font-bold text-foreground">Security Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Security scores, malware status, and vulnerability signals across all sites.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
            icon={<Shield size={22} />}
            title="No sites yet"
            description="Add your first site to start monitoring security signals."
          />
        )}

        {!loading && !error && sites.length > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Sites" value={sites.length} />
              <StatCard
                label="Critical Issues"
                value={criticalCount}
                color={criticalCount > 0 ? "var(--score-bad)" : "var(--score-good)"}
              />
              <StatCard
                label="Malware Detected"
                value={malwareCount}
                color={malwareCount > 0 ? "var(--score-bad)" : "var(--score-good)"}
              />
              <StatCard
                label="SSL Expiring ≤30d"
                value={sslExpiring}
                color={sslExpiring > 0 ? "var(--score-warn)" : "var(--score-good)"}
              />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit">
              {filterTabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={[
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                    filter === key
                      ? "bg-surface text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                  {key !== "all" && (
                    <span className="ml-1.5 text-[10px] tabular-nums opacity-60">
                      {sitesWithSeverity.filter((s) => s._severity === key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No sites in this category.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/40">
                      <tr>
                        <th
                          className={th}
                          onClick={() => toggleSort("name")}
                        >
                          <span className="flex items-center gap-1.5">
                            Site
                            <SortIcon col="name" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th
                          className={th}
                          onClick={() => toggleSort("security")}
                        >
                          <span className="flex items-center gap-1.5">
                            Security Score
                            <SortIcon col="security" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th
                          className={thCenter}
                          onClick={() => toggleSort("malware")}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            Malware
                            <SortIcon col="malware" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th className={thCenter}>XML-RPC</th>
                        <th className={thCenter}>File Editor</th>
                        <th
                          className={th}
                          onClick={() => toggleSort("ssl")}
                        >
                          <span className="flex items-center gap-1.5">
                            SSL Expiry
                            <SortIcon col="ssl" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th className={thCenter}>Default Login</th>
                        <th
                          className={th}
                          onClick={() => toggleSort("last_scan")}
                        >
                          <span className="flex items-center gap-1.5">
                            Last Scan
                            <SortIcon col="last_scan" sortBy={sortBy} dir={sortDir} />
                          </span>
                        </th>
                        <th className="px-4 py-3 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((site) => {
                        const score = site.latest_scores?.security;
                        const severity = site._severity;
                        return (
                          <tr
                            key={site.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {severity === "critical" && (
                                  <AlertTriangle
                                    size={13}
                                    className="shrink-0"
                                    style={{ color: "var(--score-bad)" }}
                                  />
                                )}
                                <div className="min-w-0">
                                  <Link
                                    href={`/sites/${site.id}`}
                                    className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate block max-w-[180px]"
                                  >
                                    {site.name}
                                  </Link>
                                  <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
                                    {site.url.replace(/^https?:\/\//, "")}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {score !== undefined ? (
                                <span
                                  className="text-sm font-bold tabular-nums"
                                  style={{ color: scoreColor(score) }}
                                >
                                  {score}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <MalwareCell status={site.malware_status} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <IndicatorDot value={site.xml_rpc_enabled} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <IndicatorDot value={site.file_editor_enabled} />
                            </td>
                            <td className="px-4 py-3">
                              <SslCell date={site.ssl_expiry_date} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <IndicatorDot value={site.login_url_default} />
                            </td>
                            <td className="px-4 py-3">
                              {site.last_audit_at ? (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(site.last_audit_at).toLocaleDateString(
                                    "en-GB",
                                    { day: "numeric", month: "short" }
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/sites/${site.id}`}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent"
                              >
                                <ExternalLink size={14} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
