"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { MonitorCheck, RefreshCw, Search, ArrowUp, ArrowDown, Minus } from "lucide-react";
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface UptimeSite {
  id: string;
  url: string;
  name: string;
  plugin_connected: boolean;
  agency_id: string;
  agency_name: string;
  current_status: "up" | "down" | null;
  last_response_ms: number | null;
  last_checked: string | null;
  uptime_pct_7d: number | null;
  avg_response_ms_7d: number | null;
}

interface UptimeStats {
  total_monitored: number;
  sites_up: number;
  sites_down: number;
  sites_no_data: number;
  platform_uptime_pct: number | null;
}

function StatusPill({ status }: { status: "up" | "down" | null }) {
  if (status === "up")   return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700"><ArrowUp size={10} />UP</span>;
  if (status === "down") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700"><ArrowDown size={10} />DOWN</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500"><Minus size={10} />—</span>;
}

function UptimeBar({ pct: rawPct }: { pct: number | string | null }) {
  const pct = rawPct != null ? Number(rawPct) : null;
  if (pct === null || isNaN(pct)) return <span className="text-muted-foreground text-sm">—</span>;
  const color = pct >= 99 ? "#22c55e" : pct >= 95 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-12 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function UptimePage() {
  const [sites, setSites] = useState<UptimeSite[]>([]);
  const [stats, setStats] = useState<UptimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/uptime", {
        params: { status: statusFilter },
      });
      setSites(data.sites);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? sites.filter(s => s.url.includes(search) || s.name?.toLowerCase().includes(search.toLowerCase()) || s.agency_name.toLowerCase().includes(search.toLowerCase()))
    : sites;

  const platformPct = stats?.platform_uptime_pct != null ? Number(stats.platform_uptime_pct) : null;
  const pctColor = platformPct == null ? "#6b7280" : platformPct >= 99 ? "#22c55e" : platformPct >= 95 ? "#eab308" : "#ef4444";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#22c55e,#10b981)" }} />
        <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
              <MonitorCheck size={20} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Uptime Monitor</h1>
              <p className="text-sm text-muted-foreground">
                {stats?.sites_down ?? 0} sites down · Platform avg&nbsp;
                <span style={{ color: pctColor, fontWeight: 600 }}>
                  {platformPct != null ? `${platformPct.toFixed(2)}%` : "—"}
                </span>
              </p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Monitored",  value: stats.total_monitored,                                         color: "#6366f1" },
            { label: "Up",         value: stats.sites_up,                                                color: "#22c55e" },
            { label: "Down",       value: stats.sites_down,                                              color: "#ef4444" },
            { label: "No data",    value: stats.sites_no_data,                                           color: "#9ca3af" },
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
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search site or agency…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none" />
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden text-sm">
          {[["", "All"], ["up", "Up only"], ["down", "Down only"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-4 py-1.5 font-medium transition-colors ${statusFilter === val ? "bg-green-50 text-green-600" : "text-muted-foreground hover:bg-gray-50"}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No sites found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Response</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40">Uptime 7d</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Check</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.current_status === "down" ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[200px]">{s.name || s.url}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.url}</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={s.current_status} /></td>
                  <td className="px-4 py-3">
                    {s.last_response_ms != null
                      ? <span className="text-sm font-medium">{s.last_response_ms}ms</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 w-40"><UptimeBar pct={s.uptime_pct_7d} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {s.last_checked ? timeAgo(s.last_checked) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.agency_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
