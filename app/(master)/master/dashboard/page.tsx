"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2, Globe, CreditCard, Users, AlertTriangle, ShieldAlert,
  TrendingUp, Wifi, WifiOff, Clock, Brain, HardDrive, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_agencies: number;
  active_paid_agencies: number;
  trial_agencies: number;
  total_sites: number;
  connected_sites: number;
  total_audits_today: number;
  failed_audits_24h: number;
  ssl_expiring_7d: number;
  sites_down: number;
  total_tokens_used: number;
  total_tokens_extra: number;
  total_storage_used_bytes: number;
  total_storage_extra_bytes: number;
  claude_tokens_used: number;
  claude_tokens_month: string | null;
  groq_tokens_used: number;
  groq_tokens_month: string | null;
  narrative_tokens_used: number;
  malware_analysis_tokens_used: number;
  claude_fallback_count: number;
}

interface SignupPoint { date: string; count: number }
interface PlanPoint   { plan: string; count: number }
interface RecentAgency {
  id: string;
  name: string;
  email: string;
  plan: string;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  sites_count: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const AMBER     = "#f59e0b";
const PLAN_COLORS: Record<string, string> = {
  free:        "#94a3b8",
  freemium:    "#3b82f6",
  premium:     "#8b5cf6",
  agency:      "#64748b",
  agency_plus: "#f59e0b",
};
const PLAN_LABELS: Record<string, string> = {
  free:        "Free",
  freemium:    "Starter",
  premium:     "Growth",
  agency:      "Agency",
  agency_plus: "Agency+",
};

function planLabel(p: string) {
  return PLAN_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function planColor(p: string) { return PLAN_COLORS[p] ?? "#64748b"; }
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function fmtBytes(b: number): string {
  if (b < 1024 * 1024)             return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024)      return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={ok
        ? { background: "rgba(16,185,129,0.1)", color: "#10b981" }
        : { background: "rgba(239,68,68,0.1)",  color: "#ef4444" }
      }
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "#10b981" : "#ef4444" }} />
      {label}
    </span>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, sub, alert,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl border p-5 flex flex-col gap-3"
      style={{ borderColor: alert && (value as number) > 0 ? "rgba(239,68,68,0.3)" : "#e5e7eb" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: alert && (value as number) > 0
              ? "rgba(239,68,68,0.1)"
              : "rgba(245,158,11,0.1)",
          }}
        >
          <Icon
            size={15}
            style={{ color: alert && (value as number) > 0 ? "#ef4444" : AMBER }}
          />
        </div>
      </div>
      <div>
        <p
          className="text-2xl font-bold"
          style={{ color: alert && (value as number) > 0 ? "#ef4444" : "#0f172a" }}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MasterDashboardPage() {
  const [stats,           setStats]          = useState<Stats | null>(null);
  const [signups,         setSignups]        = useState<SignupPoint[]>([]);
  const [plans,           setPlans]          = useState<PlanPoint[]>([]);
  const [recentAgencies,  setRecent]         = useState<RecentAgency[]>([]);
  const [loading,         setLoading]        = useState(true);
  const [syncingStorage,  setSyncingStorage] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [statsRes, signupsRes, plansRes, recentRes] = await Promise.all([
        masterApi.get<Stats>("/master/stats"),
        masterApi.get<{ signups: SignupPoint[] }>("/master/stats/signups"),
        masterApi.get<{ plans: PlanPoint[] }>("/master/stats/plan-distribution"),
        masterApi.get<{ agencies: RecentAgency[] }>("/master/stats/recent-agencies"),
      ]);
      setStats(statsRes.data);
      setSignups(signupsRes.data.signups);
      setPlans(plansRes.data.plans);
      setRecent(recentRes.data.agencies);
    } catch {
      // errors handled by masterApi interceptor (401 → login redirect)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    function onRefresh() { load(false); }
    window.addEventListener("bb:master-refresh", onRefresh);
    return () => window.removeEventListener("bb:master-refresh", onRefresh);
  }, [load]);

  async function handleSyncStorage() {
    setSyncingStorage(true);
    try {
      const { data } = await masterApi.post<{ synced_agencies: number; total_bytes: number }>("/master/stats/sync-storage");
      setStats(prev => prev ? { ...prev, total_storage_used_bytes: data.total_bytes } : prev);
    } catch {
      // silently fail — stale data is still shown
    } finally {
      setSyncingStorage(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border h-28 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-border h-72 animate-pulse" />
          <div className="bg-white rounded-2xl border border-border h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  const s = stats!;

  // System health derived values
  const healthItems = [
    { label: "Sites Online",       ok: s.sites_down      === 0,  detail: s.sites_down      === 0 ? "All up"           : `${s.sites_down} down`        },
    { label: "Failed Audits (24h)", ok: s.failed_audits_24h === 0, detail: s.failed_audits_24h === 0 ? "None"          : `${s.failed_audits_24h} failed` },
    { label: "SSL Expiring (7d)",   ok: s.ssl_expiring_7d  === 0, detail: s.ssl_expiring_7d  === 0 ? "All clear"       : `${s.ssl_expiring_7d} expiring` },
    { label: "Plugin Connected",    ok: s.connected_sites  > 0,   detail: `${s.connected_sites} / ${s.total_sites}`                                      },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide overview</p>
      </div>

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Agencies"   value={s.total_agencies}        icon={Building2}    sub="All registered" />
        <StatCard label="Active Paid"      value={s.active_paid_agencies}  icon={CreditCard}   sub="Stripe subscriptions" />
        <StatCard label="On Trial"         value={s.trial_agencies}        icon={Clock}        sub="Trial accounts" />
        <StatCard label="Total Sites"      value={s.total_sites}           icon={Globe}        sub={`${s.connected_sites} connected`} />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Sites Down"       value={s.sites_down}            icon={WifiOff}       sub="Latest ping" alert />
        <StatCard label="Failed Audits"    value={s.failed_audits_24h}     icon={AlertTriangle} sub="Last 24 hours" alert />
        <StatCard label="SSL Expiring"     value={s.ssl_expiring_7d}       icon={ShieldAlert}   sub="Within 7 days" alert />
        <StatCard label="Audits Today"     value={s.total_audits_today}    icon={TrendingUp}    sub="All statuses" />
      </div>

      {/* Stat cards — row 3: resource usage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* AI Token Usage — full per-operation breakdown */}
        <div className="sm:col-span-2 bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,159,90,0.12)" }}>
                <Brain size={15} style={{ color: "#c97d2e" }} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Token Usage</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {s.claude_tokens_month ?? s.groq_tokens_month ?? new Date().toISOString().slice(0, 7)}
            </span>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] text-muted-foreground font-medium pb-1.5">Operation</th>
                <th className="text-left text-[10px] text-muted-foreground font-medium pb-1.5">Model</th>
                <th className="text-right text-[10px] text-muted-foreground font-medium pb-1.5">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(() => {
                const claudeAgent   = Math.max(0, (s.claude_tokens_used ?? 0) - (s.malware_analysis_tokens_used ?? 0));
                const malware       = s.malware_analysis_tokens_used ?? 0;
                const narratives    = s.narrative_tokens_used ?? 0;
                const groqFallback  = Math.max(0, (s.groq_tokens_used ?? 0) - narratives);
                const totalClaude   = s.claude_tokens_used ?? 0;
                const totalGroq     = s.groq_tokens_used ?? 0;

                const rows: { label: string; model: string; modelColor: string; tokens: number }[] = [
                  { label: "Agent (chat + SSH)",  model: "Claude",  modelColor: "#c97d2e", tokens: claudeAgent },
                  { label: "Malware analysis",    model: "Claude",  modelColor: "#c97d2e", tokens: malware },
                  { label: "Narratives",          model: "Groq",    modelColor: "#8b5cf6", tokens: narratives },
                  { label: `Groq fallback${s.claude_fallback_count ? ` (×${s.claude_fallback_count})` : ""}`, model: "Groq", modelColor: "#8b5cf6", tokens: groqFallback },
                ];

                return rows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-1.5 text-foreground">{row.label}</td>
                    <td className="py-1.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${row.modelColor}18`, color: row.modelColor }}>
                        {row.model}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-mono text-foreground">{fmtTokens(row.tokens)}</td>
                  </tr>
                ));
              })()}
            </tbody>
            <tfoot className="border-t-2 border-border">
              <tr>
                <td className="pt-2 text-[10px] font-semibold text-muted-foreground uppercase">Total Claude</td>
                <td />
                <td className="pt-2 text-right font-mono font-semibold" style={{ color: "#c97d2e" }}>{fmtTokens(s.claude_tokens_used ?? 0)}</td>
              </tr>
              <tr>
                <td className="text-[10px] font-semibold text-muted-foreground uppercase">Total Groq</td>
                <td />
                <td className="text-right font-mono font-semibold" style={{ color: "#8b5cf6" }}>{fmtTokens(s.groq_tokens_used ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">R2 Storage Used</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncStorage}
                disabled={syncingStorage}
                title="Sync real R2 usage from bucket"
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}
              >
                <RefreshCw size={11} className={syncingStorage ? "animate-spin" : ""} />
                {syncingStorage ? "Syncing…" : "Sync"}
              </button>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <HardDrive size={15} style={{ color: "#10b981" }} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{fmtBytes(s.total_storage_used_bytes)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">total R2 storage across all agencies</p>
          </div>
          {s.total_storage_extra_bytes > 0 && (
            <p className="text-xs font-medium" style={{ color: "#10b981" }}>
              +{fmtBytes(s.total_storage_extra_bytes)} extra storage purchased
            </p>
          )}
        </div>
      </div>

      {/* System health row */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          System Health
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {healthItems.map(({ label, ok, detail }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{label}</span>
                <StatusBadge ok={ok} label={ok ? "OK" : "Alert"} />
              </div>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signup trend — takes 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">New Signups</p>
              <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
            </div>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(245,158,11,0.1)", color: AMBER }}
            >
              <Users size={12} />
              {signups.reduce((acc, d) => acc + d.count, 0)} total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={signups} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={AMBER} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e5e7eb" }}
                formatter={(v) => [v ?? 0, "Signups"]}
              />
              <Area type="monotone" dataKey="count" stroke={AMBER} strokeWidth={2} fill="url(#amberGrad)" dot={false} activeDot={{ r: 4, fill: AMBER, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution — 1/3 width */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-1">Plan Distribution</p>
          <p className="text-xs text-muted-foreground mb-4">Agencies by plan</p>
          {plans.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <Pie
                  data={plans}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%"
                  cy="42%"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {plans.map((entry) => (
                    <Cell key={entry.plan} fill={planColor(entry.plan)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  formatter={(v, _, props) => [v ?? 0, planLabel((props as { payload?: { plan?: string } })?.payload?.plan ?? "")]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{planLabel(value)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent signups table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Recent Agencies</p>
            <p className="text-xs text-muted-foreground mt-0.5">Last 10 registered</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Agency", "Email", "Plan", "Status", "Sites", "Joined"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAgencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No agencies yet
                  </td>
                </tr>
              ) : recentAgencies.map((ag) => {
                const isPaid  = !!ag.stripe_subscription_id;
                const isTrial = !isPaid && ag.trial_ends_at && new Date(ag.trial_ends_at) > new Date();
                const initials = ag.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={ag.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: AMBER }}
                        >
                          {initials}
                        </div>
                        <span className="font-medium text-foreground text-xs">{ag.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{ag.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${planColor(ag.plan)}18`, color: planColor(ag.plan) }}
                      >
                        {planLabel(ag.plan)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {isPaid ? (
                        <StatusBadge ok label="Paid" />
                      ) : isTrial ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: AMBER }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER }} />
                          Trial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8" }}>
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wifi size={11} />
                        {ag.sites_count}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(ag.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
