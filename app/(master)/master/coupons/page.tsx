"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Tag, Plus, Trash2, Pencil, X, Check,
  RefreshCw, Users, Calendar,
} from "lucide-react";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface Redemption {
  agency_id:   string;
  agency_name: string;
  redeemed_at: string;
}

interface Coupon {
  id:          string;
  code:        string;
  plan:        string;
  sites_limit: number;
  max_uses:    number;
  used_count:  number;
  expires_at:  string | null;
  created_at:  string;
  redemptions: Redemption[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";

const PLAN_OPTIONS = [
  { value: "freemium",    label: "Starter"  },
  { value: "premium",     label: "Growth"   },
  { value: "agency",      label: "Agency"   },
  { value: "agency_plus", label: "Agency+"  },
];
const PLAN_LABELS: Record<string, string> = {
  freemium: "Starter", premium: "Growth", agency: "Agency", agency_plus: "Agency+",
};
const PLAN_COLORS: Record<string, string> = {
  freemium: "#3b82f6", premium: "#8b5cf6", agency: "#64748b", agency_plus: "#f59e0b",
};

function planLabel(p: string) { return PLAN_LABELS[p] ?? p; }
function planColor(p: string) { return PLAN_COLORS[p] ?? "#64748b"; }

function fmtDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isExpired(d: string | null) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

// ── Blank form ────────────────────────────────────────────────────────────────

const blankForm = { code: "", plan: "freemium", sites_limit: "5", max_uses: "10", expires_at: "" };

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterCouponsPage() {
  const [coupons,   setCoupons]   = useState<Coupon[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(blankForm);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editVals,  setEditVals]  = useState({ max_uses: "", expires_at: "" });
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get<{ coupons: Coupon[] }>("/master/coupons");
      setCoupons(data.coupons);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.code || !form.plan || !form.sites_limit || !form.max_uses) {
      setError("All fields except expiry are required.");
      return;
    }
    setSaving(true); setError(null);
    try {
      await masterApi.post("/master/coupons", {
        code:        form.code.trim().toUpperCase(),
        plan:        form.plan,
        sites_limit: parseInt(form.sites_limit),
        max_uses:    parseInt(form.max_uses),
        expires_at:  form.expires_at || null,
      });
      setForm(blankForm);
      setShowForm(false);
      await load();
      toast.success(`Coupon ${form.code.trim().toUpperCase()} created.`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create coupon.";
      setError(msg);
      toast.error(msg);
    } finally { setSaving(false); }
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await masterApi.patch(`/master/coupons/${id}`, {
        max_uses:   editVals.max_uses   ? parseInt(editVals.max_uses) : undefined,
        expires_at: editVals.expires_at || undefined,
      });
      setEditId(null);
      await load();
      toast.success("Coupon updated.");
    } catch {
      toast.error("Failed to update coupon.");
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    setDeleting(id);
    try {
      await masterApi.delete(`/master/coupons/${id}`);
      await load();
      toast.success("Coupon deleted.");
    } catch {
      toast.error("Failed to delete coupon.");
    } finally { setDeleting(null); }
  }

  const active   = coupons.filter(c => !isExpired(c.expires_at) && c.used_count < c.max_uses);
  const expired  = coupons.filter(c => isExpired(c.expires_at) || c.used_count >= c.max_uses);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Coupons</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? (
                <span className="inline-block w-40 h-4 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <span className="font-semibold text-foreground">{coupons.length}</span>
                  {" "}total ·{" "}
                  <span className="font-semibold text-green-600">{active.length}</span>
                  {" "}active ·{" "}
                  <span className="font-semibold text-muted-foreground">{expired.length}</span>
                  {" "}expired / exhausted
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-muted-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => { setShowForm(s => !s); setError(null); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ background: AMBER }}
            >
              {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> New Coupon</>}
            </button>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">Create Coupon</p>
          {error && <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Code</label>
              <input
                type="text"
                placeholder="LAUNCH50"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Sites Limit</label>
              <input
                type="number" min={1}
                value={form.sites_limit}
                onChange={e => setForm(f => ({ ...f, sites_limit: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Max Uses</label>
              <input
                type="number" min={1}
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Expires (optional)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={create}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ background: AMBER }}
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                {["Code", "Plan", "Sites Limit", "Uses", "Expires", "Redemptions", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No coupons yet — create one above
                  </td>
                </tr>
              ) : coupons.map(c => {
                const expired   = isExpired(c.expires_at) || c.used_count >= c.max_uses;
                const isEditing = editId === c.id;
                const isExpanding = expanded === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      className={`border-b border-border last:border-0 transition-colors ${
                        expired ? "opacity-60 bg-gray-50/60" : "hover:bg-gray-50/40"
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tag size={11} className="text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs font-bold text-foreground">{c.code}</span>
                          {expired && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {c.used_count >= c.max_uses ? "EXHAUSTED" : "EXPIRED"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${planColor(c.plan)}18`, color: planColor(c.plan) }}>
                          {planLabel(c.plan)}
                        </span>
                      </td>

                      {/* Sites limit */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.sites_limit}</td>

                      {/* Uses */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number" min={c.used_count}
                            value={editVals.max_uses}
                            onChange={e => setEditVals(v => ({ ...v, max_uses: e.target.value }))}
                            placeholder={String(c.max_uses)}
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%`,
                                  background: c.used_count >= c.max_uses ? "#ef4444" : AMBER,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{c.used_count}</span>/{c.max_uses}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editVals.expires_at}
                            onChange={e => setEditVals(v => ({ ...v, expires_at: e.target.value }))}
                            className="px-2 py-1 text-xs rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
                          />
                        ) : (
                          <span className={`text-xs ${isExpired(c.expires_at) ? "text-red-500" : "text-muted-foreground"}`}>
                            <Calendar size={10} className="inline mr-1" />
                            {fmtDate(c.expires_at)}
                          </span>
                        )}
                      </td>

                      {/* Redemptions */}
                      <td className="px-4 py-3">
                        {c.redemptions.length > 0 ? (
                          <button
                            onClick={() => setExpanded(isExpanding ? null : c.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Users size={10} />
                            {c.redemptions.length} agenc{c.redemptions.length === 1 ? "y" : "ies"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(c.id)} disabled={saving}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditId(null)}
                                className="p-1.5 rounded-lg bg-gray-50 text-muted-foreground hover:bg-gray-100 transition-colors">
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditId(c.id);
                                  setEditVals({ max_uses: String(c.max_uses), expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "" });
                                }}
                                className="p-1.5 rounded-lg bg-gray-50 text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => del(c.id)}
                                disabled={deleting === c.id}
                                className="p-1.5 rounded-lg bg-gray-50 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Redemption expand */}
                    {isExpanding && c.redemptions.length > 0 && (
                      <tr key={`${c.id}-expand`} className="border-b border-border bg-blue-50/30">
                        <td colSpan={7} className="px-8 py-3">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Redeemed by</p>
                          <div className="flex flex-wrap gap-2">
                            {c.redemptions.map(r => (
                              <div key={r.agency_id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-border text-xs">
                                <span className="font-semibold text-foreground">{r.agency_name}</span>
                                <span className="text-muted-foreground">{fmtDate(r.redeemed_at)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
