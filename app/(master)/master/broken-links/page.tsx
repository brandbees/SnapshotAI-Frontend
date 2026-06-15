"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { LinkIcon, Search, RefreshCw, Globe, AlertCircle } from "lucide-react";
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface BrokenLink {
  id: string;
  url: string;
  status_code: number | null;
  found_on: string | null;
  checked_at: string;
  site_id: string;
  site_url: string;
  site_name: string;
  agency_id: string;
  agency_name: string;
}

interface Stats {
  total_broken: number;
  affected_sites: number;
  not_found: number;
  server_error: number;
  timeout: number;
  last_checked: string | null;
}

interface TopSite {
  id: string;
  site_url: string;
  site_name: string;
  agency_name: string;
  broken_count: number;
}

function statusStyle(code: number | null) {
  if (!code)        return { bg: "bg-gray-100",   text: "text-gray-600",   label: "Timeout" };
  if (code === 404) return { bg: "bg-red-100",    text: "text-red-700",    label: "404" };
  if (code >= 500)  return { bg: "bg-orange-100", text: "text-orange-700", label: String(code) };
  if (code >= 400)  return { bg: "bg-yellow-100", text: "text-yellow-700", label: String(code) };
  return                   { bg: "bg-gray-100",   text: "text-gray-600",   label: String(code) };
}

export default function BrokenLinksPage() {
  const [links, setLinks] = useState<BrokenLink[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topSites, setTopSites] = useState<TopSite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/broken-links", {
        params: { search, status_code: statusFilter, page, limit: 50 },
      });
      setLinks(data.links);
      setTotal(data.total);
      setStats(data.stats);
      setTopSites(data.top_sites);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
              <LinkIcon size={20} style={{ color: "#f97316" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Broken Links</h1>
              <p className="text-sm text-muted-foreground">{total.toLocaleString()} broken links across {stats?.affected_sites ?? 0} sites</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: stats + top sites */}
        <div className="space-y-4">
          {stats && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Overview</h3>
              {[
                { label: "Total broken",    value: stats.total_broken,    color: "#ef4444" },
                { label: "Affected sites",  value: stats.affected_sites,  color: "#f97316" },
                { label: "404 Not Found",   value: stats.not_found,       color: "#eab308" },
                { label: "Server errors",   value: stats.server_error,    color: "#8b5cf6" },
                { label: "Timeouts",        value: stats.timeout,         color: "#6b7280" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.value.toLocaleString()}</span>
                </div>
              ))}
              {stats.last_checked && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Last scan: {timeAgo(stats.last_checked)}
                </p>
              )}
            </div>
          )}

          {topSites.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3">Most affected sites</h3>
              <div className="space-y-2">
                {topSites.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-[11px] font-bold text-muted-foreground flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.site_name || s.site_url}</p>
                      <p className="text-xs text-muted-foreground">{s.agency_name}</p>
                    </div>
                    <span className="text-sm font-bold text-red-500">{s.broken_count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search URLs…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none" />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none">
              <option value="">All status codes</option>
              <option value="404">404</option>
              <option value="500">500</option>
              <option value="403">403</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading…</div>
            ) : links.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground">No broken links found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Found</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {links.map(link => {
                    const s = statusStyle(link.status_code);
                    return (
                      <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-foreground truncate max-w-[220px]">{link.url}</p>
                          {link.found_on && <p className="text-xs text-muted-foreground truncate max-w-[220px] mt-0.5">on: {link.found_on}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Globe size={12} />
                            <span className="truncate max-w-[120px]">{link.site_name || link.site_url}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{link.agency_name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(link.checked_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
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
        </div>
      </div>
    </div>
  );
}
