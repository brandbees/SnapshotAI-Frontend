"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";
import {
  ArrowLeft, Globe, Users, FileText,
  CreditCard, Calendar, Trash2,
  Plus, X, Pencil, Check, Wifi, WifiOff,
  BarChart3, ShieldCheck, Activity, Eye, EyeOff,
  Brain, HardDrive, Zap, RotateCcw, Gift,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import masterApi from "@/lib/masterApi";
import { MasterSiteDrawer }   from "@/components/master/MasterSiteDrawer";
import { AgencyClientDrawer } from "@/components/master/AgencyClientDrawer";
import { PLAN_TOKEN_LIMITS, PLAN_STORAGE_LIMITS } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────────

interface Agency {
  id: string; name: string; email: string; plan: string; sites_limit: number;
  stripe_customer_id: string | null; stripe_subscription_id: string | null;
  brand_name: string | null; trial_ends_at: string | null; created_at: string;
  is_suspended: boolean;
  account_type: "agency" | "individual";
  // Usage
  ai_tokens_used:     number;
  ai_tokens_extra:    number;
  ai_tokens_reset_at: string | null;
  storage_used_bytes:  number;
  storage_extra_bytes: number;
}
interface Site {
  id: string; url: string; name: string | null;
  plugin_connected: boolean; last_audit_at: string | null; last_score: number | null;
}
interface Member {
  id: string; name: string | null; email: string; role: string;
  invite_accepted: boolean; created_at: string;
}
interface Client {
  id: string; name: string; email: string | null; company: string | null; created_at: string;
}
interface Audit {
  id: string; status: string; overall_score: number | null; triggered_by: string;
  created_at: string; site_url: string; site_name: string | null;
}
interface TrendPoint { date: string; avg_score: number | null; count: number }

type Tab = "overview" | "sites" | "clients" | "team" | "audits";

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
const PLAN_LIMITS: Record<string, number> = {
  free: 1, freemium: 10, premium: 50, agency: 100, agency_plus: 9999,
};
const ALL_PLANS = ["free", "freemium", "premium", "agency", "agency_plus"];

function planLabel(p: string) {
  return PLAN_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function planColor(p: string) { return PLAN_COLORS[p] ?? "#64748b"; }

function scoreColor(s: number | null) {
  if (s === null) return "#94a3b8";
  if (s >= 80) return "#10b981";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function UsageBar({ used, total, color = AMBER }: { used: number; total: number; color?: string }) {
  const pct = total <= 0 ? 0 : Math.min(100, (used / total) * 100);
  const danger = pct >= 90;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: danger ? "#ef4444" : color }}
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [agency,  setAgency]  = useState<Agency | null>(null);
  const [sites,   setSites]   = useState<Site[]>([]);
  const [team,    setTeam]    = useState<Member[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [audits,  setAudits]  = useState<Audit[]>([]);
  const [trend,   setTrend]   = useState<TrendPoint[]>([]);
  const [tab,     setTab]     = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Plan edit
  const [planEdit, setPlanEdit] = useState(false);
  const [newPlan,  setNewPlan]  = useState("");
  const [trialDays, setTrialDays] = useState("30");

  // Account type edit
  const [typeEdit,   setTypeEdit]   = useState(false);
  const [newAccType, setNewAccType] = useState<"agency" | "individual">("agency");

  // Delete
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  // Saving
  const [saving, setSaving] = useState(false);

  // Edit agency info
  const [showInfoEdit, setShowInfoEdit] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: "", email: "", newPassword: "" });
  const [infoSaving, setInfoSaving] = useState(false);
  const [showInfoPw, setShowInfoPw] = useState(false);

  // Grant tokens / storage / reset
  const [grantTokenInput,   setGrantTokenInput]   = useState("");
  const [grantStorageInput, setGrantStorageInput] = useState("");
  const [showGrantTokens,   setShowGrantTokens]   = useState(false);
  const [showGrantStorage,  setShowGrantStorage]  = useState(false);
  const [grantSaving,       setGrantSaving]       = useState(false);

  // Drawers
  const [siteDrawer,   setSiteDrawer]   = useState<string | null>(null);
  const [clientDrawer, setClientDrawer] = useState<string | null>(null);

  // Add site form
  const [showAddSite, setShowAddSite]   = useState(false);
  const [newSiteUrl,  setNewSiteUrl]    = useState("");
  const [newSiteName, setNewSiteName]   = useState("");

  // Add client form
  const [showAddClient,  setShowAddClient]  = useState(false);
  const [newClientName,  setNewClientName]  = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientCo,    setNewClientCo]    = useState("");

  // Edit client
  const [editClientId,    setEditClientId]    = useState<string | null>(null);
  const [editClientName,  setEditClientName]  = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientCo,    setEditClientCo]    = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await masterApi.get<{
        agency: Agency; sites: Site[]; team: Member[]; clients: Client[];
        audits: Audit[]; audit_trend: TrendPoint[];
      }>(`/master/agencies/${id}`);
      setAgency(data.agency);
      setSites(data.sites);
      setTeam(data.team);
      setClients(data.clients);
      setAudits(data.audits);
      setTrend(data.audit_trend);
      setNewPlan(data.agency.plan);
      setNewAccType(data.agency.account_type ?? "agency");
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function changePlan() {
    if (!agency || newPlan === agency.plan) { setPlanEdit(false); return; }
    setSaving(true);
    try {
      await masterApi.patch(`/master/agencies/${id}`, { plan: newPlan, sites_limit: PLAN_LIMITS[newPlan] ?? agency.sites_limit });
      await load(); setPlanEdit(false);
      toast.success(`Plan updated to ${planLabel(newPlan)}.`);
    } catch { toast.error("Failed to update plan."); }
    finally { setSaving(false); }
  }

  async function changeAccountType() {
    if (!agency || newAccType === agency.account_type) { setTypeEdit(false); return; }
    setSaving(true);
    try {
      await masterApi.patch(`/master/agencies/${id}`, { account_type: newAccType });
      await load(); setTypeEdit(false);
      toast.success(`Account type changed to ${newAccType}.`);
    } catch { toast.error("Failed to update account type."); }
    finally { setSaving(false); }
  }

  async function extendTrial() {
    const days = parseInt(trialDays);
    if (!days || days < 1) return;
    setSaving(true);
    try {
      const base = agency?.trial_ends_at && new Date(agency.trial_ends_at) > new Date()
        ? new Date(agency.trial_ends_at) : new Date();
      base.setDate(base.getDate() + days);
      await masterApi.patch(`/master/agencies/${id}`, { trial_ends_at: base.toISOString() });
      await load();
      toast.success(`Trial extended by ${days} days.`);
    } catch { toast.error("Failed to extend trial."); }
    finally { setSaving(false); }
  }

  async function deleteAgency() {
    if (deleteInput !== "DELETE") return;
    setSaving(true);
    try {
      await masterApi.delete(`/master/agencies/${id}`);
      toast.success("Agency deleted.");
      router.replace("/master/agencies");
    } catch { toast.error("Failed to delete agency."); }
    finally { setSaving(false); }
  }

  async function saveInfo() {
    const payload: Record<string, string> = {};
    if (infoForm.name.trim()  && infoForm.name.trim()  !== agency?.name)  payload.name  = infoForm.name.trim();
    if (infoForm.email.trim() && infoForm.email.trim() !== agency?.email) payload.email = infoForm.email.trim();
    if (infoForm.newPassword) {
      if (infoForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
      payload.new_password = infoForm.newPassword;
    }
    if (!Object.keys(payload).length) { setShowInfoEdit(false); return; }
    setInfoSaving(true);
    try {
      await masterApi.patch(`/master/agencies/${id}`, payload);
      await load();
      setShowInfoEdit(false);
      setInfoForm({ name: "", email: "", newPassword: "" });
      toast.success("Agency info updated.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update agency.";
      toast.error(msg);
    } finally { setInfoSaving(false); }
  }

  async function toggleSuspend() {
    const suspending = !agency?.is_suspended;
    if (!await confirm({
      title: suspending ? "Suspend agency?" : "Unsuspend agency?",
      description: suspending
        ? "The agency will immediately lose access to their dashboard. All API calls will return 403 until unsuspended."
        : "The agency will regain full access to their dashboard immediately.",
      danger: suspending,
      confirmLabel: suspending ? "Suspend" : "Unsuspend",
    })) return;
    setSaving(true);
    try {
      await masterApi.patch(`/master/agencies/${id}`, { suspended: suspending });
      await load();
      toast.success(suspending ? "Agency suspended." : "Agency unsuspended.");
    } catch { toast.error("Failed to update suspension status."); }
    finally { setSaving(false); }
  }

  async function doGrantTokens() {
    const tokens = parseInt(grantTokenInput, 10);
    if (!tokens || tokens <= 0) return;
    setGrantSaving(true);
    try {
      await masterApi.post(`/master/agencies/${id}/grant-tokens`, { tokens });
      await load();
      setShowGrantTokens(false);
      setGrantTokenInput("");
      toast.success(`${fmtTokens(tokens)} tokens granted.`);
    } catch { toast.error("Failed to grant tokens."); }
    finally { setGrantSaving(false); }
  }

  async function doGrantStorage() {
    const gb = parseFloat(grantStorageInput);
    if (!gb || gb <= 0) return;
    const bytes = Math.round(gb * 1024 * 1024 * 1024);
    setGrantSaving(true);
    try {
      await masterApi.post(`/master/agencies/${id}/grant-storage`, { bytes });
      await load();
      setShowGrantStorage(false);
      setGrantStorageInput("");
      toast.success(`${gb} GB storage granted.`);
    } catch { toast.error("Failed to grant storage."); }
    finally { setGrantSaving(false); }
  }

  async function doResetUsage() {
    if (!await confirm({
      title: "Reset token usage?",
      description: "This will set ai_tokens_used to 0 for this agency, as if their monthly cycle just reset. Their extra tokens are not affected.",
      danger: false,
      confirmLabel: "Reset Usage",
    })) return;
    setGrantSaving(true);
    try {
      await masterApi.post(`/master/agencies/${id}/reset-usage`, {});
      await load();
      toast.success("Token usage reset.");
    } catch { toast.error("Failed to reset usage."); }
    finally { setGrantSaving(false); }
  }

  async function addSite() {
    if (!newSiteUrl.trim()) return;
    setSaving(true);
    try {
      await masterApi.post(`/master/agencies/${id}/sites`, { url: newSiteUrl, name: newSiteName });
      setNewSiteUrl(""); setNewSiteName(""); setShowAddSite(false);
      await load();
      toast.success("Site added.");
    } catch { toast.error("Failed to add site."); }
    finally { setSaving(false); }
  }

  async function deleteSite(siteId: string) {
    if (!await confirm({ title: "Delete site?", description: "All audit history and data for this site will be permanently deleted. This cannot be undone.", danger: true, confirmLabel: "Delete site" })) return;
    setSaving(true);
    try {
      await masterApi.delete(`/master/agencies/${id}/sites/${siteId}`);
      await load();
      toast.success("Site deleted.");
    } catch { toast.error("Failed to delete site."); }
    finally { setSaving(false); }
  }

  async function addClient() {
    if (!newClientName.trim()) return;
    setSaving(true);
    try {
      await masterApi.post(`/master/agencies/${id}/clients`, {
        name: newClientName, email: newClientEmail || undefined, company: newClientCo || undefined,
      });
      setNewClientName(""); setNewClientEmail(""); setNewClientCo(""); setShowAddClient(false);
      await load();
      toast.success("Client added.");
    } catch { toast.error("Failed to add client."); }
    finally { setSaving(false); }
  }

  async function saveEditClient() {
    if (!editClientId) return;
    setSaving(true);
    try {
      await masterApi.patch(`/master/agencies/${id}/clients/${editClientId}`, {
        name: editClientName || undefined, email: editClientEmail || undefined, company: editClientCo || undefined,
      });
      setEditClientId(null); await load();
      toast.success("Client updated.");
    } catch { toast.error("Failed to update client."); }
    finally { setSaving(false); }
  }

  async function deleteClient(clientId: string) {
    if (!await confirm({ title: "Delete client?", description: "The client and all its assigned site links will be removed.", danger: true, confirmLabel: "Delete client" })) return;
    setSaving(true);
    try {
      await masterApi.delete(`/master/agencies/${id}/clients/${clientId}`);
      await load();
      toast.success("Client deleted.");
    } catch { toast.error("Failed to delete client."); }
    finally { setSaving(false); }
  }

  async function deleteTeamMember(memberId: string) {
    if (!await confirm({ title: "Remove team member?", description: "This member will lose access to this agency immediately.", danger: true, confirmLabel: "Remove" })) return;
    setSaving(true);
    try {
      await masterApi.delete(`/master/agencies/${id}/team/${memberId}`);
      await load();
      toast.success("Team member removed.");
    } catch { toast.error("Failed to remove team member."); }
    finally { setSaving(false); }
  }

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-4">
      <div className="h-6 bg-gray-100 rounded-xl w-32 animate-pulse" />
      <div className="bg-white rounded-2xl border border-border h-52 animate-pulse" />
      <div className="bg-white rounded-2xl border border-border h-96 animate-pulse" />
    </div>
  );
  if (!agency) return <div className="text-sm text-muted-foreground">Agency not found.</div>;

  const initials    = agency.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const isPaid      = !!agency.stripe_subscription_id;
  const isTrial     = !isPaid && !!agency.trial_ends_at && new Date(agency.trial_ends_at) > new Date();
  const isSuspended = !!agency.is_suspended;
  const connCount   = sites.filter(s => s.plugin_connected).length;
  const audits30d   = trend.reduce((a, d) => a + d.count, 0);
  const avgScore30d = trend.length
    ? Math.round(trend.reduce((a, d) => a + (d.avg_score ?? 0), 0) / trend.length) : null;

  // Usage computed values
  const tokenMonthlyLimit = PLAN_TOKEN_LIMITS[agency.plan]   ?? 1_000;
  const storageBaseLimit  = PLAN_STORAGE_LIMITS[agency.plan] ?? 104_857_600;
  const tokenTotal   = tokenMonthlyLimit + (agency.ai_tokens_extra   ?? 0);
  const storageTotal = storageBaseLimit  + (agency.storage_extra_bytes ?? 0);
  const tokenUsed    = agency.ai_tokens_used    ?? 0;
  const storageUsed  = agency.storage_used_bytes ?? 0;
  const tokenPct     = tokenTotal  > 0 ? Math.min(100, (tokenUsed   / tokenTotal)  * 100) : 0;
  const storagePct   = storageTotal > 0 ? Math.min(100, (storageUsed / storageTotal) * 100) : 0;

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "overview", label: "Overview",      icon: BarChart3 },
    { key: "sites",    label: "Sites",         icon: Globe,    count: sites.length },
    { key: "clients",  label: "Clients",       icon: Users,    count: clients.length },
    { key: "team",     label: "Team",          icon: Users,    count: team.length },
    { key: "audits",   label: "Audit History", icon: FileText, count: audits.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {siteDrawer   && <MasterSiteDrawer   siteId={siteDrawer}   onClose={() => setSiteDrawer(null)} />}
      {clientDrawer && <AgencyClientDrawer agencyId={id} clientId={clientDrawer} onClose={() => setClientDrawer(null)} />}

      <div className="space-y-5">

        {/* Back link */}
        <button onClick={() => router.push("/master/agencies")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={13} /> Back to Agencies
        </button>

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />

          <div className="p-6">
            <div className="flex items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #fbbf24)` }}>
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">{agency.name}</h1>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${planColor(agency.plan)}15`, color: planColor(agency.plan) }}>
                    {planLabel(agency.plan)}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
                    {agency.account_type ?? "agency"}
                  </span>
                  {isPaid && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Paid
                    </span>
                  )}
                  {isTrial && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Trial
                    </span>
                  )}
                  {!isPaid && !isTrial && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Free
                    </span>
                  )}
                  {isSuspended && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Suspended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{agency.email}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={11} /> Joined {fmtDate(agency.created_at)}</span>
                  {agency.trial_ends_at && (
                    <span className="flex items-center gap-1"><Calendar size={11} /> Trial ends {fmtDate(agency.trial_ends_at)}</span>
                  )}
                  {agency.stripe_subscription_id && (
                    <span className="flex items-center gap-1 font-mono">
                      <CreditCard size={11} /> {agency.stripe_subscription_id.slice(0, 24)}…
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isSuspended && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                This agency is suspended — all dashboard access is blocked until unsuspended.
              </div>
            )}

            {/* Quick stats row */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
              {[
                { label: "Total Sites",  value: sites.length,  color: "#f59e0b", icon: Globe    },
                { label: "Connected",    value: connCount,      color: "#10b981", icon: Wifi     },
                { label: "Team Members", value: team.length,    color: "#8b5cf6", icon: Users    },
                { label: "Audits (30d)", value: audits30d,      color: "#3b82f6", icon: Activity },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: `${color}08` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}15` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-border">
              {/* Change Plan pill */}
              <div className="inline-flex items-center gap-0 rounded-xl border border-border bg-gray-50 overflow-hidden">
                <span className="text-[11px] font-semibold text-muted-foreground px-3 py-2 border-r border-border bg-white">Plan</span>
                {planEdit ? (
                  <>
                    <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                      className="text-xs font-semibold px-2.5 py-2 bg-gray-50 border-none outline-none cursor-pointer"
                      style={{ color: planColor(newPlan) }}>
                      {ALL_PLANS.map(k => <option key={k} value={k}>{planLabel(k)}</option>)}
                    </select>
                    <button onClick={changePlan} disabled={saving}
                      className="text-[11px] font-bold px-3 py-2 text-white border-l border-amber-400 disabled:opacity-60"
                      style={{ background: AMBER }}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button onClick={() => setPlanEdit(false)}
                      className="px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold px-3 py-2" style={{ color: planColor(agency.plan) }}>
                      {planLabel(agency.plan)}
                    </span>
                    <button onClick={() => setPlanEdit(true)}
                      className="px-2.5 py-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors border-l border-border">
                      <Pencil size={11} />
                    </button>
                  </>
                )}
              </div>

              {/* Account Type pill */}
              <div className="inline-flex items-center gap-0 rounded-xl border border-border bg-gray-50 overflow-hidden">
                <span className="text-[11px] font-semibold text-muted-foreground px-3 py-2 border-r border-border bg-white">Type</span>
                {typeEdit ? (
                  <>
                    <select value={newAccType} onChange={e => setNewAccType(e.target.value as "agency" | "individual")}
                      className="text-xs font-semibold px-2.5 py-2 bg-gray-50 border-none outline-none cursor-pointer text-blue-600">
                      <option value="agency">Agency</option>
                      <option value="individual">Individual</option>
                    </select>
                    <button onClick={changeAccountType} disabled={saving}
                      className="text-[11px] font-bold px-3 py-2 text-white border-l border-amber-400 disabled:opacity-60"
                      style={{ background: AMBER }}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button onClick={() => setTypeEdit(false)}
                      className="px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold px-3 py-2 text-blue-600 capitalize">
                      {agency.account_type ?? "agency"}
                    </span>
                    <button onClick={() => setTypeEdit(true)}
                      className="px-2.5 py-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors border-l border-border">
                      <Pencil size={11} />
                    </button>
                  </>
                )}
              </div>

              {/* Extend Trial */}
              {!isPaid && (
                <div className="inline-flex items-center gap-0 rounded-xl border border-border bg-gray-50 overflow-hidden">
                  <span className="text-[11px] font-semibold text-muted-foreground px-3 py-2 border-r border-border bg-white">Extend Trial</span>
                  <input type="number" min={1} max={365} value={trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    className="w-12 text-xs font-semibold text-center px-1 py-2 bg-gray-50 border-none outline-none" />
                  <span className="text-[11px] text-muted-foreground pr-2">days</span>
                  <button onClick={extendTrial} disabled={saving}
                    className="text-[11px] font-bold px-3 py-2 text-amber-700 border-l border-border hover:bg-amber-50 transition-colors disabled:opacity-60">
                    {saving ? "…" : "Apply"}
                  </button>
                </div>
              )}

              {/* Suspend */}
              <button onClick={toggleSuspend} disabled={saving}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors disabled:opacity-50
                  ${isSuspended
                    ? "text-green-700 border-green-200 bg-white hover:bg-green-50"
                    : "text-orange-600 border-orange-200 bg-white hover:bg-orange-50"}`}>
                {isSuspended ? <Check size={12} /> : <X size={12} />}
                {isSuspended ? "Unsuspend" : "Suspend"}
              </button>

              {/* Edit Info */}
              <button
                onClick={() => {
                  setInfoForm({ name: agency.name, email: agency.email, newPassword: "" });
                  setShowInfoEdit(v => !v);
                  setShowDelete(false);
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors
                  ${showInfoEdit ? "bg-amber-500 text-white border-amber-500" : "text-amber-600 border-amber-200 bg-white hover:bg-amber-50"}`}>
                <Pencil size={12} /> Edit Info
              </button>

              {/* Delete */}
              <button onClick={() => { setShowDelete(v => !v); setShowInfoEdit(false); }}
                className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors
                  ${showDelete ? "bg-red-600 text-white border-red-600" : "text-red-500 border-red-200 bg-white hover:bg-red-50"}`}>
                <Trash2 size={12} /> Delete
              </button>
            </div>

            {showDelete && (
              <div className="mt-3 p-4 rounded-xl border border-red-200 bg-red-50">
                <p className="text-xs font-semibold text-red-800 mb-3">
                  Permanently delete <strong>{agency.name}</strong> and all its sites, audits, and data. Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to confirm.
                </p>
                <div className="flex items-center gap-2">
                  <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                    placeholder="DELETE"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-300 bg-white w-28 focus:outline-none focus:ring-2 focus:ring-red-200 font-mono tracking-widest" />
                  <button onClick={deleteAgency} disabled={deleteInput !== "DELETE" || saving}
                    className="text-xs font-bold px-4 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-colors">
                    {saving ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}

            {showInfoEdit && (
              <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <p className="text-xs font-semibold text-amber-900">Edit agency info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
                    <input value={infoForm.name} onChange={e => setInfoForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                    <input type="email" value={infoForm.email} onChange={e => setInfoForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">New Password <span className="normal-case text-muted-foreground font-normal">(leave blank to keep current)</span></label>
                  <div className="relative mt-1">
                    <input type={showInfoPw ? "text" : "password"} value={infoForm.newPassword}
                      onChange={e => setInfoForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Min 8 characters"
                      className="w-full pr-9 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all" />
                    <button type="button" onClick={() => setShowInfoPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showInfoPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveInfo} disabled={infoSaving}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: AMBER }}>
                    {infoSaving ? "Saving…" : "Save Changes"}
                  </button>
                  <button onClick={() => setShowInfoEdit(false)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-white transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto bg-gray-50/40">
            {TABS.map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  tab === key
                    ? "text-amber-600 border-amber-500 bg-white"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-white/60"
                }`}>
                <Icon size={14} />
                {label}
                {count !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                    tab === key ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                  }`}>{count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ── OVERVIEW ──────────────────────────────────────────── */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Primary stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Sites",     value: sites.length,      icon: Globe,       color: "#f59e0b", bg: "#fef9ee" },
                    { label: "Clients",         value: clients.length,    icon: Users,       color: "#8b5cf6", bg: "#f5f3ff" },
                    { label: "Total Audits",    value: audits.length,     icon: FileText,    color: "#3b82f6", bg: "#eff6ff" },
                    { label: "Avg Score (30d)", value: avgScore30d ?? "—", icon: ShieldCheck, color: scoreColor(avgScore30d), bg: "#f0fdf4" },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-2xl p-5 flex flex-col gap-3 border border-border"
                      style={{ background: bg }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}20` }}>
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Secondary stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Connected Sites", value: `${connCount} / ${sites.length}` },
                    { label: "Sites Limit",      value: agency.sites_limit === 9999 ? "Unlimited" : agency.sites_limit },
                    { label: "Team Members",     value: team.length },
                    { label: "Audits (30d)",     value: audits30d },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-sm font-bold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                {/* ── Usage card ─────────────────────────────────────────── */}
                <div className="border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 bg-gray-50/40">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-500" />
                      <p className="text-sm font-bold text-foreground">Usage &amp; Quotas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Grant tokens */}
                      {showGrantTokens ? (
                        <div className="inline-flex items-center gap-0 rounded-xl border border-border bg-white overflow-hidden">
                          <span className="text-[11px] font-semibold text-muted-foreground px-3 py-2 border-r border-border">+Tokens</span>
                          <input
                            type="number" min={1} value={grantTokenInput}
                            onChange={e => setGrantTokenInput(e.target.value)}
                            placeholder="e.g. 50000"
                            className="w-24 text-xs font-semibold text-center px-2 py-2 bg-white border-none outline-none"
                          />
                          <button onClick={doGrantTokens} disabled={!grantTokenInput || grantSaving}
                            className="text-[11px] font-bold px-3 py-2 text-white border-l border-amber-400 disabled:opacity-50"
                            style={{ background: AMBER }}>
                            {grantSaving ? "…" : "Grant"}
                          </button>
                          <button onClick={() => { setShowGrantTokens(false); setGrantTokenInput(""); }}
                            className="px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setShowGrantTokens(true); setShowGrantStorage(false); }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-white text-muted-foreground hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-colors">
                          <Gift size={12} /> Grant Tokens
                        </button>
                      )}

                      {/* Grant storage */}
                      {showGrantStorage ? (
                        <div className="inline-flex items-center gap-0 rounded-xl border border-border bg-white overflow-hidden">
                          <span className="text-[11px] font-semibold text-muted-foreground px-3 py-2 border-r border-border">+Storage</span>
                          <input
                            type="number" min={0.1} step={0.5} value={grantStorageInput}
                            onChange={e => setGrantStorageInput(e.target.value)}
                            placeholder="GB"
                            className="w-20 text-xs font-semibold text-center px-2 py-2 bg-white border-none outline-none"
                          />
                          <span className="text-[11px] text-muted-foreground pr-2">GB</span>
                          <button onClick={doGrantStorage} disabled={!grantStorageInput || grantSaving}
                            className="text-[11px] font-bold px-3 py-2 text-white border-l border-amber-400 disabled:opacity-50"
                            style={{ background: AMBER }}>
                            {grantSaving ? "…" : "Grant"}
                          </button>
                          <button onClick={() => { setShowGrantStorage(false); setGrantStorageInput(""); }}
                            className="px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setShowGrantStorage(true); setShowGrantTokens(false); }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-white text-muted-foreground hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-colors">
                          <HardDrive size={12} /> Grant Storage
                        </button>
                      )}

                      {/* Reset usage */}
                      <button onClick={doResetUsage} disabled={grantSaving}
                        title="Reset monthly token usage to 0"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-white text-muted-foreground hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50">
                        <RotateCcw size={12} /> Reset Tokens
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* AI Tokens */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain size={13} className="text-purple-500" />
                          <span className="text-xs font-semibold text-foreground">AI Tokens</span>
                          {(agency.ai_tokens_extra ?? 0) > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                              +{fmtTokens(agency.ai_tokens_extra)} extra
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <span className="font-bold text-foreground">{fmtTokens(tokenUsed)}</span>
                          {" / "}
                          <span>{fmtTokens(tokenTotal)} total</span>
                          <span className="ml-2 text-[10px]">({fmtTokens(tokenMonthlyLimit)}/mo plan)</span>
                        </div>
                      </div>
                      <UsageBar used={tokenUsed} total={tokenTotal} color="#8b5cf6" />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(tokenPct)}% used
                          {agency.ai_tokens_reset_at && ` · resets ${new Date(agency.ai_tokens_reset_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {fmtTokens(Math.max(0, tokenTotal - tokenUsed))} remaining
                        </span>
                      </div>
                    </div>

                    {/* Storage */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <HardDrive size={13} className="text-blue-500" />
                          <span className="text-xs font-semibold text-foreground">Storage</span>
                          {(agency.storage_extra_bytes ?? 0) > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                              +{formatBytes(agency.storage_extra_bytes)} extra
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <span className="font-bold text-foreground">{formatBytes(storageUsed)}</span>
                          {" / "}
                          <span>{formatBytes(storageTotal)}</span>
                        </div>
                      </div>
                      <UsageBar used={storageUsed} total={storageTotal} color="#3b82f6" />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{Math.round(storagePct)}% used · cumulative (never resets)</span>
                        <span className="text-[10px] text-muted-foreground">{formatBytes(Math.max(0, storageTotal - storageUsed))} remaining</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trend chart */}
                <div className="border border-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-4">Avg Audit Score — Last 30 Days</p>
                  {trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="agencyTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={AMBER} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          formatter={(v) => [v, "Avg Score"]}
                        />
                        <Area type="monotone" dataKey="avg_score" stroke={AMBER} strokeWidth={2.5}
                          fill="url(#agencyTrend)" dot={false}
                          activeDot={{ r: 4, fill: AMBER, stroke: "#fff", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                      No completed audits in the last 30 days
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SITES ─────────────────────────────────────────────── */}
            {tab === "sites" && (
              <div className="space-y-4">
                {showAddSite ? (
                  <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800">Add New Site</p>
                    <div className="flex gap-2 flex-wrap">
                      <input value={newSiteUrl} onChange={e => setNewSiteUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 min-w-48 text-sm px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <input value={newSiteName} onChange={e => setNewSiteName(e.target.value)}
                        placeholder="Site name (optional)"
                        className="flex-1 min-w-36 text-sm px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <button onClick={addSite} disabled={!newSiteUrl.trim() || saving}
                        className="text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-opacity"
                        style={{ background: AMBER }}>
                        {saving ? "Adding…" : "Add Site"}
                      </button>
                      <button onClick={() => setShowAddSite(false)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddSite(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 transition-colors">
                    <Plus size={13} /> Add Site
                  </button>
                )}

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        {["Site", "Status", "Last Audit", "Score", ""].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sites.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No sites added yet</td></tr>
                      ) : sites.map(s => (
                        <tr key={s.id}
                          className="border-b border-border last:border-0 hover:bg-amber-50/30 transition-colors cursor-pointer"
                          onClick={() => setSiteDrawer(s.id)}>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 shrink-0">
                                <Globe size={12} className="text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-xs leading-tight">{s.name || s.url}</p>
                                {s.name && <p className="text-[10px] text-muted-foreground">{s.url}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {s.plugin_connected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                <Wifi size={9} /> Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                <WifiOff size={9} /> Disconnected
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{fmtDate(s.last_audit_at)}</td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-bold" style={{ color: scoreColor(s.last_score) }}>
                              {s.last_score ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button onClick={e => { e.stopPropagation(); deleteSite(s.id); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CLIENTS ───────────────────────────────────────────── */}
            {tab === "clients" && (
              <div className="space-y-4">
                {showAddClient ? (
                  <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800">Add New Client</p>
                    <div className="flex gap-2 flex-wrap">
                      <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Client name *"
                        className="flex-1 min-w-36 text-sm px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="Email"
                        className="flex-1 min-w-36 text-sm px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <input value={newClientCo} onChange={e => setNewClientCo(e.target.value)} placeholder="Company"
                        className="flex-1 min-w-36 text-sm px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <button onClick={addClient} disabled={!newClientName.trim() || saving}
                        className="text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50"
                        style={{ background: AMBER }}>
                        {saving ? "Adding…" : "Add Client"}
                      </button>
                      <button onClick={() => setShowAddClient(false)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddClient(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 transition-colors">
                    <Plus size={13} /> Add Client
                  </button>
                )}

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        {["Name", "Email", "Company", "Added", ""].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No clients added yet</td></tr>
                      ) : clients.map(c => (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                          {editClientId === c.id ? (
                            <>
                              <td className="px-3 py-2"><input value={editClientName} onChange={e => setEditClientName(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200" /></td>
                              <td className="px-3 py-2"><input value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200" /></td>
                              <td className="px-3 py-2"><input value={editClientCo} onChange={e => setEditClientCo(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200" /></td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1 justify-end">
                                  <button onClick={saveEditClient} disabled={saving}
                                    className="p-1.5 rounded-lg text-white bg-green-500 hover:bg-green-600 transition-colors">
                                    <Check size={12} />
                                  </button>
                                  <button onClick={() => setEditClientId(null)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors">
                                    <X size={12} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5">
                                <button onClick={() => setClientDrawer(c.id)}
                                  className="font-semibold text-xs text-foreground hover:text-amber-600 transition-colors text-left">
                                  {c.name}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{c.email || "—"}</td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{c.company || "—"}</td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1 justify-end">
                                  <button onClick={() => {
                                    setEditClientId(c.id); setEditClientName(c.name);
                                    setEditClientEmail(c.email || ""); setEditClientCo(c.company || "");
                                  }} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => deleteClient(c.id)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TEAM ──────────────────────────────────────────────── */}
            {tab === "team" && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      {["Member", "Role", "Status", "Joined", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {team.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No team members</td></tr>
                    ) : team.map(m => {
                      const memberInitials = (m.name || m.email).slice(0, 2).toUpperCase();
                      return (
                        <tr key={m.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ background: "#8b5cf6" }}>
                                {memberInitials}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground">{m.name || "—"}</p>
                                <p className="text-[10px] text-muted-foreground">{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 capitalize">{m.role}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {m.invite_accepted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button onClick={() => deleteTeamMember(m.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── AUDIT HISTORY ─────────────────────────────────────── */}
            {tab === "audits" && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      {["Site", "Status", "Score", "Triggered By", "Date"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audits.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No audits yet</td></tr>
                    ) : audits.map(a => (
                      <tr key={a.id} className={`border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors ${
                        a.status === "failed" ? "bg-red-50/30" : ""
                      }`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Globe size={11} className="text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-foreground">{a.site_name || a.site_url}</p>
                              {a.site_name && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{a.site_url}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                            ${a.status === "completed" ? "text-green-700 bg-green-50" :
                              a.status === "failed"    ? "text-red-600 bg-red-50"     :
                              a.status === "running"   ? "text-blue-600 bg-blue-50"   :
                              "text-amber-700 bg-amber-50"}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold" style={{ color: scoreColor(a.overall_score) }}>
                            {a.overall_score ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">{a.triggered_by}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
