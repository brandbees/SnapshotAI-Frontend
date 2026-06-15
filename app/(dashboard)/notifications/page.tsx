"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, AlertTriangle, Info, CheckCircle, Megaphone,
  Pin, ChevronLeft, ChevronRight, Globe,
} from "lucide-react";
import api from "@/lib/api";

type Tab = "all" | "alerts" | "announcements";

interface NotifItem {
  id: string;
  notification_type: "alert" | "announcement";
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  body: string;
  site_id: string | null;
  site_name: string | null;
  site_url: string | null;
  pinned: boolean;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SEV: Record<string, { dot: string; badge: string; label: string }> = {
  critical: { dot: "bg-red-500",   badge: "bg-red-100 text-red-700",    label: "Critical"     },
  warning:  { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700", label: "Warning"      },
  success:  { dot: "bg-green-500", badge: "bg-green-100 text-green-700", label: "Success"      },
  info:     { dot: "bg-blue-400",  badge: "bg-blue-100 text-blue-700",   label: "Info"         },
};

const TYPE_BADGE: Record<string, string> = {
  alert:        "bg-red-50 text-red-600 border border-red-100",
  announcement: "bg-indigo-50 text-indigo-600 border border-indigo-100",
};

function NotifTypeIcon({ type, severity }: { type: string; severity: string }) {
  const cls = "shrink-0";
  if (type === "announcement") return <Megaphone size={14} className={`${cls} text-indigo-500`} />;
  if (severity === "critical") return <AlertTriangle size={14} className={`${cls} text-red-500`} />;
  if (severity === "warning")  return <AlertTriangle size={14} className={`${cls} text-amber-500`} />;
  if (severity === "success")  return <CheckCircle   size={14} className={`${cls} text-green-500`} />;
  return <Info size={14} className={`${cls} text-blue-500`} />;
}

const LIMIT = 20;

const TABS: { key: Tab; label: string }[] = [
  { key: "all",           label: "All"           },
  { key: "alerts",        label: "Site Alerts"   },
  { key: "announcements", label: "Announcements" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
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
                  ? "Platform announcements from BrandBees SnapshotAI will appear here."
                  : "Alerts and announcements will appear here."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => {
              const sev = SEV[item.severity] ?? SEV.info;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors"
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    <NotifTypeIcon type={item.notification_type} severity={item.severity} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {item.pinned && <Pin size={10} className="text-amber-500 shrink-0" />}
                    </div>

                    {(item.site_name || item.site_url) && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Globe size={10} className="text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.site_name ?? item.site_url?.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {item.body}
                    </p>
                  </div>

                  {/* Right: badges + time */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        item.notification_type === "announcement"
                          ? TYPE_BADGE.announcement
                          : TYPE_BADGE.alert
                      }`}>
                        {item.notification_type === "announcement" ? "Announcement" : "Alert"}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${sev.badge}`}>
                        {sev.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {timeAgo(item.created_at)}
                    </span>
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
