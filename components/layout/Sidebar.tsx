"use client";

import { useState, useEffect } from "react";
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

export function Sidebar() {
  const pathname = usePathname();
  const { agency, logout } = useAuth();
  const { logoUrl } = useBranding();
  const { roleCanDo } = useRole();
  const router = useRouter();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Agency logo"
            className="h-8 max-h-8 max-w-[140px] object-contain"
          />
        ) : (
          <>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <Wifi size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">
                {agency?.brand_name || "BrandBees"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                SnapshotAI
              </p>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
          Menu
        </p>

        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-light text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                )}
              >
                <Icon
                  size={16}
                  className={active ? "text-accent" : ""}
                />
                {label}
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
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-accent-light text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent-light"
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        "shrink-0 transition-colors",
                        active ? "text-accent" : "group-hover:text-accent"
                      )}
                    />
                    {label}
                  </Link>
                );
              })}
          </div>
        )}
      </nav>

      {/* What's new — agency only */}
      {!isClientPortal && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setChangelogOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
          >
            <Sparkles size={16} />
            What&apos;s new
            {unreadCount > 0 && (
              <span
                className="ml-auto text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{ background: "var(--accent)" }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-4 border-t border-border">
        {!!agency && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-none">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {displayEmail}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>

      <ChangelogModal
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        onSeen={() => setUnreadCount(0)}
      />
    </aside>
  );
}
