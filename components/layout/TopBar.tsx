"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, Plus, ChevronDown, RefreshCw, User, LogOut, X, Pin, AlertTriangle, Megaphone, ShieldAlert, Zap, Search, ArrowRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { AddSiteModal } from "@/components/sites/AddSiteModal";
import api from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { cacheClear, getLastFetchedAt } from "@/lib/dataCache";

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

// ── LocalStorage read tracking ────────────────────────────────────────────────

const SEEN_ANNC_KEY   = "bb_announcements_seen";
const SEEN_ALERTS_KEY = "bb_alerts_seen_at";

function getSeenAnnouncementIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_ANNC_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function markAnnouncementsSeen(ids: string[]) {
  try {
    const s = getSeenAnnouncementIds();
    ids.forEach(id => s.add(id));
    localStorage.setItem(SEEN_ANNC_KEY, JSON.stringify([...s]));
  } catch { /* ignore */ }
}

function getAlertSeenAt(): number {
  try { return parseInt(localStorage.getItem(SEEN_ALERTS_KEY) ?? "0"); }
  catch { return 0; }
}
function markAlertsSeen() {
  try { localStorage.setItem(SEEN_ALERTS_KEY, String(Date.now())); }
  catch { /* ignore */ }
}

function computeUnread(items: NotifItem[]): number {
  const seenIds     = getSeenAnnouncementIds();
  const alertSentAt = getAlertSeenAt();
  return items.filter(item => {
    if (item.notification_type === "announcement") return !seenIds.has(item.id);
    return new Date(item.created_at).getTime() > alertSentAt;
  }).length;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function tsAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_STYLE: Record<string, { dot: string; iconBg: string; iconColor: string; badge: string; label: string }> = {
  critical: { dot: "bg-red-500",   iconBg: "bg-red-50",    iconColor: "text-red-500",    badge: "bg-red-50 text-red-600 border border-red-100",    label: "Critical" },
  warning:  { dot: "bg-amber-400", iconBg: "bg-amber-50",  iconColor: "text-amber-500",  badge: "bg-amber-50 text-amber-600 border border-amber-100", label: "Warning"  },
  success:  { dot: "bg-green-500", iconBg: "bg-green-50",  iconColor: "text-green-600",  badge: "bg-green-50 text-green-700 border border-green-100", label: "Success"  },
  info:     { dot: "bg-blue-400",  iconBg: "bg-blue-50",   iconColor: "text-blue-500",   badge: "bg-blue-50 text-blue-700 border border-blue-100",   label: "Info"     },
};

function pillarIcon(pillar: string, cls: string, size = 15) {
  if (pillar === "malware" || pillar === "security") return <ShieldAlert size={size} className={cls} />;
  if (pillar === "performance") return <Zap size={size} className={cls} />;
  if (pillar === "seo")         return <Search size={size} className={cls} />;
  return <AlertTriangle size={size} className={cls} />;
}

function notifMainIcon(item: NotifItem) {
  if (item.notification_type === "announcement") return <Megaphone size={15} className="text-indigo-500" />;
  if (item.action === "audit_failed") return <AlertTriangle size={15} className="text-amber-500" />;
  const breaches = item.details?.breaches ?? [];
  const firstPillar = breaches[0]?.pillar ?? "";
  const sev = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.info;
  return pillarIcon(firstPillar, sev.iconColor);
}

function notifTitle(item: NotifItem): string {
  if (item.notification_type === "announcement") return item.title;
  if (item.action === "audit_failed") return "Audit Failed";
  const breaches = item.details?.breaches ?? [];
  if (breaches.length === 0) return item.title;
  const pillars = breaches.map(b => b.pillar);
  if (pillars.length === 1) {
    const p = pillars[0];
    if (p === "malware") return "Malware Detected";
    if (p === "security") return "Security Issue Found";
    if (p === "performance") return "Performance Degraded";
    if (p === "seo") return "SEO Score Dropped";
    if (p === "uptime") return "Site Went Offline";
    return item.title;
  }
  return pillars.map(p => p[0].toUpperCase() + p.slice(1)).join(" & ") + " Alert";
}

function breachLabel(b: NotifBreach): string {
  const name = b.pillar.charAt(0).toUpperCase() + b.pillar.slice(1);
  if (b.score === null) return `${name}: Offline`;
  return `${name}: ${b.score}/100`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopBar() {
  const { agency, logout } = useAuth();
  const { roleCanDo } = useRole();
  const router = useRouter();

  const isClientPortal = agency?.is_client_portal ?? false;
  const isIndividual   = agency?.account_type === "individual";

  const [showAddSite,    setShowAddSite]    = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [showNotif,      setShowNotif]      = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState<number | null>(null);
  const [, tick] = useState(0);

  const dropdownRef  = useRef<HTMLDivElement>(null);
  const notifRef     = useRef<HTMLDivElement>(null);
  const avatarRef    = useRef<HTMLDivElement>(null);

  const displayName = agency?.member_name ?? agency?.name ?? "";
  const agencyLabel = agency?.brand_name || agency?.name || "Agency";
  const initials    = displayName.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Seed lastUpdated from cache on mount, then listen for fresh fetches
  useEffect(() => {
    const ts = getLastFetchedAt("sites");
    if (ts) setLastUpdated(ts);
  }, []);

  useEffect(() => {
    function handle(e: Event) {
      const ce = e as CustomEvent<{ key: string; fetchedAt: number }>;
      if (ce.detail.key === "sites") setLastUpdated(ce.detail.fetchedAt);
    }
    window.addEventListener("bb:data-fetched", handle);
    return () => window.removeEventListener("bb:data-fetched", handle);
  }, []);

  // Re-render every 30 s so "X ago" label stays current
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      cacheClear();
      await api.post("/sites/cache/clear").catch(() => {});
      window.dispatchEvent(new Event("bb:refresh"));
    } finally {
      setRefreshing(false);
    }
  }

  const loadNotifications = useCallback(async () => {
    if (!agency || isClientPortal) return;
    try {
      const { data } = await api.get("/notifications?tab=all&limit=20");
      const items: NotifItem[] = data.items ?? [];
      setNotifications(items);
      setUnreadCount(computeUnread(items));
    } catch { /* silently ignore */ }
  }, [agency, isClientPortal]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
      if (notifRef.current    && !notifRef.current.contains(e.target as Node))    setShowNotif(false);
      if (avatarRef.current   && !avatarRef.current.contains(e.target as Node))   setShowAvatarMenu(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openNotif() {
    setShowNotif(v => {
      if (!v) {
        markAnnouncementsSeen(notifications.filter(n => n.notification_type === "announcement").map(n => n.id));
        markAlertsSeen();
        setUnreadCount(0);
      }
      return !v;
    });
    setShowDropdown(false);
  }

  function handleSignOut() {
    setShowDropdown(false);
    if (isClientPortal) {
      clearToken();
      router.push("/client-portal/login");
    } else {
      logout();
    }
  }

  const preview = notifications.slice(0, 3);

  return (
    <>
      <header className="flex items-center justify-between h-14 px-5 border-b border-border bg-white shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <MobileNav />

          {/* Agency / client selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setShowDropdown(v => !v); setShowNotif(false); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: "var(--accent)" }}>
                {agencyLabel[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">{agencyLabel}</span>
              <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-150 ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{agency?.email}</p>
                </div>
                <div className="py-1.5">
                  {!isClientPortal && (
                    <>
                      <Link href="/settings/profile" onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <User size={14} className="text-indigo-500" />
                        </div>
                        <span className="font-medium">Profile</span>
                      </Link>
                      <div className="mx-3 my-1 border-t border-border" />
                    </>
                  )}
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <LogOut size={14} className="text-red-500" />
                    </div>
                    <span className="font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            <span>{lastUpdated ? `Updated ${tsAgo(lastUpdated)}` : "Refresh"}</span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {!isClientPortal && !isIndividual && roleCanDo("add_site") && (
            <button onClick={() => setShowAddSite(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: "var(--accent)" }}>
              <Plus size={15} />
              <span className="hidden sm:inline">Add Site</span>
            </button>
          )}

          {/* Bell — agency only */}
          {!isClientPortal && (
            <div className="relative" ref={notifRef}>
              <button onClick={openNotif}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-border shadow-xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">Notifications</p>
                      {notifications.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-muted-foreground">
                          {notifications.length}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setShowNotif(false)}
                      className="p-1 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors">
                      <X size={13} />
                    </button>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                    {preview.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Bell size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    ) : (
                      preview.map(item => {
                        const sev      = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.info;
                        const breaches = item.details?.breaches ?? [];
                        const dest     = item.site_id ? `/sites/${item.site_id}` : "/notifications";
                        return (
                          <button
                            key={item.id}
                            onClick={() => { router.push(dest); setShowNotif(false); }}
                            className="w-full text-left px-4 py-3.5 hover:bg-gray-50/80 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon circle */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${sev.iconBg}`}>
                                {notifMainIcon(item)}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Title row */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-xs font-semibold text-foreground leading-snug">
                                      {notifTitle(item)}
                                    </p>
                                    {item.pinned && <Pin size={9} className="text-amber-500 shrink-0" />}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5 whitespace-nowrap">
                                    {timeAgo(item.created_at)}
                                  </span>
                                </div>

                                {/* Site name + URL */}
                                {item.site_name && (
                                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                    {item.site_name}
                                    {item.site_url && (
                                      <span className="font-normal text-muted-foreground/60"> · {item.site_url.replace(/^https?:\/\//, "")}</span>
                                    )}
                                  </p>
                                )}

                                {/* Breach score chips */}
                                {breaches.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {breaches.map((b, i) => (
                                      <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                        b.score === null || b.score < 50
                                          ? "bg-red-50 text-red-600 border border-red-100"
                                          : "bg-amber-50 text-amber-600 border border-amber-100"
                                      }`}>
                                        {pillarIcon(b.pillar, "w-2.5 h-2.5")}
                                        {breachLabel(b)}
                                      </span>
                                    ))}
                                  </div>
                                ) : item.body ? (
                                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                    {item.body}
                                  </p>
                                ) : null}

                                {/* Severity badge */}
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${sev.badge}`}>
                                    {sev.label}
                                  </span>
                                  {item.site_id && (
                                    <span className="text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                      View site <ArrowRight size={10} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-border bg-gray-50/40">
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotif(false)}
                      className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {!!agency && (
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => { setShowAvatarMenu(v => !v); setShowDropdown(false); setShowNotif(false); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ background: "var(--accent)" }}
                title={displayName}
              >
                {initials}
              </button>

              {showAvatarMenu && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: "var(--accent)" }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{agency?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-1.5">
                    {!isClientPortal && (
                      <>
                        <Link href="/settings/profile" onClick={() => setShowAvatarMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <User size={14} className="text-indigo-500" />
                          </div>
                          <span className="font-medium">Profile</span>
                        </Link>
                        <Link href="/settings" onClick={() => setShowAvatarMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Settings size={14} className="text-gray-500" />
                          </div>
                          <span className="font-medium">Settings</span>
                        </Link>
                        <div className="mx-3 my-1 border-t border-border" />
                      </>
                    )}
                    <button onClick={() => { setShowAvatarMenu(false); handleSignOut(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <LogOut size={14} className="text-red-500" />
                      </div>
                      <span className="font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showAddSite && (
        <AddSiteModal
          onClose={() => setShowAddSite(false)}
          onSuccess={(siteId) => { setShowAddSite(false); router.push(`/sites/${siteId}`); }}
        />
      )}
    </>
  );
}
