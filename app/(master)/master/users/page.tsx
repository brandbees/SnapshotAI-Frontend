"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, X, Check,
  RefreshCw, KeyRound, Eye, EyeOff, UserCircle2,
} from "lucide-react";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface MasterUser {
  id:           string;
  email:        string;
  name:         string | null;
  role:         string;
  source:       "env" | "db";
  created_at:   string | null;
  last_seen_at: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin",       label: "Admin"       },
  { value: "support",     label: "Support"     },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#f59e0b",
  admin:       "#8b5cf6",
  support:     "#3b82f6",
};

function roleColor(r: string) { return ROLE_COLORS[r] ?? "#64748b"; }
function roleLabel(r: string) { return ROLE_OPTIONS.find(o => o.value === r)?.label ?? r; }

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function genPassword(len = 16) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const blankForm = { email: "", name: "", role: "admin", password: "" };

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterUsersPage() {
  const [users,    setUsers]    = useState<MasterUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(blankForm);
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetId,  setResetId]  = useState<string | null>(null);
  const [resetPw,  setResetPw]  = useState("");
  const [showReset,setShowReset]= useState(false);
  const [roleEdit, setRoleEdit] = useState<string | null>(null);
  const [roleVal,  setRoleVal]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get<{ users: MasterUser[] }>("/master/users");
      setUsers(data.users);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    setSaving(true); setError(null);
    try {
      await masterApi.post("/master/users", form);
      setForm(blankForm);
      setShowForm(false);
      await load();
      toast.success("User created.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create user.";
      setError(msg);
      toast.error(msg);
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    setDeleting(id);
    try {
      await masterApi.delete(`/master/users/${id}`);
      await load();
      toast.success("User deleted.");
    } catch {
      toast.error("Failed to delete user.");
    } finally { setDeleting(null); }
  }

  async function saveRole(id: string) {
    setSaving(true);
    try {
      await masterApi.patch(`/master/users/${id}/role`, { role: roleVal });
      setRoleEdit(null);
      await load();
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    } finally { setSaving(false); }
  }

  async function resetPassword(id: string) {
    if (!resetPw || resetPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true); setError(null);
    try {
      await masterApi.patch(`/master/users/${id}/password`, { password: resetPw });
      setResetId(null);
      setResetPw("");
      toast.success("Password updated.");
    } catch {
      toast.error("Failed to update password.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Master Users</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? (
                <span className="inline-block w-40 h-4 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <span className="font-semibold text-foreground">{users.length}</span>
                  {" "}admin user{users.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold text-muted-foreground">
                    {users.filter(u => u.source === "env").length} from env ·{" "}
                    {users.filter(u => u.source === "db").length} from DB
                  </span>
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
              {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add User</>}
            </button>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold text-foreground mb-4">New Master User</p>
          {error && <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                  className="text-[10px] text-amber-600 font-semibold hover:underline"
                >Generate</button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-8 text-sm rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={create} disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: AMBER }}
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              Create User
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No users found</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map(u => {
              const initials = (u.name ?? u.email).slice(0, 2).toUpperCase();
              const isEditingRole  = roleEdit === u.id;
              const isResettingPw  = resetId === u.id;

              return (
                <React.Fragment key={u.id}>
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: roleColor(u.role) }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {u.name ?? u.email}
                        </p>
                        {u.name && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        {/* Source badge */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                          u.source === "env"
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                        }`}>
                          {u.source === "env" ? "ENV" : "DB"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                        <span>Last seen: {fmtDate(u.last_seen_at)}</span>
                        {u.created_at && <span>Created: {fmtDate(u.created_at)}</span>}
                      </div>
                    </div>

                    {/* Role */}
                    <div className="shrink-0">
                      {isEditingRole ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={roleVal}
                            onChange={e => setRoleVal(e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
                          >
                            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <button onClick={() => saveRole(u.id)} disabled={saving}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setRoleEdit(null)}
                            className="p-1.5 rounded-lg bg-gray-50 text-muted-foreground hover:bg-gray-100 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (u.source === "env") return;
                            setRoleEdit(u.id);
                            setRoleVal(u.role);
                          }}
                          disabled={u.source === "env"}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors disabled:cursor-default"
                          style={{ background: `${roleColor(u.role)}18`, color: roleColor(u.role) }}
                        >
                          {roleLabel(u.role)}
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    {u.source === "db" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setResetId(isResettingPw ? null : u.id);
                            setResetPw("");
                            setError(null);
                          }}
                          className="p-1.5 rounded-lg bg-gray-50 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => del(u.id)}
                          disabled={deleting === u.id}
                          className="p-1.5 rounded-lg bg-gray-50 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Password reset inline panel */}
                  {isResettingPw && (
                    <div className="px-5 pb-4 flex items-center gap-3 bg-amber-50/30">
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="relative flex-1 max-w-xs">
                        <input
                          type={showReset ? "text" : "password"}
                          placeholder="New password (min 8 chars)"
                          value={resetPw}
                          onChange={e => setResetPw(e.target.value)}
                          className="w-full px-3 py-2 pr-8 text-sm rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono"
                        />
                        <button type="button" onClick={() => setShowReset(s => !s)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showReset ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResetPw(genPassword())}
                        className="text-xs text-amber-600 font-semibold hover:underline"
                      >Generate</button>
                      <button
                        onClick={() => resetPassword(u.id)} disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: AMBER }}
                      >
                        {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                        Update
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
        <UserCircle2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">ENV user</span> is authenticated via <code className="font-mono bg-blue-100 px-1 rounded">MASTER_EMAIL</code> / <code className="font-mono bg-blue-100 px-1 rounded">MASTER_PASSWORD</code> environment variables.
          DB users are stored in the <code className="font-mono bg-blue-100 px-1 rounded">master_users</code> table with bcrypt hashed passwords.
          Both can log in with the same master login page.
        </p>
      </div>
    </div>
  );
}
