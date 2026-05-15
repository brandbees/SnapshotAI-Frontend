export const API_BASE_URL =
 process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  freemium: 10,
  premium: 50,
  agency_plus: 9999,
};

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Starter",
  premium: "Growth",
  agency_plus: "Agency+",
};

export const PLAN_SEATS: Record<string, number> = {
  free: 1,
  freemium: 3,
  premium: 10,
  agency_plus: 9999,
};

export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  freemium: { monthly: 29, annual: 24 },
  premium: { monthly: 79, annual: 67 },
  agency_plus: { monthly: 149, annual: 126 },
};

export const PLAN_FEATURES: Record<string, string[]> = {
  free: ["1 site", "1 seat", "Manual audits only", "Basic reports"],
  freemium: ["10 sites", "3 seats", "Scheduled audits", "White-label reports", "Email alerts", "Team management"],
  premium: ["50 sites", "10 seats", "Everything in Starter", "PDF reports", "Client portal", "Priority support"],
  agency_plus: ["Unlimited sites", "Unlimited seats", "Everything in Growth", "AI agent", "Custom domain", "Dedicated support"],
};

export const AUDIT_POLL_INTERVAL_MS = 3000;

export const SCORE_THRESHOLDS = {
  good: 80,
  warn: 50,
} as const;
