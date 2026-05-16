"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Search, SlidersHorizontal, RefreshCw, ChevronDown } from "lucide-react";

import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { SiteQuickViewDrawer } from "@/components/sites/SiteQuickViewDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AddSiteModal } from "@/components/sites/AddSiteModal";
import { PLAN_LIMITS } from "@/lib/constants";
import type { Site } from "@/types";

type FilterOption = "all" | "online" | "offline" | "seo_issues" | "perf_issues";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All Sites" },
  { value: "online", label: "Online Only" },
  { value: "offline", label: "Offline Only" },
  { value: "seo_issues", label: "SEO Issues" },
  { value: "perf_issues", label: "Perf Issues" },
];

function applyFilter(sites: Site[], filter: FilterOption): Site[] {
  switch (filter) {
    case "online":
      return sites.filter((s) => s.uptime_status === "up");
    case "offline":
      return sites.filter((s) => s.uptime_status === "down");
    case "seo_issues":
      return sites.filter((s) => (s.latest_scores?.seo ?? 100) < 80);
    case "perf_issues":
      return sites.filter((s) => (s.latest_scores?.performance ?? 100) < 80);
    default:
      return sites;
  }
}

export default function SitesPage() {
  const { sites, loading, error, refetch } = useSites();
  const { agency } = useAuth();
  const { roleCanDo } = useRole();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [quickViewSiteId, setQuickViewSiteId] = useState<string | null>(null);
  const [auditAllMsg, setAuditAllMsg] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  function handleAuditAll() {
    if (sites.length === 0) return;
    if (sites.length === 1) {
      window.location.href = `/sites/${sites[0].id}`;
      return;
    }
    setAuditAllMsg(true);
    setTimeout(() => setAuditAllMsg(false), 3500);
  }

  const limit = agency ? PLAN_LIMITS[agency.plan] : 1;
  const atLimit = sites.length >= limit;
  const canAddSite = roleCanDo("add_site");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    if (showFilter) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilter]);

  const searched = search.trim()
    ? sites.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.url.toLowerCase().includes(search.toLowerCase())
      )
    : sites;

  const filteredSites = applyFilter(searched, filter);
  const quickViewSite = quickViewSiteId ? sites.find((s) => s.id === quickViewSiteId) ?? null : null;
  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Filter";

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Sites</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage and monitor all your WordPress sites
        </p>
      </div>

      {/* Search + actions row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilter
                ? "border-accent text-accent bg-accent/5"
                : "border-border bg-white text-foreground hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal size={14} />
            {filter === "all" ? "Filter" : activeFilterLabel}
            <ChevronDown size={13} className={`transition-transform duration-150 ${showFilter ? "rotate-180" : ""}`} />
          </button>

          {showFilter && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-border shadow-lg z-30 overflow-hidden">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setFilter(opt.value); setShowFilter(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    filter === opt.value
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-foreground hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleAuditAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <RefreshCw size={14} className={auditAllMsg ? "animate-spin" : ""} />
          {auditAllMsg ? "Queued…" : "Audit All"}
        </button>
      </div>

      {/* Audit All toast */}
      {auditAllMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-700 font-medium">
          <RefreshCw size={14} className="animate-spin shrink-0" />
          Audits queued for all {sites.length} sites — open each site to view progress.
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && sites.length === 0 && (
        <EmptyState
          icon={<Globe size={20} />}
          title="No sites yet"
          description="Add your first site to start monitoring."
          action={
            canAddSite ? (
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                Add site
              </button>
            ) : undefined
          }
        />
      )}

      {!loading && sites.length > 0 && (
        <>
          {filteredSites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sites match the current filter.
            </p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                onClick={() => setQuickViewSiteId(site.id)}
              />
            ))}

            {/* Dashed "Add New Site" card */}
            {canAddSite && !atLimit && filter === "all" && !search && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors min-h-[260px] group"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
                  <Globe size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                    Add New Site
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Connect a WordPress site</p>
                </div>
              </button>
            )}
          </div>
        </>
      )}

      {/* Quick View Drawer */}
      {quickViewSite && (
        <SiteQuickViewDrawer
          site={quickViewSite}
          onClose={() => setQuickViewSiteId(null)}
        />
      )}

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </div>
  );
}
