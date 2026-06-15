"use client";

import { useEffect, useState } from "react";
import { X, Users, Globe } from "lucide-react";
import masterApi from "@/lib/masterApi";

interface Props {
  agencyId: string;
  clientId: string;
  onClose: () => void;
}
interface ClientDetail {
  id: string; name: string; email: string | null; company: string | null; created_at: string;
}
interface ClientSite {
  id: string; url: string; name: string | null; plugin_connected: boolean;
  last_audit_at: string | null; last_score: number | null; audit_count: number;
}

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

const AMBER = "#f59e0b";

export function AgencyClientDrawer({ agencyId, clientId, onClose }: Props) {
  const [client,  setClient]  = useState<ClientDetail | null>(null);
  const [sites,   setSites]   = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    masterApi.get<{ client: ClientDetail; sites: ClientSite[] }>(
      `/master/agencies/${agencyId}/clients/${clientId}`
    )
      .then(({ data }) => { setClient(data.client); setSites(data.sites); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agencyId, clientId]);

  const initials = client?.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
  const totalAudits = sites.reduce((acc, s) => acc + s.audit_count, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Users size={16} style={{ color: AMBER }} />
            <h2 className="text-sm font-bold text-foreground">{client?.name ?? "Client Details"}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : client ? (
            <>
              {/* Client info card */}
              <div className="bg-gray-50 rounded-2xl p-5 flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white shrink-0"
                  style={{ background: AMBER }}
                >
                  {initials}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground">{client.name}</h3>
                  {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
                  {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Added {fmtDate(client.created_at)}</p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sites",         value: sites.length },
                  { label: "Total Audits",  value: totalAudits  },
                  { label: "Connected",     value: sites.filter(s => s.plugin_connected).length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Linked sites */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Linked Sites ({sites.length})
                </p>
                {sites.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-muted-foreground">
                    No sites linked to this client
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-gray-50/60">
                          {["Site", "Score", "Audits", "Last Audit"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sites.map(s => (
                          <tr key={s.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <Globe size={10} className="text-muted-foreground shrink-0" />
                                <div>
                                  <p className="font-medium text-foreground leading-tight">{s.name || s.url}</p>
                                  {s.name && <p className="text-muted-foreground text-[10px]">{s.url}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-bold" style={{ color: scoreColor(s.last_score) }}>
                              {s.last_score ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{s.audit_count}</td>
                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(s.last_audit_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">Client not found.</div>
          )}
        </div>
      </div>
    </>
  );
}
