"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { Activity, Search, RefreshCw, User, Globe, Clock } from "lucide-react";
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface LogEntry {
  id: string;
  action: string;
  actor_email: string;
  details: Record<string, unknown> | null;
  created_at: string;
  agency_id: string;
  agency_name: string;
  site_url: string | null;
  site_name: string | null;
}

interface Stats {
  total_events: number;
  active_agencies: number;
  last_24h: number;
  last_7d: number;
}

interface ActionType { action: string; count: number; }

const ACTION_COLORS: Record<string, string> = {
  audit_created:   "bg-blue-100 text-blue-700",
  audit_completed: "bg-green-100 text-green-700",
  site_created:    "bg-purple-100 text-purple-700",
  site_deleted:    "bg-red-100 text-red-700",
  scan_completed:  "bg-teal-100 text-teal-700",
  login:           "bg-amber-100 text-amber-700",
  report_created:  "bg-indigo-100 text-indigo-700",
};

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? "bg-gray-100 text-gray-600";
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/activity", {
        params: { search, action: actionFilter, page, limit: 50 },
      });
      setLogs(data.logs);
      setTotal(data.total);
      setStats(data.stats);
      setActionTypes(data.action_types);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
              <Activity size={20} style={{ color: "#6366f1" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Activity Log</h1>
              <p className="text-sm text-muted-foreground">{total.toLocaleString()} events across all agencies</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Events",      value: stats.total_events.toLocaleString(), color: "#6366f1" },
            { label: "Active Agencies",   value: stats.active_agencies,               color: "#8b5cf6" },
            { label: "Last 24 Hours",     value: stats.last_24h.toLocaleString(),     color: "#06b6d4" },
            { label: "Last 7 Days",       value: stats.last_7d.toLocaleString(),      color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email or action…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none"
        >
          <option value="">All actions</option>
          {actionTypes.map(a => (
            <option key={a.action} value={a.action}>{a.action} ({a.count})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agency</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No activity found</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${actionColor(log.action)}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User size={12} />
                    <span>{log.actor_email || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{log.agency_name}</td>
                <td className="px-4 py-3">
                  {log.site_url ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Globe size={12} />
                      <span className="truncate max-w-[160px]">{log.site_name || log.site_url}</span>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={12} />
                    <span>{timeAgo(log.created_at)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
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
