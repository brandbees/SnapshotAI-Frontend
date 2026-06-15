"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { FileText, Search, RefreshCw, Download, Send, Globe } from "lucide-react";

interface Report {
  id: string; pdf_url: string | null; portal_token: string | null;
  sent_to: string[] | null; sent_at: string | null; created_at: string;
  site_id: string; site_url: string; site_name: string;
  agency_id: string; agency_name: string; plan: string;
  overall_score: number | null; audit_status: string | null;
}
interface Stats {
  total_reports: number; agencies_with_reports: number; sites_with_reports: number;
  sent_reports: number; last_7d: number; last_30d: number;
}

function scoreColor(s: number | null) {
  if (!s) return "#94a3b8";
  if (s >= 90) return "#22c55e"; if (s >= 75) return "#84cc16";
  if (s >= 50) return "#eab308"; return "#ef4444";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ReportsPage() {
  const [reports,  setReports]  = useState<Report[]>([]);
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/reports", {
        params: { search, page, limit: 50 },
      });
      setReports(data.reports);
      setTotal(data.total);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#06b6d4,#3b82f6)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)" }}>
              <FileText size={20} style={{ color: "#06b6d4" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Reports Center</h1>
              <p className="text-sm text-muted-foreground">{total.toLocaleString()} reports across platform</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total",     value: stats.total_reports,          color: "#06b6d4" },
            { label: "Sent",      value: stats.sent_reports,           color: "#22c55e" },
            { label: "Last 7d",   value: stats.last_7d,                color: "#8b5cf6" },
            { label: "Last 30d",  value: stats.last_30d,               color: "#6366f1" },
            { label: "Agencies",  value: stats.agencies_with_reports,  color: "#f59e0b" },
            { label: "Sites",     value: stats.sites_with_reports,     color: "#f97316" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search site or agency…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No reports found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {["Site", "Agency", "Score", "Created", "Sent", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Globe size={12} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[180px]">{r.site_name || r.site_url}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{r.site_url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.agency_name}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.overall_score != null ? (
                      <span className="text-sm font-bold" style={{ color: scoreColor(r.overall_score) }}>{r.overall_score}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.sent_at ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs">
                        <Send size={11} />
                        <span>{timeAgo(r.sent_at)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not sent</span>
                    )}
                    {r.sent_to && r.sent_to.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{r.sent_to.join(", ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.pdf_url && (
                        <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors">
                          <Download size={11} /> PDF
                        </a>
                      )}
                      {r.portal_token && (
                        <a href={`/report/${r.portal_token}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors">
                          Portal
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
  );
}
