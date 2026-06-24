"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check, AlertCircle, X, Tag, CreditCard, Users, Globe, Zap,
  Brain, HardDrive, Receipt, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { PLAN_LABELS, PLAN_LIMITS, PLAN_SEATS, PLAN_PRICES, PLAN_FEATURES } from "@/lib/constants";
import type { Site } from "@/types";

const PLANS = ["free", "freemium", "premium", "agency_plus"] as const;
type PlanKey = typeof PLANS[number];

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenPackage {
  tokens:      number;
  price_cents: number;
  label:       string;
}

interface StoragePackage {
  bytes:       number;
  price_cents: number;
  label:       string;
}

interface PlanLimits {
  tokens:  number;
  storage: number;
}

interface BillingEvent {
  id:               string;
  type:             "subscription" | "token_topup" | "storage_addon";
  plan:             string | null;
  tokens:           number | null;
  bytes:            number | null;
  amount_cents:     number;
  currency:         string;
  status:           string;
  created_at:       string;
  stripe_session_id: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total >= 9999 ? 0 : Math.min(100, (used / total) * 100);
  const isNearLimit = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">
          {used} / {total >= 9999 ? "∞" : total}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        {total < 9999 && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: isNearLimit ? "var(--score-bad)" : "var(--accent)" }}
          />
        )}
      </div>
    </div>
  );
}

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

const TX_TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  subscription:  { label: "Plan",         color: "bg-blue-100 text-blue-700",   icon: CreditCard },
  token_topup:   { label: "AI Tokens",    color: "bg-purple-100 text-purple-700", icon: Brain },
  storage_addon: { label: "Storage",      color: "bg-emerald-100 text-emerald-700", icon: HardDrive },
};

// ── Main component ────────────────────────────────────────────────────────────

