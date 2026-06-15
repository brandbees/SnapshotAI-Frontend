"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { Lock, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface SiteSsl {
  id: string;
  url: string;
  name: string;
  ssl_expiry_date: string | null;
  domain_expiry_date: string | null;
  days_remaining: number;
  agency_id: string;
  agency_name: string;
  agency_email: string;
}

interface Stats {
  has_ssl_expiry: number;
  has_domain_expiry: number;
  ssl_expired: number;
  domain_expired: number;
  ssl_expiring_30d: number;
  domain_expiring_30d: number;
  ssl_expiring_7d: number;
  domain_expiring_7d: number;
}

function urgencyStyle(days: number) {
  if (days < 0)  return { bg: "bg-red-100",    text: "text-red-700",    label: "Expired" };
  if (days <= 7) return { bg: "bg-red-50",     text: "text-red-600",    label: `${days}d` };
  if (days <= 30) return { bg: "bg-amber-50",  text: "text-amber-600",  label: `${days}d` };
  return               { bg: "bg-green-50",   text: "text-green-600",  label: `${days}d` };
}

export default function SslPage() {
  const [sites, setSites] = useState<SiteSsl[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"ssl" | "domain">("ssl");
  const [window, setWindow] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/ssl", { params: { type, window } });
      setSites(data.sites);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [type, window]);

  useEffect(() => { load(); }, [load]);

  const expiredCount  = sites.filter(s => s.days_remaining < 0).length;
  const criticalCount = sites.filter(s => s.days_remaining >= 0 && s.days_remaining <= 7).length;
  const warningCount  = sites.filter(s => s.days_remaining > 7 && s.days_remaining <= 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)" }} />
        <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.1)" }}>
              <Lock size={20} style={{ color: "#0ea5e9" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">SSL / Domain Expiry</h1>
              <p className="text-sm text-muted-foreground">
                {sites.length} {type === "ssl" ? "SSL certificates" : "domain registrations"} expiring within {window} days
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl border border-border overflow-hidden text-sm">
              {(["ssl", "domain"] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-4 py-1.5 font-medium transition-colors ${type === t ? "bg-sky-50 text-sky-600" : "text-muted-foreground hover:bg-gray-50"}`}>
                  {t === "ssl" ? "SSL" : "Domain"}
                </button>
              ))}
            </div>
            <select value={window} onChange={e => setWindow(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-xl bg-white focus:outline-none">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Expired",       value: type === "ssl" ? stats.ssl_expired       : stats.domain_expired,       color: "#ef4444", Icon: AlertTriangle },
            { label: "≤ 7 days",      value: criticalCount,                                                          color: "#f97316", Icon: Clock },
            { label: "≤ 30 days",     value: warningCount,                                                           color: "#eab308", Icon: Clock },
            { label: "Has expiry data", value: type === "ssl" ? stats.has_ssl_expiry  : stats.has_domain_expiry,     color: "#10b981", Icon: CheckCircle },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <s.Icon size={14} style={{ color: s.color }} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : sites.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No {type === "ssl" ? "SSL certificates" : "domains"} expiring within {window} days
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {type === "ssl" ? "SSL Expiry" : "Domain Expiry"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sites.map(s => {
                const u = urgencyStyle(s.days_remaining);
                const dateStr = type === "ssl" ? s.ssl_expiry_date : s.domain_expiry_date;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.name || s.url}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[220px]">{s.url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{s.agency_name}</p>
                      <p className="text-xs text-muted-foreground">{s.agency_email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {dateStr ? new Date(dateStr).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.bg} ${u.text}`}>
                        {u.label === "Expired" ? "EXPIRED" : `${u.label} left`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
