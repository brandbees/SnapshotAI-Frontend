"use client";

import { useState, useMemo } from "react";
import {
  Plus, Users, Globe, Mail, Building2, Trash2, Link2, Search,
  ChevronRight,
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
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
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
  const { roleCanDo }                     = useRole();
  const color                             = clientColor(client.name);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await api.delete(`/clients/${client.id}`);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">

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
                <p className="font-bold text-sm text-foreground truncate leading-tight">{client.name}</p>
                {client.company && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{client.company}</p>
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
                  <button onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete client">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-4 py-3 px-3 bg-muted/40 rounded-xl mb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe size={11} style={{ color }} />
              <span className="font-semibold text-foreground">{client.site_count ?? 0}</span>
              <span>{client.site_count === 1 ? "site" : "sites"}</span>
            </div>
            {client.email && (
              <>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                  <Mail size={11} className="shrink-0" />
                  <span className="truncate max-w-[130px]">{client.email}</span>
                </div>
              </>
            )}
          </div>

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
          clientId={client.id}
          clientName={client.name}
          onClose={() => setShowAssign(false)}
          onSaved={() => { setShowAssign(false); onSitesChanged(); }}
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
  const brandColor     = agency?.accent_color ?? "#6366f1";
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
            <div className="bg-white rounded-2xl border border-border shadow-sm">
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
                  <div key={stat.label} className="bg-white rounded-2xl border border-border shadow-sm px-5 py-4 flex items-center gap-4">
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
