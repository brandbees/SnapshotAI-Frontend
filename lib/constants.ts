export const API_BASE_URL =
 process.env.NEXT_PUBLIC_API_URL || "https://snapshotai.vps.webdock.cloud/api";

export const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  freemium: 3,
  premium: 10,
  agency_plus: 50,
};

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  premium: "Premium",
  agency_plus: "Agency+",
};

export const AUDIT_POLL_INTERVAL_MS = 3000;

export const SCORE_THRESHOLDS = {
  good: 80,
  warn: 50,
} as const;
