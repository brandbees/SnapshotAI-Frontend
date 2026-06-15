"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, TrendingUp, CreditCard, Users,
  RefreshCw, Tag, Zap, HardDrive, ShoppingBag,
  ArrowUpRight, Brain, Cloud, Filter,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlanRow {
  plan: string; agency_count: number; stripe_count: number;
  price: number; mrr: number; mrr_stripe: number;
}
interface MonthlyPoint  { month: string; new_paid: number }
interface CouponImpact  { code: string; plan: string; max_uses: number; used_count: number; expires_at: string | null; redemptions: number }
interface StripeStats   { paid_total: number; has_stripe: number; has_sub: number; active_trials: number }
interface AddonStats {
  token_revenue_cents_total:   number;
  storage_revenue_cents_total: number;
  addon_revenue_cents_total:   number;
  tokens_sold_total:           number;
  bytes_sold_total:            number;
  token_purchases_total:       number;
  storage_purchases_total:     number;
  addon_revenue_cents_month:   number;
  addon_purchases_month:       number;
}
interface Transaction {
  id: string; type: string; plan: string | null;
  tokens: number | null; bytes: number | null;
  amount_cents: number; currency: string; status: string;
  created_at: string; agency_name: string | null;
  agency_email: string | null; agency_id: string | null;
  stripe_session_id: string | null;
}
interface MonthlyAddon { month: string; token_cents: number; storage_cents: number; total_cents: number; tx_count: number }

