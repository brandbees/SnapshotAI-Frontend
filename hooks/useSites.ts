"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { mapSite, type RawSite } from "@/lib/mappers";
import { cacheGet, cacheSet, cacheClear } from "@/lib/dataCache";
import type { Site } from "@/types";

export interface PortfolioStats {
  total_sites: number;
  healthy: number;
  warning: number;
  critical: number;
  avg_score: number | null;
  malware_detected: number;
  sites_down: number;
  ssl_expiring: number;
}

const CACHE_KEY = "sites";

type SitesCache = { sites: Site[]; portfolio: PortfolioStats | null };

export function useSites() {
  const cached = cacheGet<SitesCache>(CACHE_KEY);
  const [sites, setSites] = useState<Site[]>(cached?.data.sites ?? []);
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(cached?.data.portfolio ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (invalidate = false) => {
    if (invalidate) cacheClear(CACHE_KEY);
    setError(null);
    if (!cacheGet(CACHE_KEY)) setLoading(true);
    try {
      const { data } = await api.get<{ sites: RawSite[]; portfolio?: PortfolioStats } | RawSite[]>("/sites");
      const raw: RawSite[] = Array.isArray(data)
        ? data
        : (data as { sites: RawSite[] }).sites ?? [];
      const mappedSites = raw.map(mapSite);
      const portf = !Array.isArray(data)
        ? (data as { portfolio?: PortfolioStats }).portfolio ?? null
        : null;
      setSites(mappedSites);
      setPortfolio(portf);
      cacheSet<SitesCache>(CACHE_KEY, { sites: mappedSites, portfolio: portf });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bb:data-fetched", { detail: { key: CACHE_KEY, fetchedAt: Date.now() } })
        );
      }
    } catch {
      setError("Failed to load sites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    function handleRefresh() { fetch(true); }
    window.addEventListener("bb:refresh", handleRefresh);
    return () => window.removeEventListener("bb:refresh", handleRefresh);
  }, [fetch]);

  // Poll every 30s while any site is not yet connected so the dashboard
  // reflects plugin connection without requiring a manual refresh.
  useEffect(() => {
    const hasDisconnected = sites.some((s) => !s.plugin_connected);
    if (!hasDisconnected) return;
    const id = setInterval(() => fetch(true), 30_000);
    return () => clearInterval(id);
  }, [sites, fetch]);

  return { sites, portfolio, loading, error, refetch: fetch };
}
