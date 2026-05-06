"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { mapSite, type RawSite } from "@/lib/mappers";
import type { Site } from "@/types";

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ sites: RawSite[] } | RawSite[]>("/sites");
      const raw: RawSite[] = Array.isArray(data)
        ? data
        : (data as { sites: RawSite[] }).sites ?? [];
      setSites(raw.map(mapSite));
    } catch {
      setError("Failed to load sites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { sites, loading, error, refetch: fetch };
}