function BillingPage() {
  const { agency, refreshAgency } = useAuth();
  const searchParams = useSearchParams();
  const verifiedRef  = useRef(false);

  const [sites, setSites]             = useState<Site[]>([]);
  const [seatsUsed, setSeatsUsed]     = useState(1);
  const [couponCode, setCouponCode]   = useState("");
  const [redeemLoading, setRedeemLoading]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [addonLoading, setAddonLoading]       = useState<string | null>(null);
  const [toast, setToast]             = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Live data from API
  const [tokenPkgs, setTokenPkgs]     = useState<Record<string, TokenPackage>>({});
  const [storagePkgs, setStoragePkgs] = useState<Record<string, StoragePackage>>({});
  const [planLimits, setPlanLimits]   = useState<Record<string, PlanLimits>>({});
  const [history, setHistory]         = useState<BillingEvent[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [liveTokenState, setLiveTokenState] = useState<{
    tokens_used: number; tokens_limit: number; tokens_extra: number;
    extra_remaining: number; monthly_limit: number;
  } | null>(null);

  const currentPlan = (agency?.plan ?? "free") as PlanKey;
  const sitesLimit  = PLAN_LIMITS[currentPlan] ?? 1;
  const seatsLimit  = PLAN_SEATS[currentPlan] ?? 1;
  const trialDays   = agency?.trial_ends_at ? getDaysRemaining(agency.trial_ends_at) : null;
  const onTrial     = trialDays !== null && currentPlan === "free";

  // Dynamic limits with fallback to built-in constants
  const dynTokenLimit   = planLimits[currentPlan]?.tokens  ?? 0;
  const dynStorageLimit = planLimits[currentPlan]?.storage ?? 524_288_000;

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    api.get<{ sites: Site[] }>("/sites").then(({ data }) => setSites(data.sites ?? [])).catch(() => {});
    api.get<{ seats_used: number }>("/team").then(({ data }) => setSeatsUsed(data.seats_used)).catch(() => {});

    // Live package prices and plan limits from backend (master-configurable)
    api.get<{ packages: Record<string, TokenPackage> }>("/billing/tokens/packages")
      .then(({ data }) => setTokenPkgs(data.packages)).catch(() => {});
    api.get<{ packages: Record<string, StoragePackage> }>("/billing/storage/packages")
      .then(({ data }) => setStoragePkgs(data.packages)).catch(() => {});
    api.get<{ limits: Record<string, PlanLimits> }>("/billing/limits")
      .then(({ data }) => setPlanLimits(data.limits)).catch(() => {});

    // Purchase history
    api.get<{ history: BillingEvent[] }>("/billing/history")
      .then(({ data }) => { setHistory(data.history); setHistoryLoaded(true); }).catch(() => setHistoryLoaded(true));

    // Plan upgrade success flow
    const sessionId = searchParams.get("session_id");
    const isSuccess = searchParams.get("success") === "true";

    if (isSuccess && sessionId && !verifiedRef.current) {
      verifiedRef.current = true;
      api.post("/billing/verify-session", { session_id: sessionId })
        .then(() => refreshAgency())
        .then(() => { window.location.replace("/billing?upgraded=true"); })
        .catch(() => refreshAgency());
    } else if (searchParams.get("upgraded") === "true") {
      refreshAgency();
      showToast("success", "Plan upgraded successfully!");
    } else {
      refreshAgency();
    }
  }, []);

  async function handleUpgrade(plan: string) {
    setCheckoutLoading(plan);
    try {
      const { data } = await api.post<{ url: string }>("/billing/checkout", { plan });
      window.location.href = data.url;
    } catch {
      showToast("error", "Failed to start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  }

  async function handleAddonCheckout(type: "tokens" | "storage", pkg: string) {
    setAddonLoading(pkg);
    try {
      const endpoint = type === "tokens" ? "/billing/tokens/checkout" : "/billing/storage/checkout";
      const { data } = await api.post<{ url: string }>(endpoint, { package: pkg });
      window.location.href = data.url;
    } catch {
      showToast("error", "Failed to start checkout. Please try again.");
      setAddonLoading(null);
    }
  }

  async function handleCouponRedeem() {
    if (!couponCode.trim()) return;
    setRedeemLoading(true);
    try {
      const { data } = await api.post<{ plan: string; sites_limit: number }>("/billing/coupons/redeem", {
        code: couponCode.trim(),
      });
      showToast("success", `Coupon applied! Your plan has been upgraded to ${PLAN_LABELS[data.plan]}.`);
      setCouponCode("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Invalid coupon code.";
      showToast("error", msg);
    } finally {
      setRedeemLoading(false);
    }
  }

  const tokenPackageList = Object.entries(tokenPkgs).map(([key, pkg]) => ({ key, ...pkg }));
  const storagePackageList = Object.entries(storagePkgs).map(([key, pkg]) => ({ key, ...pkg }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader title="Billing" description="Manage your plan and usage." />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={12} /></button>
        </div>
      )}

      {/* Trial banner */}
      {onTrial && trialDays !== null && (
        <div className={`rounded-xl px-5 py-4 flex items-center gap-4 ${
          trialDays === 0 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
        }`}>
          <CreditCard size={20} className={trialDays === 0 ? "text-red-600 shrink-0" : "text-amber-600 shrink-0"} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${trialDays === 0 ? "text-red-800" : "text-amber-800"}`}>
              {trialDays === 0 ? "Your trial has ended" : `${trialDays} day${trialDays !== 1 ? "s" : ""} remaining in your free trial`}
            </p>
            <p className={`text-xs mt-0.5 ${trialDays === 0 ? "text-red-700" : "text-amber-700"}`}>
              {trialDays === 0
                ? "Add a payment method to continue using SnapshotAI."
                : "Upgrade now to keep your data and settings after the trial ends."}
            </p>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-2xl font-bold text-foreground">{PLAN_LABELS[currentPlan]}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {PLAN_PRICES[currentPlan].monthly === 0 ? "Free forever" : `$${PLAN_PRICES[currentPlan].monthly}/month`}
            </p>
          </div>
          {currentPlan !== "free" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">Active</span>
          )}
        </div>
        <div className="space-y-3">
          <UsageBar used={sites.length} total={sitesLimit} label="Sites" />
          <UsageBar used={seatsUsed} total={seatsLimit} label="Team seats" />
        </div>
      </Card>

      {/* AI Token usage */}
      {(() => {
        const tokenExtra      = agency?.ai_tokens_extra      ?? 0;
        const tokenExtraUsed  = agency?.ai_tokens_extra_used ?? 0;
        const tokenUsed       = agency?.ai_tokens_used       ?? 0;
        const tokenTotal      = dynTokenLimit + tokenExtra;
        // Compute actual remaining: base headroom this month + extra headroom (lifetime)
        const baseHeadroom    = Math.max(0, dynTokenLimit - tokenUsed);
        const extraHeadroom   = Math.max(0, tokenExtra - tokenExtraUsed);
        const actualRemaining = baseHeadroom + extraHeadroom;
        const effectiveUsed   = Math.max(0, tokenTotal - actualRemaining);
        const tokenPct        = tokenTotal > 0 ? Math.min(100, (effectiveUsed / tokenTotal) * 100) : 0;
        const tokenWarn       = tokenPct >= 80;
        const resetAt    = agency?.ai_tokens_reset_at
          ? new Date(agency.ai_tokens_reset_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })
          : null;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-muted-foreground" />
                  <CardTitle>AI Tokens</CardTitle>
                </div>
                {resetAt && <span className="text-xs text-muted-foreground">Resets monthly · last reset {resetAt}</span>}
              </div>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    {fmtTokens(effectiveUsed)} used of {fmtTokens(tokenTotal)} tokens
                    {tokenExtra > 0 && <span className={`ml-1 ${extraHeadroom <= 0 ? "text-red-500" : "text-indigo-500"}`}>(+{fmtTokens(tokenExtra)} extra)</span>}
                  </span>
                  <span className={`text-xs font-semibold ${tokenWarn ? "text-red-600" : "text-foreground"}`}>
                    {tokenPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${tokenPct}%`, background: tokenWarn ? "var(--score-bad)" : "var(--accent)" }} />
                </div>
                {tokenWarn && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} /> Running low — buy more to keep generating narratives.
                  </p>
                )}
              </div>

              {tokenPackageList.length > 0 ? (
                <div className={`grid gap-3 ${tokenPackageList.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {tokenPackageList.map(({ key, tokens, price_cents }) => (
                    <button key={key} onClick={() => handleAddonCheckout("tokens", key)}
                      disabled={addonLoading === key}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors disabled:opacity-50">
                      <span className="text-xs font-semibold text-foreground">{fmtTokens(tokens)} tokens</span>
                      <span className="text-[11px] text-muted-foreground">{fmtCents(price_cents)} · never expire</span>
                      {addonLoading === key
                        ? <span className="text-[10px] text-[var(--accent)]">Redirecting…</span>
                        : <span className="text-[10px] text-[var(--accent)] font-medium">Buy →</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Token packages loading…</p>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Storage usage */}
      {(() => {
        const storageExtra = agency?.storage_extra_bytes ?? 0;
        const storageUsed  = agency?.storage_used_bytes  ?? 0;
        const storageTotal = dynStorageLimit + storageExtra;
        const storagePct   = storageTotal > 0 ? Math.min(100, (storageUsed / storageTotal) * 100) : 0;
        const storageWarn  = storagePct >= 80;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive size={15} className="text-muted-foreground" />
                <CardTitle>Storage</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(storageUsed)} used of {formatBytes(storageTotal)}
                    {storageExtra > 0 && <span className="ml-1 text-indigo-500">(+{formatBytes(storageExtra)} extra)</span>}
                  </span>
                  <span className={`text-xs font-semibold ${storageWarn ? "text-red-600" : "text-foreground"}`}>
                    {storagePct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${storagePct}%`, background: storageWarn ? "var(--score-bad)" : "var(--accent)" }} />
                </div>
                {storageWarn && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} /> Storage almost full — reports and backups may stop saving soon.
                  </p>
                )}
              </div>

              {storagePackageList.length > 0 ? (
                <div className={`grid gap-3 ${storagePackageList.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {storagePackageList.map(({ key, bytes, price_cents }) => (
                    <button key={key} onClick={() => handleAddonCheckout("storage", key)}
                      disabled={addonLoading === key}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors disabled:opacity-50">
                      <span className="text-xs font-semibold text-foreground">{formatBytes(bytes)}</span>
                      <span className="text-[11px] text-muted-foreground">{fmtCents(price_cents)} · never expires</span>
                      {addonLoading === key
                        ? <span className="text-[10px] text-[var(--accent)]">Redirecting…</span>
                        : <span className="text-[10px] text-[var(--accent)] font-medium">Buy →</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Storage packages loading…</p>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Plan comparison */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-4">Available Plans</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent  = plan === currentPlan;
            const price      = PLAN_PRICES[plan].monthly;
            const isDowngrade = PLANS.indexOf(plan) < PLANS.indexOf(currentPlan);
            const limits     = planLimits[plan];
            return (
              <div
                key={plan}
                className={`rounded-2xl border p-5 flex flex-col gap-4 ${
                  isCurrent ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-border bg-white"
                }`}
              >
                {isCurrent && (
                  <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--accent)] text-white">
                    Current
                  </span>
                )}
                <div>
                  <p className="font-bold text-foreground">{PLAN_LABELS[plan]}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {price === 0 ? "Free" : `$${price}`}
                    {price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                  </p>
                  {limits && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Brain size={10} /> {fmtTokens(limits.tokens)} AI tokens/mo
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <HardDrive size={10} /> {formatBytes(limits.storage)} storage
                      </p>
                    </div>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check size={12} className="text-green-500 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && !isDowngrade && plan !== "free" && (
                  <Button className="w-full" onClick={() => handleUpgrade(plan)} loading={checkoutLoading === plan}>
                    Upgrade
                  </Button>
                )}
                {isCurrent && <div className="text-center text-xs text-muted-foreground py-1">Your current plan</div>}
                {isDowngrade && !isCurrent && <div className="text-center text-xs text-muted-foreground py-1">Lower tier</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Globe,  title: `${sitesLimit >= 9999 ? "Unlimited" : sitesLimit} sites`, sub: "Monitored and audited" },
          { icon: Users,  title: `${seatsLimit >= 9999 ? "Unlimited" : seatsLimit} seats`, sub: "Team members included" },
          { icon: Zap,    title: "Scheduled audits", sub: currentPlan === "free" ? "Upgrade to enable" : "Weekly & monthly" },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coupon code */}
      <Card>
        <CardHeader><CardTitle>Redeem Coupon</CardTitle></CardHeader>
        <div className="flex gap-3 items-start">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="ENTER-COUPON-CODE"
              className="pl-8 font-mono uppercase tracking-widest"
              onKeyDown={(e) => e.key === "Enter" && handleCouponRedeem()}
            />
          </div>
          <Button onClick={handleCouponRedeem} loading={redeemLoading} disabled={!couponCode.trim()}>Apply</Button>
        </div>
      </Card>

      {/* Purchase history */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-muted-foreground" />
            <CardTitle>Purchase History</CardTitle>
          </div>
        </CardHeader>
        {!historyLoaded ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <Receipt size={28} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No purchases yet — token and storage top-ups will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Details</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => {
                  const meta = TX_TYPE_META[tx.type] ?? TX_TYPE_META.subscription;
                  const Icon = meta.icon;
                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          <Icon size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">
                        {tx.type === "token_topup"   && tx.tokens && `+${fmtTokens(tx.tokens)} tokens`}
                        {tx.type === "storage_addon"  && tx.bytes  && `+${formatBytes(tx.bytes)} storage`}
                        {tx.type === "subscription"   && tx.plan   && `${PLAN_LABELS[tx.plan] ?? tx.plan} plan`}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-foreground text-xs">
                        {fmtCents(tx.amount_cents, tx.currency)}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {tx.stripe_session_id && (
                          <a
                            href={`https://dashboard.stripe.com/payments/${tx.stripe_session_id}`}
                            target="_blank" rel="noreferrer"
                            className="ml-2 inline-flex items-center opacity-40 hover:opacity-100 transition-opacity"
                            title="View in Stripe"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <BillingPage />
    </Suspense>
  );
}
