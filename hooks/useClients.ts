"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { Client } from "@/types";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ clients: Client[] }>("/clients");
      setClients(data.clients);
    } catch {
      setError("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { clients, loading, error, refetch: fetch };
}
