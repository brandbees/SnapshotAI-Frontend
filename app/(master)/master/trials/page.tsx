"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import masterApi from "@/lib/masterApi";
import { Clock, RefreshCw, Search, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface TrialAgency {
  id: string; name: string; email: string; plan: string;
  trial_ends_at: string | null; created_at: string;
  site_count: number; team_count: number; last_audit_at: string | null;
  expiring_soon: boolean;
}
interface Stats {
  total_agencies: number; on_trial: number; trial_expired: number; paid: number; expiring_soon: number;
}

const PLANS = ["freemium", "premium", "agency", "agency_plus"];
const PLAN_LABELS: Record<string, string> = {
  free: "Free", freemium: "Starter", premium: "Growth", agency: "Agency", agency_plus: "Agency+",
};

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function trialBadge(ag: TrialAgency) {
  const d = daysLeft(ag.trial_ends_at);
  if (ag.plan !== "free") return { label: `Paid · ${PLAN_LABELS[ag.plan] ?? ag.plan}`, bg: "bg-green-100", text: "text-green-700" };
  if (d === null)          return { label: "No trial", bg: "bg-gray-100", text: "text-gray-500" };
  if (d < 0)               return { label: "Expired", bg: "bg-red-100", text: "text-red-700" };
  if (d <= 3)              return { label: `${d}d left`, bg: "bg-red-50", text: "text-red-600" };
  if (d <= 7)              return { label: `${d}d left`, bg: "bg-amber-50", text: "text-amber-600" };
  return                          { label: `${d}d left`, bg: "bg-blue-50", text: "text-blue-600" };
}

export default function TrialsPage() {
  const [agencies, setAgencies]   = useState<TrialAgency[]>([]);
  const [stats,    setStats]      = useState<Stats | null>(null);
  const [total,    setTotal]      = useState(0);
  const [page,     setPage]       = useState(1);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState("");
  const [status,   setStatus]     = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [saving,   setSaving]     = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [convertPlan, setConvertPlan] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/trials", {
        params: { search, status, page, limit: 50 },
      });
      setAgencies(data.agencies);
      setTotal(data.total);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  async function extendTrial(id: string) {
    const days = parseInt(extendDays[id] ?? "7") || 7;
    setSaving(id + "_extend");
    try {
      await masterApi.patch(`/master/trials/${id}/extend-trial`, { days });
      toast.success(`Trial extended by ${days} days.`);
      load();
    } catch { toast.error("Failed to extend trial."); }
    finally { setSaving(null); }
  }

  async function convertAgency(id: string) {
    const plan = convertPlan[id];
    if (!plan) return;
    setSaving(id + "_convert");
    try {
      await masterApi.patch(`/master/trials/${id}/convert`, { plan });
      toast.success(`Converted to ${PLAN_LABELS[plan] ?? plan}.`);
      load();
    } catch { toast.error("Failed to convert plan."); }
    finally { setSaving(null); }
  }

  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#f59e0b,#f97316)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
              <Clock size={20} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Trial Management</h1>
              <p className="text-sm text-muted-foreground">
                {stats ? `${stats.on_trial} on trial · ${stats.expiring_soon} expiring soon · ${stats.paid} paid` : `${total} agencies`}
              </p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total",         value: stats.total_agencies, color: "#6366f1", filter: "" },
            { label: "On Trial",      value: stats.on_trial,       color: "#3b82f6", filter: "trial" },
            { label: "Expiring Soon", value: stats.expiring_soon,  color: "#f97316", filter: "expiring" },
            { label: "Expired",       value: stats.trial_expired,  color: "#ef4444", filter: "expired" },
            { label: "Paid",          value: stats.paid,           color: "#22c55e", filter: "paid" },
          ].map(s => (
            <div key={s.label}
              onClick={() => { setStatus(status === s.filter ? "" : s.filter); setPage(1); }}
              className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-sm transition-all ${status === s.filter ? "ring-2 ring-offset-1 border-transparent" : "border-border"}`}
              style={status === s.filter ? { borderColor: s.color, outline: `2px solid ${s.color}` } : {}}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none" />
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">Loading…</div>
        ) : agencies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">No agencies found</div>
        ) : agencies.map(ag => {
          const badge = trialBadge(ag);
          const open  = expanded === ag.id;
          const d     = daysLeft(ag.trial_ends_at);
          return (
            <div key={ag.id} className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(open ? null : ag.id)}>
                {ag.expiring_soon && <AlertTriangle size={14} className="text-orange-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{ag.name}</p>
                  <p className="text-xs text-muted-foreground">{ag.email}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                <div className="text-xs text-muted-foreground hidden sm:block w-28 text-right">
                  {ag.trial_ends_at && d !== null && d >= 0
                    ? `Ends ${new Date(ag.trial_ends_at).toLocaleDateString()}`
                    : ag.trial_ends_at && d !== null && d < 0
                    ? `Ended ${new Date(ag.trial_ends_at).toLocaleDateString()}`
                    : "—"}
                </div>
                {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </div>

              {open && (
                <div className="border-t border-border px-5 py-4 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Extend trial */}
                  {ag.plan === "free" && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Extend Trial</p>
                      <div className="flex gap-2">
                        <select value={extendDays[ag.id] ?? "7"}
                          onChange={e => setExtendDays(prev => ({ ...prev, [ag.id]: e.target.value }))}
                          className="flex-1 px-2 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none">
                          {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}
                        </select>
                        <button onClick={() => extendTrial(ag.id)}
                          disabled={saving === ag.id + "_extend"}
                          className="px-3 py-1.5 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                          style={{ background: "#f59e0b" }}>
                          {saving === ag.id + "_extend" ? "…" : "Extend"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Convert plan */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Convert Plan</p>
                    <div className="flex gap-2">
                      <select value={convertPlan[ag.id] ?? ""}
                        onChange={e => setConvertPlan(prev => ({ ...prev, [ag.id]: e.target.value }))}
                        className="flex-1 px-2 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none">
                        <option value="">Select plan…</option>
                        {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                      </select>
                      <button onClick={() => convertAgency(ag.id)}
                        disabled={!convertPlan[ag.id] || saving === ag.id + "_convert"}
                        className="px-3 py-1.5 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                        style={{ background: "#22c55e" }}>
                        {saving === ag.id + "_convert" ? "…" : "Convert"}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="sm:col-span-2 flex gap-6 text-xs text-muted-foreground border-t border-border pt-3 mt-1">
                    <span><strong className="text-foreground">{ag.site_count}</strong> sites</span>
                    <span><strong className="text-foreground">{ag.team_count}</strong> team members</span>
                    <span>Joined {new Date(ag.created_at).toLocaleDateString()}</span>
                    {ag.last_audit_at && <span>Last audit {new Date(ag.last_audit_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
