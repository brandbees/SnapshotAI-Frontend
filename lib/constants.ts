export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://snapshotai.vps.webdock.cloud/api";

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
  free: ["1 site", "1 seat", "Manual audits only", "Basic reports", "1,000 AI tokens/mo"],
  freemium: ["10 sites", "3 seats", "Scheduled audits", "White-label reports", "Email alerts", "Team management", "5,000 AI tokens/mo"],
  premium: ["50 sites", "10 seats", "Everything in Starter", "PDF reports", "Client portal", "Safe plugin updates with auto-rollback", "Automated site backups & restores", "Priority support", "20,000 AI tokens/mo"],
  agency_plus: ["Unlimited sites", "Unlimited seats", "Everything in Growth", "Agent AI", "Custom domain", "Dedicated support", "100,000 AI tokens/mo"],
};

// Monthly AI token budget per plan (must match AI_TOKEN_LIMITS in routes/agent.js and usageService.js)
export const PLAN_TOKEN_LIMITS: Record<string, number> = {
  free:         1_000,
  freemium:     5_000,
  premium:     20_000,
  agency:      50_000,
  agency_plus: 100_000,
};

// R2 storage quota per plan in bytes (must match usageService.js on the backend)
export const PLAN_STORAGE_LIMITS: Record<string, number> = {
  free:            104_857_600,   //  100 MB
  freemium:        524_288_000,   //  500 MB
  premium:       1_073_741_824,   //    1 GB
  agency:        2_147_483_648,   //    2 GB
  agency_plus:   5_368_709_120,   //    5 GB
};

export const AUDIT_POLL_INTERVAL_MS = 3000;

export const SCORE_THRESHOLDS = {
  good: 80,
  warn: 50,
} as const;
