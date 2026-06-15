"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { ShieldAlert, Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Vuln {
  id: string;
  plugin_slug: string;
  vulnerability_title: string;
  cve_id: string | null;
  severity: string;
  affected_versions: string | null;
  patched_version: string | null;
  source: string | null;
  fetched_at: string;
}

interface Stats {
  total_vulns: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unique_plugins: number;
  affected_sites: number;
  total_site_vulns: number;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-green-100 text-green-700 border-green-200",
};

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/vulnerabilities", {
        params: { search, severity, page, limit: 50 },
      });
      setVulns(data.vulnerabilities);
      setTotal(data.total);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [search, severity, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#ef4444,#f97316)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
              <ShieldAlert size={20} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Vulnerability Center</h1>
              <p className="text-sm text-muted-foreground">{total} known vulnerabilities across {stats?.unique_plugins ?? 0} plugins</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Critical",       value: stats.critical,        color: "#ef4444" },
            { label: "High",           value: stats.high,            color: "#f97316" },
            { label: "Medium",         value: stats.medium,          color: "#eab308" },
            { label: "Affected Sites", value: stats.affected_sites,  color: "#6366f1" },
            { label: "Plugins",        value: stats.unique_plugins,  color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-border p-4 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => { setSeverity(s.label.toLowerCase() === "plugins" ? "" : s.label.toLowerCase()); setPage(1); }}>
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
            placeholder="Search plugin, CVE, title…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>
        <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none">
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">Loading…</div>
        ) : vulns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">No vulnerabilities found</div>
        ) : vulns.map(v => {
          const open = expanded === v.id;
          const sev = v.severity?.toLowerCase() ?? "low";
          return (
            <div key={v.id} className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(open ? null : v.id)}>
                <span className={`mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase shrink-0 ${SEVERITY_STYLE[sev] ?? "bg-gray-100 text-gray-600"}`}>
                  {sev}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{v.vulnerability_title || v.plugin_slug}</p>
                    {v.cve_id && <span className="text-xs text-muted-foreground font-mono">{v.cve_id}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{v.plugin_slug}</p>
                </div>
                {open ? <ChevronUp size={16} className="text-muted-foreground mt-1" /> : <ChevronDown size={16} className="text-muted-foreground mt-1" />}
              </div>

              {open && (
                <div className="border-t border-border px-5 py-4 grid grid-cols-2 gap-4 text-sm bg-gray-50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Affected versions</p>
                    <p className="font-medium">{v.affected_versions || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Patched in</p>
                    <p className="font-medium text-green-600">{v.patched_version || "No patch yet"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <p className="font-medium">{v.source || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fetched</p>
                    <p className="font-medium">{new Date(v.fetched_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
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
  );
}
