import type { Agency } from "@/types";

const TOKEN_KEY = "bb_token";
const AGENCY_KEY = "bb_agency";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AGENCY_KEY);
}

export function getAgency(): Agency | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AGENCY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Agency;
  } catch {
    return null;
  }
}

export function setAgency(agency: Agency): void {
  localStorage.setItem(AGENCY_KEY, JSON.stringify(agency));
  applyAgencyBranding(agency);
}

export function applyAgencyBranding(agency: Agency): void {
  if (agency.accent_color) {
    document.documentElement.style.setProperty(
      "--accent",
      agency.accent_color
    );
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
