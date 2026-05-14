"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, AlertCircle, X, Tag, CreditCard, Users, Globe, Zap } from "lucide-react";
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
            style={{
              width: `${pct}%`,
              background: isNearLimit ? "var(--score-bad)" : "var(--accent)",
            }}
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

function BillingPage() {
  const { agency, refreshAgency } = useAuth();
  const searchParams = useSearchParams();
  const verifiedRef = useRef(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [seatsUsed, setSeatsUsed] = useState(1);
  const [annual, setAnnual] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const currentPlan = (agency?.plan ?? "free") as PlanKey;
  const sitesLimit = PLAN_LIMITS[currentPlan] ?? 1;
  const seatsLimit = PLAN_SEATS[currentPlan] ?? 1;
  const trialDays = agency?.trial_ends_at ? getDaysRemaining(agency.trial_ends_at) : null;
  const onTrial = trialDays !== null && currentPlan === "free";

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    api.get<{ sites: Site[] }>("/sites").then(({ data }) => setSites(data.sites ?? [])).catch(() => {});
    api.get<{ seats_used: number }>("/team").then(({ data }) => setSeatsUsed(data.seats_used)).catch(() => {});

    const sessionId = searchParams.get("session_id");
    const isSuccess = searchParams.get("success") === "true";

    if (isSuccess && sessionId && !verifiedRef.current) {
      verifiedRef.current = true;
      api.post("/billing/verify-session", { session_id: sessionId })
        .then(() => refreshAgency())
        .then(() => {
          // Reload without URL params so TopBar and all components pick up the new plan
          window.location.replace("/billing?upgraded=true");
        })
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

  async function handleCouponRedeem() {
    if (!couponCode.trim()) return;
    setRedeemLoading(true);
    try {
      const { data } = await api.post<{ plan: string; sites_limit: number }>("/billing/coupons/redeem", {
        code: couponCode.trim(),
      });
      showToast("success", `Coupon applied! Your plan has been upgraded to ${PLAN_LABELS[data.plan]}.`);
      setCouponCode("");
      // Refresh page to pick up new plan from auth
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Invalid coupon code.";
      showToast("error", msg);
    } finally {
      setRedeemLoading(false);
    }
  }

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
          trialDays === 0
            ? "bg-red-50 border border-red-200"
            : "bg-amber-50 border border-amber-200"
        }`}>
          <CreditCard size={20} className={trialDays === 0 ? "text-red-600 shrink-0" : "text-amber-600 shrink-0"} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${trialDays === 0 ? "text-red-800" : "text-amber-800"}`}>
              {trialDays === 0
                ? "Your trial has ended"
                : `${trialDays} day${trialDays !== 1 ? "s" : ""} remaining in your free trial`}
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
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-2xl font-bold text-foreground">{PLAN_LABELS[currentPlan]}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {PLAN_PRICES[currentPlan].monthly === 0
                ? "Free forever"
                : `$${PLAN_PRICES[currentPlan].monthly}/month`}
            </p>
          </div>
          {currentPlan !== "free" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">
              Active
            </span>
          )}
        </div>
        <div className="space-y-3">
          <UsageBar used={sites.length} total={sitesLimit} label="Sites" />
          <UsageBar used={seatsUsed} total={seatsLimit} label="Team seats" />
        </div>
      </Card>

      {/* Plan comparison */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">Available Plans</p>
          {/* Annual toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-muted-foreground">Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${annual ? "bg-[var(--accent)]" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${annual ? "translate-x-4" : ""}`} />
            </button>
            <span className="text-xs text-muted-foreground">
              Annual <span className="text-green-600 font-semibold">−15%</span>
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan === currentPlan;
            const price = annual ? PLAN_PRICES[plan].annual : PLAN_PRICES[plan].monthly;
            const isDowngrade = PLANS.indexOf(plan) < PLANS.indexOf(currentPlan);
            return (
              <div
                key={plan}
                className={`rounded-2xl border p-5 flex flex-col gap-4 ${
                  isCurrent
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-border bg-white"
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
                  {annual && price > 0 && (
                    <p className="text-xs text-muted-foreground">billed annually</p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check size={12} className="text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && !isDowngrade && plan !== "free" && (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan)}
                    loading={checkoutLoading === plan}
                  >
                    Upgrade
                  </Button>
                )}
                {isCurrent && (
                  <div className="text-center text-xs text-muted-foreground py-1">Your current plan</div>
                )}
                {isDowngrade && !isCurrent && (
                  <div className="text-center text-xs text-muted-foreground py-1">Lower tier</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick feature overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Globe, title: `${sitesLimit >= 9999 ? "Unlimited" : sitesLimit} sites`, sub: "Monitored and audited" },
          { icon: Users, title: `${seatsLimit >= 9999 ? "Unlimited" : seatsLimit} seats`, sub: "Team members included" },
          { icon: Zap, title: "Scheduled audits", sub: currentPlan === "free" ? "Upgrade to enable" : "Weekly & monthly" },
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
        <CardHeader>
          <CardTitle>Redeem Coupon</CardTitle>
        </CardHeader>
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
          <Button onClick={handleCouponRedeem} loading={redeemLoading} disabled={!couponCode.trim()}>
            Apply
          </Button>
        </div>
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
