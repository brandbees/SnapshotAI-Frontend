"use client";

import { useState, useEffect } from "react";
import { getAgency, getToken, setAgency, setToken, clearToken } from "@/lib/auth";
import api from "@/lib/api";
import type { Agency, AuthResponse } from "@/types";

export function useAuth() {
  const [agency, setAgencyState] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getAgency();
    setAgencyState(stored);
    setLoading(false);
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setToken(data.token);
    setAgency(data.agency);
    setAgencyState(data.agency);
  }

  async function register(
    agencyName: string,
    email: string,
    password: string,
    coupon?: string
  ): Promise<void> {
    const { data } = await api.post<AuthResponse>("/auth/register", {
      agency_name: agencyName,
      email,
      password,
      coupon,
    });
    setToken(data.token);
    setAgency(data.agency);
    setAgencyState(data.agency);
  }

  function logout(): void {
    clearToken();
    setAgencyState(null);
    window.location.href = "/login";
  }

  function updateAgency(updates: Partial<Agency>): void {
    setAgencyState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setAgency(updated);
      return updated;
    });
  }

  async function refreshAgency(): Promise<void> {
    try {
      const { data } = await api.get<{ agency: Agency }>("/auth/me");
      setAgency(data.agency);
      setAgencyState(data.agency);
    } catch {
      // token expired or network error — leave existing state
    }
  }

  const isLoggedIn = !!getToken();

  return { agency, loading, isLoggedIn, login, register, logout, updateAgency, refreshAgency };
}
