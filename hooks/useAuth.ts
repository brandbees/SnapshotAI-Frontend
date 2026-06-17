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

  async function login(email: string, password: string, cfTurnstileToken?: string | null): Promise<void> {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password, cf_turnstile_token: cfTurnstileToken });
    setToken(data.token);
    setAgency(data.agency);
    setAgencyState(data.agency);
  }

  // Phase 1 — returns { pending: true, email } if OTP was sent, throws on error
  async function register(
    agencyName: string,
    email: string,
    password: string,
    coupon?: string,
    cfTurnstileToken?: string | null,
    accountType?: "agency" | "individual"
  ): Promise<{ pending: boolean; email: string }> {
    const { data } = await api.post<{ pending: boolean; email: string }>("/auth/register", {
      agency_name: agencyName,
      email,
      password,
      coupon_code: coupon,
      cf_turnstile_token: cfTurnstileToken,
      account_type: accountType ?? "agency",
    });
    return data;
  }

  // Phase 2 — confirms OTP, receives token, logs in
  async function verifyEmail(email: string, code: string): Promise<void> {
    const { data } = await api.post<AuthResponse>("/auth/verify-email", { email, code });
    setToken(data.token);
    setAgency(data.agency);
    setAgencyState(data.agency);
  }

  async function resendCode(email: string): Promise<void> {
    await api.post("/auth/resend-code", { email });
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

  return {
    agency, loading, isLoggedIn,
    login, register, verifyEmail, resendCode,
    logout, updateAgency, refreshAgency,
  };
}
