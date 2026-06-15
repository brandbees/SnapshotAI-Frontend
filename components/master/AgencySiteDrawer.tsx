"use client";

import { useEffect, useState } from "react";
import { X, Globe, Wifi, WifiOff, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import masterApi from "@/lib/masterApi";

interface Props {
  agencyId: string;
  siteId: string;
  onClose: () => void;
}

interface SiteDetail {
  id: string; url: string; name: string | null; plugin_connected: boolean;
  wp_version: string | null; php_version: string | null; plugin_version: string | null;
  active_plugins: Array<{ name: string; version: string; slug?: string }> | null;
  ssl_expiry_date: string | null; domain_expiry_date: string | null;
  last_audit_at: string | null; created_at: string;
}
interface LatestAudit {
  performance_score: number | null; seo_score: number | null;
  security_score: number | null;   malware_score: number | null;
  overall_score: number | null;    created_at: string;
}
interface TrendPoint  { date: string; overall_score: number | null }
interface RecentAudit {
  id: string; status: string; overall_score: number | null;
  triggered_by: string; created_at: string; completed_at: string | null;
}
interface LatestScan  { is_clean: boolean | null; threats: unknown[] | null }

const AMBER = "#f59e0b";

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

function ScorePill({ label, value }: { label: string; value: number | null }) {
  const color = scoreColor(value);
  return (
    <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl p-3 flex-1">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{value ?? "—"}</span>
    </div>
  );
}

export function AgencySiteDrawer({ agencyId, siteId, onClose }: Props) {
  const [site,         setSite]         = useState<SiteDetail | null>(null);
  const [latestAudit,  setLatestAudit]  = useState<LatestAudit | null>(null);
  const [trend,        setTrend]        = useState<TrendPoint[]>([]);
  const [recentAudits, setRecentAudits] = useState<RecentAudit[]>([]);
  const [latestScan,   setLatestScan]   = useState<LatestScan | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    masterApi.get<{
      site: SiteDetail; latest_audit: LatestAudit | null;
      audit_trend: TrendPoint[]; recent_audits: RecentAudit[];
      latest_scan: LatestScan | null;
    }>(`/master/agencies/${agencyId}/sites/${siteId}`)
      .then(({ data }) => {
        setSite(data.site);
        setLatestAudit(data.latest_audit);
        setTrend(data.audit_trend);
        setRecentAudits(data.recent_audits);
        setLatestScan(data.latest_scan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agencyId, siteId]);

  const plugins = Array.isArray(site?.active_plugins) ? site.active_plugins : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe size={16} style={{ color: AMBER }} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">
                {site?.name || site?.url || "Site Details"}
              </h2>
              {site?.name && (
                <p className="text-xs text-muted-foreground truncate">{site.url}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : site ? (
            <>
              {/* Status bar */}
              <div className="flex flex-wrap items-center gap-2">
                {site.plugin_connected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                    <Wifi size={11} /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                    <WifiOff size={11} /> Disconnected
                  </span>
                )}
                {latestScan?.is_clean === true && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                    <ShieldCheck size={11} /> Clean
                  </span>
                )}
                {latestScan?.is_clean === false && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                    <ShieldAlert size={11} /> Threats found
                  </span>
                )}
                {site.last_audit_at && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={11} /> Last audit {fmtDate(site.last_audit_at)}
                  </span>
                )}
              </div>

              {/* Score pills */}
              {latestAudit ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Audit Scores</p>
                  <div className="flex gap-2">
                    <ScorePill label="Performance" value={latestAudit.performance_score} />
                    <ScorePill label="SEO"         value={latestAudit.seo_score} />
                    <ScorePill label="Security"    value={latestAudit.security_score} />
                    <ScorePill label="Malware"     value={latestAudit.malware_score} />
                    <ScorePill label="Overall"     value={latestAudit.overall_score} />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-muted-foreground">
                  No completed audits yet
                </div>
              )}

              {/* Audit trend */}
              {trend.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Score Trend — Last 30 Days</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="siteAmber" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={AMBER} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(v) => [v, "Score"]}
                      />
                      <Area type="monotone" dataKey="overall_score" stroke={AMBER} strokeWidth={2}
                        fill="url(#siteAmber)" dot={false} activeDot={{ r: 3, fill: AMBER, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Site info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Site Info</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["WordPress",  site.wp_version],
                    ["PHP",        site.php_version],
                    ["Plugin",     site.plugin_version],
                    ["SSL Expiry", fmtDate(site.ssl_expiry_date)],
                    ["Domain Exp", fmtDate(site.domain_expiry_date)],
                    ["Added",      fmtDate(site.created_at)],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[11px] font-semibold text-foreground">{val || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active plugins */}
              {plugins.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Active Plugins ({plugins.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border">
                    {plugins.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0">
                        <span className="text-xs font-medium text-foreground">{p.name}</span>
                        <span className="text-[11px] text-muted-foreground">{p.version || ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent audits */}
              {recentAudits.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Audits</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-gray-50/60">
                          {["Status", "Score", "Triggered", "Date"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentAudits.map(a => (
                          <tr key={a.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">
                              <span className={`font-semibold capitalize px-1.5 py-0.5 rounded-full text-[10px]
                                ${a.status === "completed" ? "bg-green-50 text-green-700" :
                                  a.status === "failed"    ? "bg-red-50 text-red-600" :
                                  a.status === "running"   ? "bg-blue-50 text-blue-600" :
                                  "bg-amber-50 text-amber-700"}`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-bold" style={{ color: scoreColor(a.overall_score) }}>
                              {a.overall_score ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground capitalize">{a.triggered_by}</td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(a.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">Site not found.</div>
          )}
        </div>
      </div>
    </>
  );
}
