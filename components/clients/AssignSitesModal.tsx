"use client";

import { useState, useEffect } from "react";
import { X, Globe, Check } from "lucide-react";
import api from "@/lib/api";
import { mapSite, type RawSite } from "@/lib/mappers";
import type { Site } from "@/types";
import { truncateUrl } from "@/lib/utils";

interface AssignSitesModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AssignSitesModal({
  clientId,
  clientName,
  onClose,
  onSaved,
}: AssignSitesModalProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [original, setOriginal] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ sites: RawSite[] }>("/sites").then(({ data }) => {
      const mapped = (data.sites ?? []).map(mapSite);
      setSites(mapped);
      const assigned = new Set(
        mapped
          .filter((s) => s.client_id === clientId)
          .map((s) => s.id)
      );
      setSelected(new Set(assigned));
      setOriginal(new Set(assigned));
      setLoading(false);
    });
  }, [clientId]);

  function toggle(siteId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const toAssign = sites
      .filter((s) => selected.has(s.id) && !original.has(s.id));
    const toUnassign = sites
      .filter((s) => !selected.has(s.id) && original.has(s.id));

    await Promise.all([
      ...toAssign.map((s) =>
        api.patch(`/sites/${s.id}/client`, { client_id: clientId })
      ),
      ...toUnassign.map((s) =>
        api.patch(`/sites/${s.id}/client`, { client_id: null })
      ),
    ]);

    onSaved();
  }

  const hasChanges =
    [...selected].some((id) => !original.has(id)) ||
    [...original].some((id) => !selected.has(id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Assign sites
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Site list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading sites…
            </p>
          ) : sites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sites added yet.
            </p>
          ) : (
            sites.map((site) => {
              const isSelected = selected.has(site.id);
              const takenByOther =
                site.client_id && site.client_id !== clientId;
              return (
                <button
                  key={site.id}
                  type="button"
                  disabled={!!takenByOther}
                  onClick={() => toggle(site.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/5"
                      : "border-border hover:bg-muted"
                  } ${takenByOther ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? "bg-accent border-accent"
                        : "border-border bg-background"
                    }`}
                  >
                    {isSelected && <Check size={11} className="text-white" />}
                  </div>
                  <Globe size={13} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {site.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {truncateUrl(site.url)}
                    </p>
                  </div>
                  {takenByOther && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Other client
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasChanges || saving}
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
