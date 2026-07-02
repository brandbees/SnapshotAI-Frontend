"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Search,
  Zap,
  Shield,
  Bug,
  Activity,
  FileText,
  Bot,
  Settings,
  LogOut,
  Wifi,
  Users,
  Sparkles,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/contexts/BrandingContext";
import { useRole } from "@/hooks/useRole";
import { ChangelogModal } from "@/components/shared/ChangelogModal";
import api from "@/lib/api";
import { clearToken } from "@/lib/auth";

const ALL_NAV = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, clientVisible: true  },
  { href: "/notifications", label: "Notifications", icon: Bell,            clientVisible: false },
  { href: "/sites",         label: "Sites",         icon: Globe,           clientVisible: true  },
  { href: "/seo",           label: "SEO",           icon: Search,          clientVisible: true  },
  { href: "/performance",   label: "Performance",   icon: Zap,             clientVisible: true  },
  { href: "/security",      label: "Security",      icon: Shield,          clientVisible: true  },
  { href: "/malware",       label: "Malware",       icon: Bug,             clientVisible: true  },
  { href: "/uptime",        label: "Uptime",        icon: Activity,        clientVisible: true  },
  { href: "/reports",       label: "Reports",       icon: FileText,        clientVisible: false, agencyOnly: false },
  { href: "/clients",       label: "Clients",       icon: Users,           clientVisible: false, agencyOnly: true  },
  { href: "/agent",         label: "AI Agent",      icon: Bot,             clientVisible: false, agencyOnly: false },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

// ── Portal tooltip (renders in document.body, escapes all overflow clipping) ──

type TooltipState = { label: string; top: number; left: number } | null;

function SidebarTooltipPortal({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: tooltip.top,
        left: tooltip.left,
        transform: "translateY(-50%)",
        zIndex: 9999,
      }}
      className="pointer-events-none"
    >
      {/* Arrow */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900" />
      <div className="bg-gray-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
        {tooltip.label}
      </div>
    </div>,
    document.body
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { agency, logout } = useAuth();
  const { logoUrl } = useBranding();
  const { roleCanDo } = useRole();
  const router = useRouter();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bb_sidebar_collapsed") === "1";
  });
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const isClientPortal = agency?.is_client_portal ?? false;

  useEffect(() => {
    if (isClientPortal) return;
    api.get<{ unread: number }>("/changelog")
      .then(({ data }) => setUnreadCount(data.unread))
      .catch(() => {});
  }, [isClientPortal]);

  const isIndividual = agency?.account_type === "individual";
  const navItems = ALL_NAV.filter(item =>
    (!isClientPortal || item.clientVisible) &&
    (!isIndividual || !item.agencyOnly)
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const displayName = agency?.member_name ?? agency?.name ?? "";
  const displayEmail = agency?.email ?? "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleLogout() {
    if (isClientPortal) {
      clearToken();
      router.push("/client-portal/login");
    } else {
      logout();
    }
  }

  function toggleCollapsed() {
    setTooltip(null);
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("bb_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  const showTooltip = useCallback((e: React.MouseEvent<HTMLElement>, label: string) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  }, [collapsed]);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col min-h-screen bg-white border-r border-border transition-all duration-200 overflow-hidden shrink-0",
          collapsed ? "w-[60px]" : "w-60"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center h-[65px] border-b border-border shrink-0 px-3 gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Agency logo"
                className={cn("object-contain shrink-0", collapsed ? "h-7 w-7" : "h-8 max-h-8 max-w-[120px]")}
              />
            ) : (
              <>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  <Wifi size={16} className="text-white" />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground leading-none truncate">
                      {agency?.brand_name || "BrandBees"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">SnapshotAI</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md border border-border
              text-muted-foreground hover:text-foreground hover:bg-gray-100 hover:border-gray-300
              transition-all duration-150"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 pt-4 pb-2 overflow-y-auto overflow-x-hidden", collapsed ? "px-2" : "px-3")}>
          <div className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={e => showTooltip(e, label)}
                  onMouseLeave={hideTooltip}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center w-full py-2.5 px-0" : "px-3 py-2.5",
                    active
                      ? "bg-accent-light text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
                  )}
                >
                  <Icon size={16} className={cn("shrink-0 transition-colors", active ? "text-accent" : "")} />
                  {!collapsed && label}
                </Link>
              );
            })}
          </div>

          {!isClientPortal && (
            <div className="mt-3 pt-3 border-t border-border space-y-0.5">
              {bottomItems
                .filter(({ href }) => {
                  if (href === "/billing") return roleCanDo("access_billing");
                  return true;
                })
                .map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onMouseEnter={e => showTooltip(e, label)}
                      onMouseLeave={hideTooltip}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150",
                        collapsed ? "justify-center w-full py-2.5 px-0" : "px-3 py-2.5",
                        active
                          ? "bg-accent-light text-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn("shrink-0 transition-colors", active ? "text-accent" : "group-hover:text-accent")}
                      />
                      {!collapsed && label}
                    </Link>
                  );
                })}
            </div>
          )}
        </nav>

        {/* What's new */}
        {!isClientPortal && (
          <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
            <button
              onClick={() => setChangelogOpen(true)}
              onMouseEnter={e => showTooltip(e, "What's new")}
              onMouseLeave={hideTooltip}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-all duration-150",
                collapsed ? "justify-center py-2.5 px-0" : "px-3 py-2.5"
              )}
            >
              <div className="relative shrink-0">
                <Sparkles size={16} />
                {collapsed && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </div>
              {!collapsed && (
                <>
                  What&apos;s new
                  {unreadCount > 0 && (
                    <span
                      className="ml-auto text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{ background: "var(--accent)" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* User footer */}
        <div className={cn("py-3 border-t border-border", collapsed ? "px-2" : "px-3")}>
          {!!agency && (
            collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 cursor-default"
                  style={{ background: "var(--accent)" }}
                  onMouseEnter={e => showTooltip(e, displayName)}
                  onMouseLeave={hideTooltip}
                >
                  {initials}
                </div>
                <button
                  onClick={handleLogout}
                  onMouseEnter={e => showTooltip(e, "Sign out")}
                  onMouseLeave={hideTooltip}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all duration-150"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-none">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{displayEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )
          )}
        </div>

        <ChangelogModal
          open={changelogOpen}
          onClose={() => setChangelogOpen(false)}
          onSeen={() => setUnreadCount(0)}
        />
      </aside>

      {/* Tooltip rendered in document.body — escapes all overflow clipping */}
      <SidebarTooltipPortal tooltip={tooltip} />
    </>
  );
}
