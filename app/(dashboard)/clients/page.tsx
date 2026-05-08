"use client";

import { useState } from "react";
import { Plus, Users, Globe, Mail, Building2, Trash2, Link2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { AddClientModal } from "@/components/clients/AddClientModal";
import { AssignSitesModal } from "@/components/clients/AssignSitesModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import api from "@/lib/api";
import type { Client } from "@/types";

function ClientCard({
  client,
  onDeleted,
  onSitesChanged,
}: {
  client: Client;
  onDeleted: () => void;
  onSitesChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

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
      <Card className="p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {client.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-snug truncate">
                {client.name}
              </p>
              {client.company && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {client.company}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete client"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5">
          {client.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail size={11} className="shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.company && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 size={11} className="shrink-0" />
              <span className="truncate">{client.company}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe size={11} className="shrink-0" />
            <span>
              {client.site_count ?? 0}{" "}
              {client.site_count === 1 ? "site" : "sites"} assigned
            </span>
          </div>
        </div>

        {/* Assign sites button */}
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mt-auto"
        >
          <Link2 size={11} />
          Manage assigned sites
        </button>
      </Card>

      {showAssign && (
        <AssignSitesModal
          clientId={client.id}
          clientName={client.name}
          onClose={() => setShowAssign(false)}
          onSaved={() => {
            setShowAssign(false);
            onSitesChanged();
          }}
        />
      )}
    </>
  );
}

export default function ClientsPage() {
  const { clients, loading, error, refetch } = useClients();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Clients"
        description="Manage your client relationships and site assignments."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Add client
          </button>
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && clients.length === 0 && (
        <EmptyState
          icon={<Users size={20} />}
          title="No clients yet"
          description="Add your first client to group sites and send branded reports."
          action={
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Add client
            </button>
          }
        />
      )}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onDeleted={refetch}
              onSitesChanged={refetch}
            />
          ))}
        </div>
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
