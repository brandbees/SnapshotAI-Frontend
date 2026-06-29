"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, AlertTriangle, Megaphone,
  Pin, ChevronLeft, ChevronRight, Globe,
  ShieldAlert, Zap, Search, ArrowRight, WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Tab = "all" | "alerts" | "announcements";

interface NotifBreach {
  pillar: string;
  score: number | null;
  priority?: string;
}

interface NotifItem {
  id: string;
  notification_type: "alert" | "announcement";
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  body: string;
  site_id: string | null;
  site_name: string | null;
  site_url: string | null;
  action: string | null;
  details: { breaches?: NotifBreach[] } | null;
  pinned: boolean;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SEV: Record<string, { iconBg: string; iconColor: string; badge: string; label: string }> = {
  critical: { iconBg: "bg-red-50",   iconColor: "text-red-500",   badge: "bg-red-50 text-red-600 border border-red-100",     label: "Critical" },
  warning:  { iconBg: "bg-amber-50", iconColor: "text-amber-500", badge: "bg-amber-50 text-amber-600 border border-amber-100", label: "Warning"  },
  success:  { iconBg: "bg-green-50", iconColor: "text-green-600", badge: "bg-green-50 text-green-700 border border-green-100", label: "Healthy"  },
  info:     { iconBg: "bg-blue-50",  iconColor: "text-blue-500",  badge: "bg-blue-50 text-blue-700 border border-blue-100",   label: "Info"     },
};

function pillarIcon(pillar: string, cls: string, size = 16) {
  if (pillar === "malware" || pillar === "security") return <ShieldAlert size={size} className={cls} />;
  if (pillar === "performance") return <Zap size={size} className={cls} />;
  if (pillar === "seo")         return <Search size={size} className={cls} />;
  if (pillar === "uptime")      return <WifiOff size={size} className={cls} />;
  return <AlertTriangle size={size} className={cls} />;
}

function mainIcon(item: NotifItem, cls: string) {
  if (item.notification_type === "announcement") return <Megaphone size={16} className={`text-indigo-500 ${cls}`} />;
  if (item.action === "audit_failed")            return <AlertTriangle size={16} className={`text-amber-500 ${cls}`} />;
  const breaches = item.details?.breaches ?? [];
  const firstPillar = breaches[0]?.pillar ?? "";
  const sev = SEV[item.severity] ?? SEV.info;
  return pillarIcon(firstPillar, `${sev.iconColor} ${cls}`);
}

function notifTitle(item: NotifItem): string {
  if (item.notification_type === "announcement") return item.title;
  if (item.action === "audit_failed") return "Audit Failed";
  const breaches = item.details?.breaches ?? [];
  if (breaches.length === 0) return item.title;
  const pillars = breaches.map(b => b.pillar);
  if (pillars.length === 1) {
    const p = pillars[0];
    if (p === "malware")     return "Malware Detected";
    if (p === "security")    return "Security Issue Found";
    if (p === "performance") return "Performance Degraded";
    if (p === "seo")         return "SEO Score Dropped";
    if (p === "uptime")      return "Site Went Offline";
    return item.title;
  }
  return pillars.map(p => p[0].toUpperCase() + p.slice(1)).join(" & ") + " Alert";
}

function notifDescription(item: NotifItem): string {
  if (item.notification_type === "announcement") return item.body;
  if (item.action === "audit_failed") {
    return item.body || "The scheduled audit could not be completed. Check the site connection.";
  }
  const breaches = item.details?.breaches ?? [];
  if (breaches.length === 0) return item.body;
  return breaches.map(b => {
    const name = b.pillar.charAt(0).toUpperCase() + b.pillar.slice(1);
    if (b.score === null) return `${name} monitoring detected the site is offline.`;
    if (b.pillar === "malware")     return `Malware scan scored ${b.score}/100 — threats detected on this site.`;
    if (b.pillar === "security")    return `Security score dropped to ${b.score}/100 — review firewall and hardening settings.`;
    if (b.pillar === "performance") return `Performance score is ${b.score}/100 — page speed issues detected.`;
    if (b.pillar === "seo")         return `SEO score dropped to ${b.score}/100 — check metadata and crawlability.`;
    if (b.pillar === "uptime")      return `Uptime score is ${b.score}/100 — site may be intermittently down.`;
    return `${name} score: ${b.score}/100`;
  }).join(" ");
}

function breachChipClass(b: NotifBreach): string {
  const bad = b.score === null || b.score < 50;
  return bad
    ? "bg-red-50 text-red-600 border border-red-100"
    : "bg-amber-50 text-amber-600 border border-amber-100";
}

function breachLabel(b: NotifBreach): string {
  const name = b.pillar.charAt(0).toUpperCase() + b.pillar.slice(1);
  if (b.score === null) return `${name}: Offline`;
  return `${name}: ${b.score}/100`;
}

const LIMIT = 20;

const TABS: { key: Tab; label: string }[] = [
  { key: "all",           label: "All"           },
  { key: "alerts",        label: "Site Alerts"   },
  { key: "announcements", label: "Announcements" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [tab,     setTab]     = useState<Tab>("all");
  const [page,    setPage]    = useState(1);
  const [items,   setItems]   = useState<NotifItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notifications?tab=${tab}&page=${page}&limit=${LIMIT}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  function switchTab(t: Tab) { setTab(t); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const from = (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Site alerts and platform announcements
          </p>
        </div>
        {total > 0 && (
          <span className="text-xs font-medium text-muted-foreground bg-gray-100 px-2.5 py-1 rounded-full">
            {total} total
          </span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Bell size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === "alerts"
                  ? "Site alerts appear here when thresholds are breached."
                  : tab === "announcements"
                  ? "Platform announcements will appear here."
                  : "Alerts and announcements will appear here."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => {
              const sev      = SEV[item.severity] ?? SEV.info;
              const breaches = item.details?.breaches ?? [];
              const dest     = item.site_id ? `/sites/${item.site_id}` : null;
              const isAlert  = item.notification_type === "alert";

              return (
                <div
                  key={item.id}
                  role={dest ? "button" : undefined}
                  tabIndex={dest ? 0 : undefined}
                  onClick={dest ? () => router.push(dest) : undefined}
                  onKeyDown={dest ? (e) => { if (e.key === "Enter") router.push(dest); } : undefined}
                  className={`flex items-start gap-4 px-5 py-5 transition-colors group ${dest ? "cursor-pointer hover:bg-gray-50/80" : "hover:bg-gray-50/40"}`}
                >
                  {/* Icon circle */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${sev.iconBg}`}>
                    {mainIcon(item, "")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">

                    {/* Title + pin */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {notifTitle(item)}
                      </p>
                      {item.pinned && <Pin size={10} className="text-amber-500 shrink-0" />}
                    </div>

                    {/* Site name + URL */}
                    {(item.site_name || item.site_url) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Globe size={11} className="text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          {item.site_name ?? ""}
                          {item.site_url && (
                            <span className="font-normal text-muted-foreground/60">
                              {item.site_name ? " · " : ""}
                              {item.site_url.replace(/^https?:\/\//, "")}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {notifDescription(item)}
                    </p>

                    {/* Breach chips */}
                    {isAlert && breaches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {breaches.map((b, i) => (
                          <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-lg ${breachChipClass(b)}`}>
                            {pillarIcon(b.pillar, "", 11)}
                            {breachLabel(b)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: badges + time + arrow */}
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                        isAlert
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                      }`}>
                        {isAlert ? "Alert" : "Announcement"}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${sev.badge}`}>
                        {sev.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {timeAgo(item.created_at)}
                    </span>
                    {dest && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        View site <ArrowRight size={11} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-gray-50/40">
            <p className="text-xs text-muted-foreground">
              {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-foreground">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