interface RevenueData {
  plans:          PlanRow[];
  total_mrr:      number;
  total_mrr_stripe: number;
  monthly_trend:  MonthlyPoint[];
  coupon_impact:  CouponImpact[];
  stripe:         StripeStats;
  addon_stats:    AddonStats;
  recent_tx:      Transaction[];
  monthly_addon:  MonthlyAddon[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";
const PLAN_LABELS: Record<string, string> = { freemium: "Starter", premium: "Growth", agency: "Agency", agency_plus: "Agency+" };
const PLAN_COLORS: Record<string, string> = { freemium: "#3b82f6", premium: "#8b5cf6", agency: "#64748b", agency_plus: "#f59e0b" };
const TX_TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  subscription:  { label: "Plan Upgrade",    color: "#10b981", icon: CreditCard },
  token_topup:   { label: "Token Top-up",    color: "#8b5cf6", icon: Brain      },
  storage_addon: { label: "Storage Add-on",  color: "#3b82f6", icon: Cloud      },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(cents: number) { return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtMRR$(n: number)  { return `$${n.toLocaleString("en-US")}`; }
function fmtTokens(n: number) { if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`; return String(n); }
function formatBytes(b: number) { if (b < 1024) return `${b} B`; if (b < 1024**2) return `${(b/1024).toFixed(0)} KB`; if (b < 1024**3) return `${(b/1024**2).toFixed(1)} MB`; return `${(b/1024**3).toFixed(2)} GB`; }
function fmtDate(d: string)  { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
function planLabel(p: string) { return PLAN_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
function planColor(p: string) { return PLAN_COLORS[p] ?? "#64748b"; }
function txMeta(type: string) { return TX_TYPE_META[type] ?? { label: type, color: "#94a3b8", icon: ShoppingBag }; }

type TxFilter = "all" | "subscription" | "token_topup" | "storage_addon";

// ── Component ────────────────────────────────────────────────────────────────

export default function MasterRevenuePage() {
  const router  = useRouter();
  const [data,    setData]    = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<TxFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await masterApi.get<RevenueData>("/master/revenue");
      setData(d);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mrr  = data?.total_mrr ?? 0;
  const arr  = mrr * 12;
  const as   = data?.addon_stats;

  const filteredTx = (data?.recent_tx ?? []).filter(t => txFilter === "all" || t.type === txFilter);

  // Merge monthly_addon into monthly_trend for the combined chart
  const combinedMonthly = (data?.monthly_trend ?? []).map(pt => {
    const addon = data?.monthly_addon?.find(a => a.month === pt.month);
    return { ...pt, addon_cents: addon?.total_cents ?? 0 };
  });

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Revenue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data ? (
                <>
                  <span className="font-semibold text-foreground">{fmtMRR$(mrr)}</span> est. MRR ·{" "}
                  <span className="font-semibold text-green-600">{fmtMRR$(arr)}</span> ARR ·{" "}
                  <span className="font-semibold">{data.stripe.paid_total}</span> paid agencies ·{" "}
                  <span className="font-semibold text-purple-600">{fmt$(as?.addon_revenue_cents_total ?? 0)}</span> add-on revenue all-time
                </>
              ) : <span className="inline-block w-72 h-4 bg-gray-100 rounded animate-pulse" />}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-gray-50 text-xs font-semibold text-muted-foreground">
              <CreditCard size={12} className="text-green-500" />
              <span className="text-foreground">{data?.stripe.has_sub ?? "—"}</span>
              <span>active subs</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-gray-50 text-xs font-semibold text-muted-foreground">
              <Users size={12} style={{ color: AMBER }} />
              <span className="text-foreground">{data?.stripe.active_trials ?? "—"}</span>
              <span>on trial</span>
            </div>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-muted-foreground hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Est. MRR",        value: loading ? "—" : fmtMRR$(mrr),                           icon: DollarSign,  color: AMBER,     bg: "rgba(245,158,11,0.08)"  },
          { label: "Est. ARR",        value: loading ? "—" : fmtMRR$(arr),                           icon: TrendingUp,  color: "#10b981", bg: "rgba(16,185,129,0.08)"  },
          { label: "Paid Agencies",   value: loading ? "—" : String(data?.stripe.paid_total ?? 0),   icon: Users,       color: "#8b5cf6", bg: "rgba(139,92,246,0.08)"  },
          { label: "Active Subs",     value: loading ? "—" : String(data?.stripe.has_sub ?? 0),      icon: CreditCard,  color: "#3b82f6", bg: "rgba(59,130,246,0.08)"  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add-on revenue strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label:    "Add-on Revenue (all time)",
            value:    loading ? "—" : fmt$(as?.addon_revenue_cents_total ?? 0),
            sub:      loading ? "" : `${fmt$(as?.addon_revenue_cents_month ?? 0)} this month`,
            icon:     ShoppingBag,
            color:    "#f59e0b",
            bg:       "rgba(245,158,11,0.08)",
          },
          {
            label:    "Token Revenue",
            value:    loading ? "—" : fmt$(as?.token_revenue_cents_total ?? 0),
            sub:      loading ? "" : `${as?.token_purchases_total ?? 0} purchases`,
            icon:     Brain,
            color:    "#8b5cf6",
            bg:       "rgba(139,92,246,0.08)",
          },
          {
            label:    "Storage Revenue",
            value:    loading ? "—" : fmt$(as?.storage_revenue_cents_total ?? 0),
            sub:      loading ? "" : `${as?.storage_purchases_total ?? 0} purchases`,
            icon:     HardDrive,
            color:    "#3b82f6",
            bg:       "rgba(59,130,246,0.08)",
          },
          {
            label:    "Total Tokens Sold",
            value:    loading ? "—" : fmtTokens(as?.tokens_sold_total ?? 0),
            sub:      loading ? "" : `${formatBytes(as?.bytes_sold_total ?? 0)} storage sold`,
            icon:     Zap,
            color:    "#10b981",
            bg:       "rgba(16,185,129,0.08)",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground leading-tight">{label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Monthly new paid agencies (trend) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">New Paid Agencies — Last 12 Months</p>
          {loading ? <div className="h-52 bg-gray-50 rounded-xl animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={combinedMonthly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={AMBER} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={AMBER} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: number, name: string) => [name === "new_paid" ? v : fmt$(v as number), name === "new_paid" ? "New paid" : "Add-on $"]) as any} />
                <Area type="monotone" dataKey="new_paid" stroke={AMBER} strokeWidth={2}
                  fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan MRR breakdown */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">MRR by Plan</p>
          {loading ? <div className="h-52 bg-gray-50 rounded-xl animate-pulse" /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data?.plans ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="plan" tickFormatter={planLabel} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: number, _: string, p: { payload?: PlanRow }) => [`${fmtMRR$(v)} (${p.payload?.agency_count ?? 0} agencies)`, "MRR"]) as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={((p: string) => planLabel(p)) as any} />
                  <Bar dataKey="mrr" radius={[6, 6, 0, 0]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    shape={((props: { x: number; y: number; width: number; height: number; payload: PlanRow }) => (
                      <rect x={props.x} y={props.y} width={props.width} height={Math.max(0, props.height)} rx={6} ry={6} fill={planColor(props.payload.plan)} />
                    )) as any}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {(data?.plans ?? []).map(r => (
                  <div key={r.plan} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: planColor(r.plan) }} />
                      <span className="font-medium text-foreground">{planLabel(r.plan)}</span>
                      <span className="text-muted-foreground">{r.agency_count} × ${r.price}</span>
                    </div>
                    <span className="font-bold text-foreground">{fmtMRR$(r.mrr)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold">
                  <span>Total MRR</span>
                  <span style={{ color: AMBER }}>{fmtMRR$(mrr)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add-on revenue monthly chart ──────────────────────────────────── */}
      {(data?.monthly_addon?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">Add-on Revenue — Last 12 Months</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data!.monthly_addon} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: number, name: string) => [fmt$(v), name === "token_cents" ? "Tokens" : name === "storage_cents" ? "Storage" : "Total"]) as any}
              />
              <Bar dataKey="token_cents"   name="token_cents"   stackId="a" fill="#8b5cf6" radius={[0,0,0,0]} />
              <Bar dataKey="storage_cents" name="storage_cents" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" /> Token top-ups</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Storage add-ons</div>
          </div>
        </div>
      )}

      {/* ── Transactions table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
          <ShoppingBag size={14} className="text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Purchase History</p>
          <span className="text-[11px] text-muted-foreground bg-gray-50 border border-border px-2 py-0.5 rounded-lg ml-1">
            {filteredTx.length} transactions
          </span>

          {/* Filters */}
          <div className="ml-auto flex items-center gap-1.5">
            <Filter size={12} className="text-muted-foreground" />
            {(["all", "subscription", "token_topup", "storage_addon"] as TxFilter[]).map(f => (
              <button key={f}
                onClick={() => setTxFilter(f)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  txFilter === f
                    ? "text-white"
                    : "text-muted-foreground bg-gray-50 border border-border hover:bg-gray-100"
                }`}
                style={txFilter === f ? { background: f === "all" ? AMBER : txMeta(f).color } : undefined}>
                {f === "all" ? "All" : txMeta(f).label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <RefreshCw size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No transactions yet — purchases will appear here after the first Stripe payment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  {["Agency", "Type", "Details", "Amount", "Date", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(tx => {
                  const meta = txMeta(tx.type);
                  const Icon = meta.icon;
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-gray-50/40 transition-colors">
                      {/* Agency */}
                      <td className="px-4 py-3.5">
                        {tx.agency_id ? (
                          <button
                            onClick={() => router.push(`/master/agencies/${tx.agency_id}`)}
                            className="text-left group"
                          >
                            <p className="text-xs font-semibold text-foreground group-hover:text-amber-600 transition-colors flex items-center gap-1">
                              {tx.agency_name ?? "—"}
                              <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-[10px] text-muted-foreground">{tx.agency_email ?? ""}</p>
                          </button>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-foreground">{tx.agency_name ?? "Deleted agency"}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.agency_email ?? ""}</p>
                          </div>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${meta.color}15`, color: meta.color }}>
                          <Icon size={10} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {tx.type === "subscription"  && tx.plan     && <span className="font-semibold" style={{ color: planColor(tx.plan) }}>→ {planLabel(tx.plan)}</span>}
                        {tx.type === "token_topup"   && tx.tokens   && <span>{fmtTokens(tx.tokens)} tokens</span>}
                        {tx.type === "storage_addon" && tx.bytes    && <span>{formatBytes(tx.bytes)}</span>}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-foreground">
                          {fmt$(tx.amount_cents)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1 uppercase">{tx.currency}</span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(tx.created_at)}
                      </td>

                      {/* Stripe link */}
                      <td className="px-4 py-3.5 text-right">
                        {tx.stripe_session_id && (
                          <a
                            href={`https://dashboard.stripe.com/payments/${tx.stripe_session_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg border border-transparent hover:border-border hover:bg-gray-50"
                          >
                            <CreditCard size={10} /> Stripe
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
      </div>

      {/* ── Coupon impact ──────────────────────────────────────────────────── */}
      {(data?.coupon_impact?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Tag size={14} className="text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Active Coupon Usage</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  {["Code", "Plan", "Used / Max", "Expires", "Redemptions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.coupon_impact.map(c => (
                  <tr key={c.code} className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${planColor(c.plan)}18`, color: planColor(c.plan) }}>
                        {planLabel(c.plan)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.used_count}</span> / {c.max_uses}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.expires_at ? fmtDate(c.expires_at) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{c.redemptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
