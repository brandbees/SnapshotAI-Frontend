"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Globe, Wifi, WifiOff, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import masterApi from "@/lib/masterApi";
import { MasterSiteDrawer } from "@/components/master/MasterSiteDrawer";

// ── Types ────────────────────────────────────────────────────────────────────

interface Site {
  id: string;
  url: string;
  name: string | null;
  plugin_connected: boolean;
  last_audit_at: string | null;
  ssl_expiry_date: string | null;
  domain_expiry_date: string | null;
  created_at: string;
  agency_id: string;
  agency_name: string;
  agency_plan: string;
  last_score: number | null;
  audit_count: number;
}

interface Stats {
  total_sites: number;
  connected: number;
  disconnected: number;
}

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

function scoreColor(s: number | null) {
  if (s === null) return "#94a3b8";
  if (s >= 80) return "#10b981";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function sslBadge(d: string | null): { label: string; color: string; bg: string } | null {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days > 30) return null;
  if (days <= 7)  return { label: `${days}d`, color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  return { label: `${days}d`, color: AMBER, bg: "rgba(245,158,11,0.08)" };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function planLabel(p: string) {
  return PLAN_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function planColor(p: string) { return PLAN_COLORS[p] ?? "#64748b"; }

const CONNECTED_FILTERS = [
  { key: "",      label: "All"          },
  { key: "true",  label: "Connected"    },
  { key: "false", label: "Disconnected" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function MasterSitesPage() {
  const [sites,   setSites]   = useState<Site[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [connected, setConnected] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawer,  setDrawer]  = useState<string | null>(null);

  const LIMIT = 50;

  const load = useCallback(async (p: number, q: string, conn: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(LIMIT), search: q, connected: conn,
      });
      const { data } = await masterApi.get<{ sites: Site[]; total: number; stats: Stats }>(
        `/master/sites?${params}`
      );
      setSites(data.sites);
      setTotal(data.total);
      setStats(data.stats);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search, connected); }, [page, search, connected, load]);

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleConnected(val: string) { setConnected(val); setPage(1); }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      {drawer && <MasterSiteDrawer siteId={drawer} onClose={() => setDrawer(null)} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
          <div className="px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Sites</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stats ? (
                  <>
                    <span className="font-semibold text-foreground">{stats.total_sites}</span>
                    {" "}total ·{" "}
                    <span className="font-semibold text-green-600">{stats.connected}</span>
                    {" "}connected ·{" "}
                    {stats.disconnected > 0 ? (
                      <span className="font-semibold text-red-500">{stats.disconnected} disconnected</span>
                    ) : (
                      <span className="font-semibold text-muted-foreground">0 disconnected</span>
                    )}
                  </>
                ) : (
                  <span className="inline-block w-40 h-4 bg-gray-100 rounded animate-pulse" />
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-gray-50 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                <Wifi size={12} className="text-green-500" />
                <span className="text-foreground">{stats?.connected ?? "—"}</span>
                <span>connected</span>
              </div>
              {(stats?.disconnected ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-600 whitespace-nowrap">
                  <WifiOff size={12} />
                  <span>{stats?.disconnected}</span>
                  <span>offline</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-gray-50 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                <Globe size={12} style={{ color: AMBER }} />
                <span className="text-foreground">{stats?.total_sites ?? "—"}</span>
                <span>total sites</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Sites",   value: stats?.total_sites  ?? "—", icon: Globe,   color: AMBER         },
            { label: "Connected",     value: stats?.connected    ?? "—", icon: Wifi,    color: "#10b981"     },
            { label: "Disconnected",  value: stats?.disconnected ?? "—", icon: WifiOff, color: "#ef4444",
              alert: (stats?.disconnected ?? 0) > 0 },
          ].map(({ label, value, icon: Icon, color, alert }) => (
            <div
              key={label}
              className={`rounded-2xl border p-4 flex items-center gap-4 ${
                alert ? "bg-red-50 border-red-200" : "bg-white border-border"
              }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}15` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search URL or name…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
            />
          </div>

          <div className="flex gap-1.5">
            {CONNECTED_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleConnected(key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border"
                style={connected === key
                  ? { background: AMBER, color: "#fff", borderColor: AMBER }
                  : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  {["Site", "Agency", "Plan", "Status", "Last Score", "Audits", "SSL Expiry", "Last Audit"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sites.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No sites found
                    </td>
                  </tr>
                ) : sites.map(site => {
                  const ssl = sslBadge(site.ssl_expiry_date);
                  return (
                    <tr
                      key={site.id}
                      onClick={() => setDrawer(site.id)}
                      className="border-b border-border last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                    >
                      {/* Site */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Globe size={12} className="text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs leading-tight truncate max-w-[180px]">
                              {site.name || site.url}
                            </p>
                            {site.name && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{site.url}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Agency */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-foreground">{site.agency_name}</p>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: `${planColor(site.agency_plan)}18`, color: planColor(site.agency_plan) }}
                        >
                          {planLabel(site.agency_plan)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {site.plugin_connected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                            <Wifi size={9} /> Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                            <WifiOff size={9} /> Disconnected
                          </span>
                        )}
                      </td>

                      {/* Last Score */}
                      <td className="px-4 py-3.5 font-bold text-xs" style={{ color: scoreColor(site.last_score) }}>
                        {site.last_score ?? "—"}
                      </td>

                      {/* Audits */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {site.audit_count}
                      </td>

                      {/* SSL Expiry */}
                      <td className="px-4 py-3.5">
                        {ssl ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: ssl.bg, color: ssl.color }}
                          >
                            <ShieldAlert size={9} /> {ssl.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{fmtDate(site.ssl_expiry_date)}</span>
                        )}
                      </td>

                      {/* Last Audit */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(site.last_audit_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-foreground px-1">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
