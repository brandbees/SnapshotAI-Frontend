"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { mapSite, mapAudit, mapScan, type RawSite, type RawAudit, type RawScan } from "@/lib/mappers";
import { cacheGet, cacheSet, cacheClear } from "@/lib/dataCache";
import type { Site, Audit, ScanResult } from "@/types";

export interface SiteDetail extends Site {
  audits: Audit[];
  scans: ScanResult[];
}

interface RawSiteDetailResponse {
  site: RawSite;
  audits: RawAudit[];
  scans: RawScan[];
}

export function useSite(id: string) {
  const cacheKey = `site:${id}`;
  const cached = cacheGet<SiteDetail>(cacheKey);

  const [site, setSite] = useState<SiteDetail | null>(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (invalidate = false) => {
    if (!id) return;
    if (invalidate) cacheClear(cacheKey);
    setError(null);
    if (!cacheGet(cacheKey)) setLoading(true);
    try {
      const { data } = await api.get<RawSiteDetailResponse>(`/sites/${id}`);
      const mapped = mapSite(data.site);
      const audits = (data.audits ?? []).map(mapAudit);
      const scans = (data.scans ?? []).map(mapScan);

      if (!mapped.latest_scores) {
        const latestCompleted = audits.find(
          (a) => a.status === "completed" && a.scores
        );
        if (latestCompleted?.scores) {
          mapped.latest_scores = latestCompleted.scores;
        }
      }

      const detail: SiteDetail = { ...mapped, audits, scans };
      setSite(detail);
      cacheSet<SiteDetail>(cacheKey, detail);
    } catch {
      setError("Failed to load site details.");
    } finally {
      setLoading(false);
    }
  }, [id, cacheKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    function handleRefresh() { fetch(true); }
    window.addEventListener("bb:refresh", handleRefresh);
    return () => window.removeEventListener("bb:refresh", handleRefresh);
  }, [fetch]);

  return { site, loading, error, refetch: fetch };
}
