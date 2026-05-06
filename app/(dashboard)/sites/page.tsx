"use client";

import { useState } from "react";
import { Plus, Globe } from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddSiteModal } from "@/components/sites/AddSiteModal";
import { PLAN_LIMITS } from "@/lib/constants";

export default function SitesPage() {
  const { sites, loading, error, refetch } = useSites();
  const { agency } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  const limit = agency ? PLAN_LIMITS[agency.plan] : 1;
  const atLimit = sites.length >= limit;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Your Sites"
        action={
          <button
            onClick={() => setShowAdd(true)}
            disabled={atLimit}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Add site
          </button>
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!loading && !error && sites.length === 0 && (
        <EmptyState
          icon={<Globe size={20} />}
          title="No sites yet"
          description="Add your first site to start monitoring."
          action={
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Add site
            </button>
          }
        />
      )}
      {!loading && sites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </div>
  );
}
