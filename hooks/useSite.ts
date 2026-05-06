"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { mapSite, mapAudit, type RawSite, type RawAudit } from "@/lib/mappers";
import type { Site, Audit } from "@/types";

interface SiteDetail extends Site {
  audits: Audit[];
}

interface RawSiteDetailResponse {
  site: RawSite;
  audits: RawAudit[];
  scans: unknown[];
}

export function useSite(id: string) {
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<RawSiteDetailResponse>(`/sites/${id}`);
      const mapped = mapSite(data.site);
      const audits = (data.audits ?? []).map(mapAudit);

      // GET /api/sites/:id doesn't join score columns onto the site row.
      // Derive latest_scores from the most recent completed audit instead.
      if (!mapped.latest_scores) {
        const latestCompleted = audits.find(
          (a) => a.status === "completed" && a.scores
        );
        if (latestCompleted?.scores) {
          mapped.latest_scores = latestCompleted.scores;
        }
      }

      setSite({ ...mapped, audits });
    } catch {
      setError("Failed to load site details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { site, loading, error, refetch: fetch };
}
