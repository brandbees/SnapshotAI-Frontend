"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe, Search, SlidersHorizontal, RefreshCw, ChevronDown,
  CheckSquare, Square, X, Tag, Loader2,
} from "lucide-react";

import api from "@/lib/api";
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

type FilterOption = "all" | "online" | "offline" | "seo_issues" | "perf_issues" | "healthy" | "warning" | "critical";
type BulkActionType = "run_audit" | "trigger_scan" | "send_report";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all",        label: "All Sites"      },
  { value: "healthy",    label: "Healthy"        },
  { value: "warning",    label: "Warning"        },
  { value: "critical",   label: "Critical"       },
  { value: "online",     label: "Online Only"    },
  { value: "offline",    label: "Offline Only"   },
  { value: "seo_issues", label: "SEO Issues"     },
  { value: "perf_issues",label: "Perf Issues"    },
];

const BULK_ACTIONS: { value: BulkActionType; label: string }[] = [
  { value: "run_audit",    label: "Run Audit"     },
  { value: "trigger_scan", label: "Trigger Scan"  },
  { value: "send_report",  label: "Send Report"   },
];

function siteHealthBucket(s: Site): "healthy" | "warning" | "critical" {
  if (s.overall_score == null) return "warning";
  if (s.overall_score >= 80) return "healthy";
  if (s.overall_score >= 50) return "warning";
  return "critical";
}

function applyFilter(sites: Site[], filter: FilterOption): Site[] {
  switch (filter) {
    case "healthy":     return sites.filter((s) => siteHealthBucket(s) === "healthy");
    case "warning":     return sites.filter((s) => siteHealthBucket(s) === "warning");
    case "critical":    return sites.filter((s) => siteHealthBucket(s) === "critical");
    case "online":      return sites.filter((s) => s.uptime_status === "up");
    case "offline":     return sites.filter((s) => s.uptime_status === "down");
    case "seo_issues":  return sites.filter((s) => (s.latest_scores?.seo ?? 100) < 80);
    case "perf_issues": return sites.filter((s) => (s.latest_scores?.performance ?? 100) < 80);
    default:            return sites;
  }
}

