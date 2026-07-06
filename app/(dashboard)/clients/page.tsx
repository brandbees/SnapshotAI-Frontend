"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Users, Globe, Mail, Building2, Trash2, Link2, Search,
  ChevronRight, Pencil, Loader2, X, Send, CheckCircle2, Clock,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { AddClientModal } from "@/components/clients/AddClientModal";
import { AssignSitesModal } from "@/components/clients/AssignSitesModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import api from "@/lib/api";
import type { Client } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLIENT_COLORS = [
  "#1f5fb8", "#8b5cf6", "#ec4899", "#f97316",
  "#14b8a6", "#0ea5e9", "#84cc16", "#f59e0b",
];

function clientColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── EditClientModal ───────────────────────────────────────────────────────────

function EditClientModal({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: (updated: Client) => void }) {
  const [name,    setName]    = useState(client.name);
  const [email,   setEmail]   = useState(client.email ?? "");
  const [company, setCompany] = useState(client.company ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put<{ client: Client }>(`/clients/${client.id}`, {
        name: name.trim(),
        email: email.trim() || null,
        company: company.trim() || null,
      });
      onSaved(data.client);
      toast.success("Client updated successfully.");
    } catch {
      setError("Failed to update client");
      toast.error("Failed to update client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Edit Client</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Update client details</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Name <span className="text-destructive">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Company name (optional)"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ClientCard ────────────────────────────────────────────────────────────────

function ClientCard({
  client, onDeleted, onSitesChanged,
}: {
  client: Client;
  onDeleted: () => void;
  onSitesChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [showAssign, setShowAssign]       = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [localClient, setLocalClient]     = useState(client);
  const [inviting, setInviting]           = useState(false);
  const { roleCanDo }                     = useRole();
  const color                             = clientColor(localClient.name);

  async function handleSendInvite() {
    if (!localClient.email) {
      toast.error("Add an email address to this client first.");
      return;
    }
    setInviting(true);
    try {
      await api.post(`/clients/${localClient.id}/invite`);
      toast.success(`Portal invite sent to ${localClient.email}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await api.delete(`/clients/${client.id}`);
      toast.success(`${client.name} deleted.`);
      onDeleted();
    } catch {
      toast.error("Failed to delete client.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base overflow-hidden group">

        {/* Colored top accent */}
        <div className="h-1.5 w-full" style={{ background: `${color}60` }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: color }}>
                {initials(client.name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate leading-tight">{localClient.name}</p>
                {localClient.company && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{localClient.company}</p>
                )}
              </div>
            </div>

            {roleCanDo("add_site") && (
              <div className="shrink-0 flex items-center gap-1">
                {confirmDelete ? (
                  <>
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                      {deleting ? "…" : "Confirm"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowEdit(true)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
                      title="Edit client">
                      <Pencil size={13} />
                    </button>
                    <button onClick={handleDelete}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Delete client">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-4 py-3 px-3 bg-muted/40 rounded-xl mb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe size={11} style={{ color }} />
              <span className="font-semibold text-foreground">{localClient.site_count ?? 0}</span>
              <span>{localClient.site_count === 1 ? "site" : "sites"}</span>
            </div>
            {localClient.email && (
              <>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                  <Mail size={11} className="shrink-0" />
                  <span className="truncate max-w-[130px]">{localClient.email}</span>
                </div>
              </>
            )}
          </div>

          {/* Portal invite status + action */}
          {roleCanDo("add_site") && (
            <div className="mb-3">
              {localClient.invite_accepted ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-xs text-green-700 font-medium">
                  <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                  Client portal active
                </div>
              ) : localClient.invite_token ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                    <Clock size={12} className="shrink-0" />
                    Invite pending
                  </div>
                  <button onClick={handleSendInvite} disabled={inviting}
                    className="text-xs text-amber-600 hover:text-amber-800 font-semibold disabled:opacity-50">
                    {inviting ? "Sending…" : "Resend"}
                  </button>
                </div>
              ) : (
                <button onClick={handleSendInvite} disabled={inviting || !localClient.email}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-all group/inv disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: "var(--accent)" }}
                  title={!localClient.email ? "Add an email to this client first" : undefined}>
                  <span className="flex items-center gap-1.5">
                    {inviting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    {inviting ? "Sending invite…" : "Send portal invite"}
                  </span>
                  <ChevronRight size={12} className="opacity-50 group-hover/inv:opacity-100 group-hover/inv:translate-x-0.5 transition-all" />
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          {roleCanDo("add_site") ? (
            <button
              onClick={() => setShowAssign(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-border hover:border-accent/40 hover:bg-accent/5 transition-all group/btn"
              style={{ color: "var(--accent)" }}>
              <span className="flex items-center gap-1.5">
                <Link2 size={11} />Manage assigned sites
              </span>
              <ChevronRight size={12} className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs text-muted-foreground">
              <Globe size={11} />
              <span>{client.site_count ?? 0} site{client.site_count === 1 ? "" : "s"} assigned</span>
            </div>
          )}
        </div>
      </div>

      {showAssign && (
        <AssignSitesModal
          clientId={localClient.id}
          clientName={localClient.name}
          onClose={() => setShowAssign(false)}
          onSaved={() => { setShowAssign(false); onSitesChanged(); }}
        />
      )}

      {showEdit && (
        <EditClientModal
          client={localClient}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setLocalClient({ ...localClient, ...updated }); setShowEdit(false); }}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { clients, loading, error, refetch } = useClients();
  const { roleCanDo }  = useRole();
  const { agency }     = useAuth();
  const brandColor     = agency?.accent_color ?? "#1f5fb8";
  const canAdd         = roleCanDo("add_site");

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch]   = useState("");

  const totalSites    = useMemo(() => clients.reduce((sum, c) => sum + (c.site_count ?? 0), 0), [clients]);
  const withCompany   = useMemo(() => clients.filter(c => c.company).length, [clients]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">Management</p>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage client relationships, assign sites, and send branded reports.
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
            style={{ background: brandColor }}>
            <Plus size={15} />Add Client
          </button>
        )}
      </div>

      {/* ── Loading / Error ── */}
      {loading && <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* ── Content ── */}
      {!loading && !error && (
        <>
          {clients.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
              <EmptyState
                icon={<Users size={22} />}
                title="No clients yet"
                description="Add your first client to group sites and send branded reports."
                action={canAdd ? (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: brandColor }}>
                    Add your first client
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Clients",    value: clients.length,  icon: Users,     color: brandColor },
                  { label: "Sites Assigned",   value: totalSites,      icon: Globe,     color: "#16a34a" },
                  { label: "With Company Info", value: withCompany,    icon: Building2, color: "#f97316" },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl shadow-elevated-sm px-5 py-4 flex items-center gap-4 hover:shadow-elevated-md hover:-translate-y-0.5 transition-all duration-base">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${stat.color}15` }}>
                      <stat.icon size={18} style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-black tabular-nums text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text" placeholder="Search clients…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-border rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Grid */}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No clients match your search.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(client => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onDeleted={refetch}
                      onSitesChanged={refetch}
                    />
                  ))}

                  {/* Add client tile */}
                  {canAdd && (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="rounded-2xl border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/3 transition-all flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground hover:text-accent group min-h-[180px]">
                      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={18} />
                      </div>
                      <span className="text-xs font-semibold">Add new client</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </div>
  );
}
