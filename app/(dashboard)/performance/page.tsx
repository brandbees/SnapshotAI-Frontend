"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
} from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreColor } from "@/lib/utils";
import type { Site } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

type SortKey = "name" | "performance" | "caching" | "last_scan";
type SortDir = "asc" | "desc";
type FilterTab = "all" | "good" | "warning" | "poor";

function scoreFilter(score: number | undefined): FilterTab {
  if (score === undefined) return "poor";
  if (score >= 80) return "good";
  if (score >= 50) return "warning";
  return "poor";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
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
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SortIcon({
  col,
  sortBy,
  dir,
}: {
  col: SortKey;
  sortBy: SortKey;
  dir: SortDir;
}) {
  if (sortBy !== col)
    return <ChevronsUpDown size={12} className="text-muted-foreground/50" />;
  return dir === "asc" ? (
    <ChevronUp size={12} className="text-accent" />
  ) : (
    <ChevronDown size={12} className="text-accent" />
  );
}

function CachingCell({ plugin }: { plugin: string | null | undefined }) {
  if (!plugin) {
    return (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          color: "var(--score-warn)",
          background: "var(--score-warn-bg, #fef3c7)",
        }}
      >
        None
      </span>
    );
  }
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        color: "var(--score-good)",
        background: "var(--score-good-bg)",
      }}
    >
      {plugin}
    </span>
  );
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "good", label: "Good (80+)" },
  { key: "warning", label: "Warning (50–79)" },
  { key: "poor", label: "Poor (<50)" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { sites, loading, error } = useSites();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortKey>("performance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sitesWithScores = useMemo(
    () => sites.filter((s) => s.latest_scores),
    [sites]
  );

  const avgScore =
    sitesWithScores.length > 0
      ? Math.round(
          sitesWithScores.reduce(
            (sum, s) => sum + (s.latest_scores?.performance ?? 0),
            0
          ) / sitesWithScores.length
        )
      : null;

  const noCacheCount = sites.filter((s) => !s.caching_plugin).length;

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? sites
        : sites.filter(
            (s) => scoreFilter(s.latest_scores?.performance) === filter
          );

    return [...base].sort((a: Site, b: Site) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      switch (sortBy) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "performance":
          va = a.latest_scores?.performance ?? -1;
          vb = b.latest_scores?.performance ?? -1;
          break;
        case "caching":
          va = a.caching_plugin ? 1 : 0;
          vb = b.caching_plugin ? 1 : 0;
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
  }, [sites, filter, sortBy, sortDir]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-surface">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          Intelligence
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          Performance Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Speed, caching, and real-user performance across all sites.
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
            icon={<Zap size={22} />}
            title="No sites yet"
            description="Add your first site to start tracking performance metrics."
          />
        )}

        {!loading && !error && sites.length > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="Avg Performance Score"
                value={avgScore ?? "—"}
                color={
                  avgScore !== null
                    ? scoreColor(avgScore)
                    : "var(--muted-foreground)"
                }
                sub={
                  sitesWithScores.length > 0
                    ? `Across ${sitesWithScores.length} audited site${sitesWithScores.length !== 1 ? "s" : ""}`
                    : "No audits yet"
                }
              />
              <StatCard
                label="Sites with No Caching Plugin"
                value={noCacheCount}
                color={
                  noCacheCount > 0
                    ? "var(--score-warn)"
                    : "var(--score-good)"
                }
              />
              <StatCard
                label="Sites Audited"
                value={sitesWithScores.length}
              />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit flex-wrap">
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
                      {
                        sites.filter(
                          (s) =>
                            scoreFilter(s.latest_scores?.performance) === key
                        ).length
                      }
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
                            <SortIcon
                              col="name"
                              sortBy={sortBy}
                              dir={sortDir}
                            />
                          </span>
                        </th>
                        <th
                          className={th}
                          onClick={() => toggleSort("performance")}
                        >
                          <span className="flex items-center gap-1.5">
                            Performance Score
                            <SortIcon
                              col="performance"
                              sortBy={sortBy}
                              dir={sortDir}
                            />
                          </span>
                        </th>
                        <th className={th}>Real-user LCP</th>
                        <th className={th}>CLS</th>
                        <th
                          className={th}
                          onClick={() => toggleSort("caching")}
                        >
                          <span className="flex items-center gap-1.5">
                            Caching Plugin
                            <SortIcon
                              col="caching"
                              sortBy={sortBy}
                              dir={sortDir}
                            />
                          </span>
                        </th>
                        <th className={th}>CDN</th>
                        <th
                          className={th}
                          onClick={() => toggleSort("last_scan")}
                        >
                          <span className="flex items-center gap-1.5">
                            Last Scan
                            <SortIcon
                              col="last_scan"
                              sortBy={sortBy}
                              dir={sortDir}
                            />
                          </span>
                        </th>
                        <th className="px-4 py-3 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((site) => {
                        const score = site.latest_scores?.performance;
                        return (
                          <tr
                            key={site.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-4 py-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/sites/${site.id}`}
                                  className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate block max-w-[200px]"
                                >
                                  {site.name}
                                </Link>
                                <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                                  {site.url.replace(/^https?:\/\//, "")}
                                </span>
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
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-muted-foreground text-xs">
                                — <span className="text-[10px]">(JS snippet)</span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-muted-foreground text-xs">—</span>
                            </td>
                            <td className="px-4 py-3">
                              <CachingCell plugin={site.caching_plugin} />
                            </td>
                            <td className="px-4 py-3">
                              {site.cdn_plugin ? (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    color: "var(--score-good)",
                                    background: "var(--score-good-bg)",
                                  }}
                                >
                                  {site.cdn_plugin}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {site.last_audit_at ? (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    site.last_audit_at
                                  ).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
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