export default function SitesPage() {
  const router = useRouter();
  const { sites, loading, error } = useSites();
  const { agency } = useAuth();
  const { roleCanDo } = useRole();

  const [showAdd, setShowAdd]               = useState(false);
  const [search, setSearch]                 = useState("");
  const searchParams = useSearchParams();
  const [filter, setFilter]                 = useState<FilterOption>(() => {
    const p = searchParams.get("filter");
    const valid: FilterOption[] = ["all","healthy","warning","critical","online","offline","seo_issues","perf_issues"];
    return (valid.includes(p as FilterOption) ? p : "all") as FilterOption;
  });
  const [activeTag, setActiveTag]           = useState<string | null>(null);
  const [showFilter, setShowFilter]         = useState(false);
  const [showBulkMenu, setShowBulkMenu]     = useState(false);
  const [quickViewSiteId, setQuickViewSiteId] = useState<string | null>(null);
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading]       = useState(false);
  const [bulkMsg, setBulkMsg]               = useState<string | null>(null);

  const filterRef   = useRef<HTMLDivElement>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  const limit      = agency ? PLAN_LIMITS[agency.plan] : 1;
  const atLimit    = sites.length >= limit;
  const canAddSite = roleCanDo("add_site");

  // All unique tags across portfolio
  const allTags = Array.from(new Set(sites.flatMap((s) => s.tags ?? []))).sort();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))   setShowFilter(false);
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) setShowBulkMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset selection when sites change
  useEffect(() => { setSelected(new Set()); }, [sites]);

  const searched = search.trim()
    ? sites.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.url.toLowerCase().includes(search.toLowerCase())
      )
    : sites;

  const tagFiltered  = activeTag ? searched.filter((s) => s.tags?.includes(activeTag)) : searched;
  const filteredSites = applyFilter(tagFiltered, filter);
  const quickViewSite = quickViewSiteId ? sites.find((s) => s.id === quickViewSiteId) ?? null : null;
  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Filter";

  const allSelected = filteredSites.length > 0 && filteredSites.every((s) => selected.has(s.id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredSites.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredSites.forEach((s) => next.add(s.id));
        return next;
      });
    }
  }

  function toggleSite(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function executeBulkAction(action: BulkActionType) {
    if (selected.size === 0) return;
    setShowBulkMenu(false);
    setBulkLoading(true);
    setBulkMsg(null);
    try {
      const { data } = await api.post("/sites/bulk", {
        action,
        site_ids: Array.from(selected),
      });
      const label = BULK_ACTIONS.find((a) => a.value === action)?.label ?? action;
      setBulkMsg(`${label} queued for ${(data as { queued: number }).queued} site(s).`);
      setSelected(new Set());
      setTimeout(() => setBulkMsg(null), 4000);
    } catch {
      setBulkMsg("Bulk action failed. Please try again.");
      setTimeout(() => setBulkMsg(null), 4000);
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Sites</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage and monitor all your WordPress sites
        </p>
      </div>

      {/* Search + actions row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
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
              showFilter ? "border-accent text-accent bg-accent/5" : "border-border bg-white text-foreground hover:bg-gray-50"
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
                    filter === opt.value ? "bg-accent/10 text-accent font-medium" : "text-foreground hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Select all + Bulk actions — hidden for clients */}
        {!agency?.is_client_portal && filteredSites.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-white text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
            title={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected
              ? <CheckSquare size={14} className="text-accent" />
              : <Square size={14} className="text-muted-foreground" />}
            <span className="hidden sm:inline">{selected.size > 0 ? `${selected.size} selected` : "Select"}</span>
          </button>
        )}

        {!agency?.is_client_portal && selected.size > 0 && (
          <div className="relative" ref={bulkMenuRef}>
            <button
              onClick={() => setShowBulkMenu((v) => !v)}
              disabled={bulkLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Bulk Actions
              <ChevronDown size={13} className={`transition-transform ${showBulkMenu ? "rotate-180" : ""}`} />
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-border shadow-lg z-30 overflow-hidden">
                {BULK_ACTIONS.map((action) => (
                  <button
                    key={action.value}
                    onClick={() => executeBulkAction(action.value)}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
                  >
                    {action.label}
                    <span className="text-xs text-muted-foreground ml-1.5">({selected.size})</span>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={() => setSelected(new Set())}
                    className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-gray-50 flex items-center gap-2"
                  >
                    <X size={12} /> Clear selection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={13} className="text-muted-foreground shrink-0" />
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
              activeTag === null
                ? "bg-accent text-white border-accent"
                : "bg-white text-foreground border-border hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-foreground border-border hover:bg-gray-50"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action feedback */}
      {bulkMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
          bulkMsg.includes("failed") ? "bg-red-50 border-red-200 text-red-700" : "bg-[var(--accent-light)] border-[var(--accent)]/20 text-[var(--accent-hover)]"
        }`}>
          <RefreshCw size={14} className="shrink-0" />
          {bulkMsg}
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
          {filteredSites.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sites match the current filter.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map((site) => (
              <div key={site.id} className="relative group">
                {/* Checkbox overlay — hidden for clients */}
                {!agency?.is_client_portal && (
                  <button
                    onClick={() => toggleSite(site.id)}
                    className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-all border shadow-sm ${
                      selected.has(site.id)
                        ? "bg-accent border-accent text-white opacity-100"
                        : "bg-white border-border text-transparent group-hover:opacity-100 opacity-0"
                    }`}
                  >
                    {selected.has(site.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                )}

                {/* Tag chips on card */}
                {site.tags && site.tags.length > 0 && (
                  <div className="absolute top-3 right-3 z-10 flex gap-1 flex-wrap justify-end max-w-[60%]">
                    {site.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                        {tag}
                      </span>
                    ))}
                    {site.tags.length > 2 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                        +{site.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                <div className={`transition-all ${selected.has(site.id) ? "ring-2 ring-accent rounded-2xl" : ""}`}>
                  <SiteCard
                    site={site}
                    onClick={() => setQuickViewSiteId(site.id)}
                  />
                </div>
              </div>
            ))}

            {/* Dashed "Add New Site" card */}
            {canAddSite && !atLimit && filter === "all" && !search && !activeTag && selected.size === 0 && (
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

      {quickViewSite && (
        <SiteQuickViewDrawer
          site={quickViewSite}
          onClose={() => setQuickViewSiteId(null)}
        />
      )}

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onSuccess={(siteId) => { setShowAdd(false); router.push(`/sites/${siteId}`); }}
        />
      )}
    </div>
  );
}
