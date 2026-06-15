"use client";

import { useEffect, useState } from "react";
import {
  X, Globe, Wifi, WifiOff, ShieldCheck, ShieldAlert, Clock,
  Building2, Activity, Search, Lock, Bug, Radio, ShoppingCart,
  DollarSign, AlertTriangle, CreditCard,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface Props { siteId: string; onClose: () => void }

interface SiteDetail {
  id: string; url: string; name: string | null; plugin_connected: boolean;
  wp_version: string | null; php_version: string | null; plugin_version: string | null;
  active_plugins: Array<{ name: string; version: string }> | null;
  ssl_expiry_date: string | null; domain_expiry_date: string | null;
  last_audit_at: string | null; created_at: string;
  agency_id: string; agency_name: string; agency_email: string; agency_plan: string;
  // WooCommerce
  woocommerce_active: boolean | null;
  woo_order_count: number | null;
  woo_revenue: number | null;
  woo_orders_7d: number | null;
  woo_orders_30d: number | null;
  woo_revenue_7d: number | null;
  woo_revenue_30d: number | null;
  woo_failed_orders: number | null;
  woo_active_gateways: string[] | null;
  woo_fatal_errors: Array<{ message: string; file?: string; time?: string }> | null;
}
interface LatestAudit {
  performance_score: number | null; seo_score: number | null;
  security_score: number | null;   malware_score: number | null;
  overall_score: number | null;    created_at: string;
}
interface TrendPoint {
  date: string;
  overall_score: number | null; performance_score: number | null;
  seo_score: number | null;     security_score: number | null;
  malware_score: number | null;
}
interface LatestScan { is_clean: boolean | null; threats: unknown[] | null; created_at: string }
interface UptimePing { status: string; response_time_ms: number | null; checked_at: string }
interface UptimeData {
  current_status: string | null; uptime_pct: number | null;
  avg_response_ms: number | null; pings: UptimePing[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";

const PLAN_LABELS: Record<string, string> = {
  free: "Free", freemium: "Starter", premium: "Growth",
  agency: "Agency", agency_plus: "Agency+",
};

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
function sslDaysLeft(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BigScore({ label, value }: { label: string; value: number | null }) {
  const color = scoreColor(value);
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const pct = value !== null ? Math.max(0, Math.min(100, value)) / 100 : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={8} />
        <circle
          cx={55} cy={55} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x={55} y={55} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={24} fontWeight={700}>
          {value ?? "—"}
        </text>
      </svg>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

function TrendChart({
  data, dataKey, color = AMBER,
}: { data: TrendPoint[]; dataKey: keyof TrendPoint; color?: string }) {
  if (!data.length) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-muted-foreground">
        No audit data in the last 30 days
      </div>
    );
  }
  const gradId = `grad-${String(dataKey)}`;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
          formatter={(v) => [v, "Score"]}
        />
        <Area type="monotone" dataKey={String(dataKey)} stroke={color} strokeWidth={2}
          fill={`url(#${gradId})`} dot={false} activeDot={{ r: 3, fill: color, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function InfoGrid({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(([label, val]) => (
        <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-[11px] font-semibold text-foreground">{val || "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type Tab = "overview" | "performance" | "seo" | "security" | "malware" | "uptime" | "woocommerce";

const BASE_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",    label: "Overview",    icon: Globe        },
  { id: "performance", label: "Performance", icon: Activity     },
  { id: "seo",         label: "SEO",         icon: Search       },
  { id: "security",    label: "Security",    icon: Lock         },
  { id: "malware",     label: "Malware",     icon: Bug          },
  { id: "uptime",      label: "Uptime",      icon: Radio        },
  { id: "woocommerce", label: "WooCommerce", icon: ShoppingCart },
];

// ── Main Drawer ───────────────────────────────────────────────────────────────

export function MasterSiteDrawer({ siteId, onClose }: Props) {
  const [site,        setSite]        = useState<SiteDetail | null>(null);
  const [latestAudit, setLatestAudit] = useState<LatestAudit | null>(null);
  const [trend,       setTrend]       = useState<TrendPoint[]>([]);
  const [latestScan,  setLatestScan]  = useState<LatestScan | null>(null);
  const [uptime,      setUptime]      = useState<UptimeData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<Tab>("overview");

  useEffect(() => {
    masterApi.get<{
      site: SiteDetail; latest_audit: LatestAudit | null;
      audit_trend: TrendPoint[]; latest_scan: LatestScan | null;
      uptime: UptimeData;
    }>(`/master/sites/${siteId}`)
      .then(({ data }) => {
        setSite(data.site);
        setLatestAudit(data.latest_audit);
        setTrend(data.audit_trend);
        setLatestScan(data.latest_scan);
        setUptime(data.uptime);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const plugins  = Array.isArray(site?.active_plugins) ? site.active_plugins : [];
  const sslDays  = sslDaysLeft(site?.ssl_expiry_date ?? null);
  const domDays  = sslDaysLeft(site?.domain_expiry_date ?? null);
  const threats  = Array.isArray(latestScan?.threats) ? latestScan.threats : [];

  // ── Tab content ─────────────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <div className="space-y-6">
        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          {site!.plugin_connected ? (
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
          {site!.last_audit_at && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={11} /> Last audit {fmtDate(site!.last_audit_at)}
            </span>
          )}
        </div>

        {/* Score pills row */}
        {latestAudit ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Latest Scores</p>
            <div className="flex gap-2">
              {([
                ["Perf",     latestAudit.performance_score],
                ["SEO",      latestAudit.seo_score],
                ["Security", latestAudit.security_score],
                ["Malware",  latestAudit.malware_score],
                ["Overall",  latestAudit.overall_score],
              ] as [string, number | null][]).map(([label, val]) => (
                <div key={label} className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl p-3 flex-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                  <span className="text-xl font-bold" style={{ color: scoreColor(val) }}>{val ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-muted-foreground">No completed audits yet</div>
        )}

        {/* Overall trend */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Overall Score — Last 30 Days</p>
          <TrendChart data={trend} dataKey="overall_score" color={AMBER} />
        </div>

        {/* Site info */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Site Info</p>
          <InfoGrid rows={[
            ["WordPress",  site!.wp_version],
            ["PHP",        site!.php_version],
            ["Plugin",     site!.plugin_version],
            ["SSL Expiry", fmtDate(site!.ssl_expiry_date)],
            ["Domain Exp", fmtDate(site!.domain_expiry_date)],
            ["Added",      fmtDate(site!.created_at)],
          ]} />
        </div>

        {/* Plugins */}
        {plugins.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Active Plugins ({plugins.length})
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
              {plugins.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0">
                  <span className="text-xs font-medium text-foreground">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground">{p.version || ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderScoreTab(
    label: string,
    scoreKey: keyof LatestAudit,
    trendKey: keyof TrendPoint,
    color: string,
    extraContent?: React.ReactNode,
  ) {
    const val = latestAudit ? (latestAudit[scoreKey] as number | null) : null;
    return (
      <div className="space-y-6">
        {/* Big score circle */}
        <div className="flex justify-center pt-2">
          <BigScore label={label} value={val} />
        </div>

        {/* Trend chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{label} Score — Last 30 Days</p>
          <TrendChart data={trend} dataKey={trendKey} color={color} />
        </div>

        {extraContent}
      </div>
    );
  }

  function renderSecurity() {
    return (
      <div className="space-y-6">
        {/* Two big scores */}
        <div className="flex justify-around pt-2">
          <BigScore label="Security" value={latestAudit?.security_score ?? null} />
          <BigScore label="Malware"  value={latestAudit?.malware_score  ?? null} />
        </div>

        {/* Security trend */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Security Score — Last 30 Days</p>
          <TrendChart data={trend} dataKey="security_score" color="#8b5cf6" />
        </div>

        {/* SSL & Domain expiry */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Certificate & Domain</p>
          <div className="space-y-2">
            {[
              { label: "SSL Certificate",  days: sslDays,  date: site!.ssl_expiry_date    },
              { label: "Domain Expiry",    days: domDays,  date: site!.domain_expiry_date  },
            ].map(({ label, days, date }) => (
              <div key={label} className={`rounded-xl px-4 py-3 flex items-center justify-between border
                ${days !== null && days <= 7  ? "bg-red-50 border-red-200" :
                  days !== null && days <= 30 ? "bg-amber-50 border-amber-200" :
                  "bg-gray-50 border-border"}`}>
                <div>
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(date)}</p>
                </div>
                {days !== null ? (
                  <span className={`text-xs font-bold ${days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-green-600"}`}>
                    {days > 0 ? `${days}d left` : "Expired"}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderMalware() {
    return (
      <div className="space-y-6">
        {/* Clean / Threats banner */}
        {latestScan ? (
          <div className={`rounded-xl p-4 flex items-center gap-3 border
            ${latestScan.is_clean ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            {latestScan.is_clean
              ? <ShieldCheck size={24} className="text-green-600 shrink-0" />
              : <ShieldAlert  size={24} className="text-red-500 shrink-0" />
            }
            <div>
              <p className={`font-bold text-sm ${latestScan.is_clean ? "text-green-700" : "text-red-700"}`}>
                {latestScan.is_clean ? "No threats found" : `${threats.length || "Unknown number of"} threat(s) detected`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Last scan {fmtDate((latestScan as LatestScan & { created_at: string }).created_at)}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-muted-foreground">No scan data available</div>
        )}

        {/* Big malware score */}
        <div className="flex justify-center">
          <BigScore label="Malware Score" value={latestAudit?.malware_score ?? null} />
        </div>

        {/* Malware trend */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Malware Score — Last 30 Days</p>
          <TrendChart data={trend} dataKey="malware_score" color="#ef4444" />
        </div>

        {/* Threats list */}
        {threats.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detected Threats</p>
            <div className="rounded-xl border border-red-200 overflow-hidden">
              {threats.map((t, i) => (
                <div key={i} className="px-3 py-2.5 border-b border-red-100 last:border-0 bg-red-50/40">
                  <p className="text-xs text-red-700 font-medium">{JSON.stringify(t)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderUptime() {
    const pings = uptime?.pings ?? [];
    const statusColor = uptime?.current_status === "up" ? "#10b981"
      : uptime?.current_status === "down" ? "#ef4444" : "#94a3b8";

    // Build response-time bar chart data (last 48 pings in order)
    const barData = [...pings].reverse().map((p, i) => ({
      i,
      ms: p.response_time_ms ?? 0,
      status: p.status,
    }));

    return (
      <div className="space-y-6">
        {/* Status + stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Current Status", value: uptime?.current_status ?? "Unknown",
              color: statusColor, big: true },
            { label: "Uptime (recent)", value: uptime?.uptime_pct !== null && uptime?.uptime_pct !== undefined
                ? `${uptime.uptime_pct}%` : "—", color: "#10b981", big: false },
            { label: "Avg Response",   value: uptime?.avg_response_ms !== null && uptime?.avg_response_ms !== undefined
                ? `${uptime.avg_response_ms}ms` : "—", color: AMBER, big: false },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold capitalize" style={{ color }}>{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Response time bar chart */}
        {barData.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Response Time — Recent Checks</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }} barSize={6} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} unit="ms" />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v) => [`${v}ms`, "Response"]}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="ms" radius={[2, 2, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.status === "down" ? "#ef4444" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">Green = up · Red = down</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-muted-foreground">
            No uptime data available
          </div>
        )}

        {/* Recent pings table */}
        {pings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Checks</p>
            <div className="rounded-xl border border-border overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-border">
                    {["Status", "Response", "Time"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pings.map((p, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <span className={`font-semibold capitalize px-1.5 py-0.5 rounded-full text-[10px]
                          ${p.status === "up" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.response_time_ms !== null ? `${p.response_time_ms}ms` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {new Date(p.checked_at).toLocaleString("en-GB", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderWooCommerce() {
    const hasWoo      = !!site!.woocommerce_active;
    const orderCount  = site!.woo_order_count;
    const revenue     = site!.woo_revenue;
    const fatalErrors = Array.isArray(site!.woo_fatal_errors) ? site!.woo_fatal_errors : [];

    // Gateways stored as [{id, label}] objects or plain strings
    type GwRaw = string | Record<string, unknown>;
    const rawGateways: GwRaw[] = Array.isArray(site!.woo_active_gateways) ? site!.woo_active_gateways as GwRaw[] : [];
    const gateways = rawGateways.map(g => {
      if (typeof g === "string") return { id: g, label: g };
      const o = g as Record<string, unknown>;
      return { id: String(o.id ?? o.name ?? ""), label: String(o.label ?? o.title ?? o.id ?? o.name ?? "") };
    }).filter(g => g.label);

    const fmtMoney = (n: number | null | undefined) =>
      n != null ? `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
    const fmtInt = (n: number | null | undefined) =>
      n != null ? Number(n).toLocaleString() : "—";
    const avgOrderValue = orderCount && revenue
      ? `$${(Number(revenue) / orderCount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";

    return (
      <div className="space-y-5">

        {/* Status banner */}
        <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${hasWoo ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-border"}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${hasWoo ? "bg-purple-100" : "bg-gray-100"}`}>
            <ShoppingCart size={16} className={hasWoo ? "text-purple-600" : "text-muted-foreground"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${hasWoo ? "text-purple-700" : "text-foreground"}`}>
              {hasWoo ? "WooCommerce is active" : "WooCommerce not detected"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {hasWoo ? "Store data is being collected from this WooCommerce installation." : "No WooCommerce installation found on this site."}
            </p>
          </div>
          {hasWoo && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 shrink-0">Active</span>}
        </div>

        {/* All-time stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Orders",    value: fmtInt(orderCount),  sub: "All time",   color: "#8b5cf6", bg: "rgba(139,92,246,0.06)", icon: ShoppingCart },
            { label: "Total Revenue",   value: fmtMoney(revenue),   sub: "All time",   color: "#10b981", bg: "rgba(16,185,129,0.06)", icon: DollarSign   },
            { label: "Avg Order Value", value: avgOrderValue,        sub: "Per order",  color: "#f59e0b", bg: "rgba(245,158,11,0.06)",  icon: DollarSign   },
            { label: "Store Status",    value: hasWoo ? "Running" : "Inactive", sub: hasWoo ? "WooCommerce detected" : "No store found",
              color: hasWoo ? "#8b5cf6" : "#94a3b8", bg: hasWoo ? "rgba(139,92,246,0.06)" : "rgba(148,163,184,0.06)", icon: ShoppingCart },
          ].map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-xl p-4 border border-border" style={{ background: c.bg }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={11} style={{ color: c.color }} />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</span>
                </div>
                <p className="text-lg font-bold leading-none" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{c.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Windowed analytics */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Extended Analytics</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Orders 7d",     value: fmtInt(site!.woo_orders_7d),    color: "#3b82f6" },
              { label: "Orders 30d",    value: fmtInt(site!.woo_orders_30d),   color: "#3b82f6" },
              { label: "Revenue 7d",    value: fmtMoney(site!.woo_revenue_7d),  color: "#10b981" },
              { label: "Revenue 30d",   value: fmtMoney(site!.woo_revenue_30d), color: "#10b981" },
              { label: "Failed 30d",    value: fmtInt(site!.woo_failed_orders),
                color: (site!.woo_failed_orders ?? 0) > 0 ? "#ef4444" : "#94a3b8" },
            ].map(c => (
              <div key={c.label} className="bg-gray-50 rounded-xl p-3 text-center border border-border">
                <p className="text-base font-bold leading-none" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment gateways */}
        {gateways.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Gateways</p>
            <div className="flex flex-wrap gap-1.5">
              {gateways.map(g => (
                <span key={g.id} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-100">
                  <CreditCard size={10} />
                  {g.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fatal errors */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gray-50/40">
            <div>
              <p className="text-xs font-semibold text-foreground">Fatal Errors (last 24h)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PHP fatal errors from WooCommerce logs</p>
            </div>
            {fatalErrors.length > 0
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{fatalErrors.length} error{fatalErrors.length !== 1 ? "s" : ""}</span>
              : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Clean</span>
            }
          </div>
          {fatalErrors.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No fatal errors detected in the last 24 hours.</div>
          ) : (
            <div className="divide-y divide-border">
              {fatalErrors.map((e, i) => {
                const err = e as Record<string, unknown>;
                const ts    = err.timestamp != null ? String(err.timestamp) : null;
                const msg   = String(err.message ?? e.message ?? "");
                const file  = err.file != null ? String(err.file) : (e.file ?? null);
                const etype = String(err.error_type ?? "Fatal Error");
                return (
                  <div key={i} className="px-4 py-3 bg-red-50/30">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-red-600">{etype}</span>
                      {ts && <span className="text-[10px] text-muted-foreground shrink-0">{new Date(ts).toLocaleString()}</span>}
                    </div>
                    <p className="text-xs text-foreground font-mono break-all leading-relaxed">{msg}</p>
                    {file && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{String(file)}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    );
  }

  function renderTab() {
    if (!site) return null;
    switch (activeTab) {
      case "overview":    return renderOverview();
      case "performance": return renderScoreTab("Performance", "performance_score", "performance_score", "#3b82f6");
      case "seo":         return renderScoreTab("SEO",         "seo_score",         "seo_score",         "#10b981");
      case "security":    return renderSecurity();
      case "malware":     return renderMalware();
      case "uptime":      return renderUptime();
      case "woocommerce": return renderWooCommerce();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

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

        {/* Agency badge */}
        {site && (
          <div className="px-6 py-2.5 border-b border-border bg-gray-50/50 flex items-center gap-2 shrink-0">
            <Building2 size={12} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-foreground">{site.agency_name}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
              style={{ background: `${AMBER}18`, color: AMBER }}>
              {PLAN_LABELS[site.agency_plan] ?? site.agency_plan}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">{site.agency_email}</span>
          </div>
        )}

        {/* Tab bar */}
        {!loading && site && (
          <div className="flex border-b border-border shrink-0 overflow-x-auto">
            {BASE_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === id
                    ? "border-amber-400 text-amber-600 bg-amber-50/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-50"
                }`}
              >
                <Icon size={12} />
                {label}
                {id === "woocommerce" && site.woocommerce_active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 ml-0.5" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : site ? (
            renderTab()
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">Site not found.</div>
          )}
        </div>
      </div>
    </>
  );
}
