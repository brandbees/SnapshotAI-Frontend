"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Building2, ChevronLeft, ChevronRight, Globe, Users, CreditCard, TrendingUp, LogIn, Plus, X, Eye, EyeOff } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie,
} from "recharts";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface Agency {
  id: string; name: string; email: string; plan: string;
  account_type: "agency" | "individual";
  sites_limit: number; stripe_subscription_id: string | null;
  trial_ends_at: string | null; created_at: string;
  sites_count: number; team_count: number;
  is_suspended: boolean;
}
interface PlatformStats {
  total_agencies: number; active_paid_agencies: number; trial_agencies: number;
  total_sites: number; connected_sites: number;
}
interface PlanDist { plan: string; count: number; fill?: string }
interface SignupPoint { date: string; count: number }

// ── Helpers ──────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";

const PLAN_LABELS: Record<string, string> = {
  free: "Free", freemium: "Starter", premium: "Growth",
  agency: "Agency", agency_plus: "Agency+",
};
const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8", freemium: "#3b82f6", premium: "#8b5cf6",
  agency: "#64748b", agency_plus: "#f59e0b",
};
const PIE_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#64748b", "#94a3b8", "#10b981"];

function planLabel(p: string) {
  return PLAN_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function planColor(p: string) { return PLAN_COLORS[p] ?? "#64748b"; }

function agencyStatus(ag: Agency) {
  if (ag.is_suspended)           return { label: "Suspended", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  if (ag.stripe_subscription_id) return { label: "Paid",      color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (ag.trial_ends_at && new Date(ag.trial_ends_at) > new Date())
    return { label: "Trial",     color: AMBER,     bg: "rgba(245,158,11,0.1)" };
  return { label: "Free",        color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
}

const PLAN_FILTERS = [
  { key: "all",       label: "All"       },
  { key: "paid",      label: "Paid"      },
  { key: "trial",     label: "Trial"     },
  { key: "free",      label: "Free"      },
  { key: "freemium",  label: "Starter"   },
  { key: "premium",   label: "Growth"    },
  { key: "agency_plus", label: "Agency+" },
  { key: "suspended", label: "Suspended" },
];

const TYPE_FILTERS = [
  { key: "all",        label: "All Users"   },
  { key: "agency",     label: "Agency"      },
  { key: "individual", label: "Individual"  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function MasterAgenciesPage() {
  const router = useRouter();
  const [agencies,    setAgencies]   = useState<Agency[]>([]);
  const [total,       setTotal]      = useState(0);
  const [page,        setPage]       = useState(1);
  const [search,      setSearch]     = useState("");
  const [planFilter,  setPlan]       = useState("all");
  const [typeFilter,  setTypeFilter] = useState("all");
  const [loading,     setLoading]    = useState(true);

  // Stats / charts
  const [stats,      setStats]      = useState<PlatformStats | null>(null);
  const [planDist,   setPlanDist]   = useState<PlanDist[]>([]);
  const [signups,    setSignups]    = useState<SignupPoint[]>([]);
  const [statsReady, setStatsReady] = useState(false);

  const LIMIT = 25;

  // Create agency modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", plan: "free" });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreatePw, setShowCreatePw] = useState(false);

  const load = useCallback(async (p: number, q: string, plan: string, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), search: q, plan, type });
      const { data } = await masterApi.get<{ agencies: Agency[]; total: number }>(
        `/master/agencies?${params}`
      );
      setAgencies(data.agencies);
      setTotal(data.total);
    } catch { /* interceptor handles 401 */ }
    finally { setLoading(false); }
  }, []);

  // Load stats once on mount
  useEffect(() => {
    Promise.all([
      masterApi.get<PlatformStats>("/master/stats"),
      masterApi.get<{ plans: PlanDist[] }>("/master/stats/plan-distribution"),
      masterApi.get<{ signups: SignupPoint[] }>("/master/stats/signups"),
    ]).then(([s, d, sg]) => {
      setStats(s.data);
      setPlanDist((d.data.plans ?? []).map((r, i) => ({ ...r, fill: PIE_COLORS[i % PIE_COLORS.length] })));
      setSignups(sg.data.signups ?? []);
      setStatsReady(true);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(page, search, planFilter, typeFilter); }, [page, search, planFilter, typeFilter, load]);

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handlePlan(val: string)   { setPlan(val);   setPage(1); }
  function handleType(val: string)   { setTypeFilter(val); setPage(1); }

  const totalPages = Math.ceil(total / LIMIT);
  const freeCount  = (stats?.total_agencies ?? 0) - (stats?.active_paid_agencies ?? 0) - (stats?.trial_agencies ?? 0);

  async function impersonate(e: React.MouseEvent, agencyId: string) {
    e.stopPropagation();
    try {
      const { data } = await masterApi.post(`/master/agencies/${agencyId}/impersonate`);
      localStorage.setItem("bb_token",  data.token);
      localStorage.setItem("bb_agency", JSON.stringify(data.agency));
      toast.success("Logged in as agency — opening dashboard…");
      window.open("/dashboard", "_blank");
    } catch {
      toast.error("Failed to impersonate agency.");
    }
  }

  async function createAgency() {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      setCreateError("Name, email, and password are required.");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }
    setCreateSaving(true); setCreateError(null);
    try {
      await masterApi.post("/master/agencies", createForm);
      toast.success(`Agency "${createForm.name}" created.`);
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", plan: "free" });
      load(1, search, planFilter, typeFilter);
      setPage(1);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create agency.";
      setCreateError(msg);
    } finally {
      setCreateSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Agencies</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {statsReady
                ? <><span className="font-semibold text-foreground">{stats?.total_agencies ?? total}</span> registered · <span className="font-semibold text-green-600">{stats?.active_paid_agencies ?? 0} paid</span> · <span className="font-semibold text-amber-600">{stats?.trial_agencies ?? 0} on trial</span></>
                : `${total} total registered agencies`
              }
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              onClick={() => { setShowCreate(true); setCreateError(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
              style={{ background: AMBER }}
            >
              <Plus size={14} /> Create Agency
            </button>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-border">
              <Globe size={12} className="text-amber-500" />
              <span><span className="font-bold text-foreground">{statsReady ? stats?.total_sites ?? "—" : "…"}</span> sites</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-border">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span><span className="font-bold text-foreground">{statsReady ? stats?.connected_sites ?? "—" : "…"}</span> connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Agencies", value: stats?.total_agencies,      icon: Building2,  color: AMBER,      bg: "#fef9ee" },
          { label: "Paid",           value: stats?.active_paid_agencies, icon: CreditCard, color: "#10b981",  bg: "#f0fdf4" },
          { label: "On Trial",       value: stats?.trial_agencies,       icon: TrendingUp, color: "#f59e0b",  bg: "#fffbeb" },
          { label: "Free",           value: freeCount >= 0 ? freeCount : "—", icon: Users, color: "#94a3b8", bg: "#f8fafc" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-border p-5 flex items-center gap-4" style={{ background: bg }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}20` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {statsReady ? (value ?? "—") : <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" />}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signup trend — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-1">New Agency Signups</p>
          <p className="text-xs text-muted-foreground mb-4">Last 30 days</p>
          {signups.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={signups} margin={{ top: 5, right: 5, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={AMBER} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v) => [v, "Signups"]}
                />
                <Area type="monotone" dataKey="count" stroke={AMBER} strokeWidth={2.5}
                  fill="url(#signupGrad)" dot={false}
                  activeDot={{ r: 4, fill: AMBER, stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center">
              {statsReady
                ? <p className="text-sm text-muted-foreground">No signup data</p>
                : <div className="w-full h-full bg-gray-50 rounded-xl animate-pulse" />
              }
            </div>
          )}
        </div>

        {/* Plan distribution — 1/3 width */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-1">Plan Distribution</p>
          <p className="text-xs text-muted-foreground mb-2">All agencies by plan</p>
          {planDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart margin={{ top: 8 }}>
                  <Pie
                    data={planDist} cx="50%" cy="48%"
                    innerRadius={44} outerRadius={64}
                    dataKey="count" paddingAngle={2}
                    stroke="none">
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v, _n, props) => [v, planLabel((props as { payload?: { plan?: string } }).payload?.plan ?? "")]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {planDist.map((d, i) => (
                  <div key={d.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground">{planLabel(d.plan)}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex items-center justify-center">
              {statsReady
                ? <p className="text-sm text-muted-foreground">No data</p>
                : <div className="w-full h-full bg-gray-50 rounded-xl animate-pulse" />
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Search + filters ─────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {PLAN_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePlan(key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border"
                style={planFilter === key
                  ? { background: key === "suspended" ? "#ef4444" : AMBER, color: "#fff", borderColor: key === "suspended" ? "#ef4444" : AMBER }
                  : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* User type filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Type</span>
          <div className="flex gap-1.5">
            {TYPE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleType(key)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors border"
                style={typeFilter === key
                  ? { background: key === "individual" ? "#6366f1" : key === "agency" ? "#0ea5e9" : "#64748b", color: "#fff", borderColor: "transparent" }
                  : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                {["Agency", "Plan", "Type", "Status", "Sites", "Team", "Joined", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No agencies found
                  </td>
                </tr>
              ) : agencies.map(ag => {
                const status   = agencyStatus(ag);
                const initials = ag.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr
                    key={ag.id}
                    onClick={() => router.push(`/master/agencies/${ag.id}`)}
                    className="border-b border-border last:border-0 hover:bg-amber-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${AMBER}, #fbbf24)` }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight">{ag.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{ag.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${planColor(ag.plan)}15`, color: planColor(ag.plan) }}
                      >
                        {planLabel(ag.plan)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize"
                        style={ag.account_type === "individual"
                          ? { background: "rgba(99,102,241,0.1)", color: "#6366f1" }
                          : { background: "rgba(14,165,233,0.1)", color: "#0ea5e9" }
                        }
                      >
                        {ag.account_type ?? "agency"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: status.bg, color: status.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe size={11} />
                        {ag.sites_count}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users size={11} />
                        {ag.team_count}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ag.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => impersonate(e, ag.id)}
                        title="Login as this agency"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                      >
                        <LogIn size={11} /> Login as
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Create Agency modal ─────────────────────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header strip */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
            <div className="px-6 py-5 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                  <Building2 size={18} style={{ color: AMBER }} />
                </div>
                <div>
                  <p className="font-bold text-foreground">Create Agency</p>
                  <p className="text-xs text-muted-foreground">New account on the platform</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agency Name</label>
                <input
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. BrandBees Agency"
                  className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@agencyname.com"
                  className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showCreatePw ? "text" : "password"}
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="w-full pr-10 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCreatePw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Plan</label>
                <select
                  value={createForm.plan}
                  onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white transition-all"
                >
                  {Object.entries(PLAN_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {createError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={createAgency}
                  disabled={createSaving}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: AMBER }}
                >
                  {createSaving ? "Creating…" : "Create Agency"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-foreground px-1">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
