import type { Agency } from "@/types";

const TOKEN_KEY    = "bb_token";
const AGENCY_KEY   = "bb_agency";
const BRANDING_KEY = "bb_branding";

export interface StoredBranding {
  accent_color: string | null;
  logo_url:     string | null;
  favicon_url:  string | null;
  brand_name:   string | null;
}

// ── Token ──────────────────────────────────────────────────────────────────

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
  // bb_branding is intentionally kept so the login page retains agency branding after logout
}

// ── Agency ─────────────────────────────────────────────────────────────────

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
  saveBranding({
    accent_color: agency.accent_color ?? null,
    logo_url:     agency.logo_url ?? null,
    favicon_url:  agency.favicon_url ?? null,
    brand_name:   agency.brand_name ?? agency.name ?? null,
  });
  applyAgencyBranding(agency);
}

// ── Branding (persists across logout so login page keeps agency look) ──────

export function saveBranding(b: StoredBranding): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BRANDING_KEY, JSON.stringify(b));
}

export function getBranding(): StoredBranding | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BRANDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredBranding;
  } catch {
    return null;
  }
}

export function applyStoredBranding(): void {
  const b = getBranding();
  if (!b) return;
  if (b.accent_color) {
    document.documentElement.style.setProperty("--accent", b.accent_color);
  }
}

export function applyAgencyBranding(agency: Agency): void {
  if (agency.accent_color) {
    document.documentElement.style.setProperty("--accent", agency.accent_color);
  }
}

// ── JWT expiry ─────────────────────────────────────────────────────────────

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken() && !isTokenExpired();
}
