"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, Wifi,
  LayoutDashboard, Globe, Search, Zap, Shield,
  Bug, Activity, FileText, Bot, Users, Settings, Bell, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
  { href: "/reports",       label: "Reports",       icon: FileText,        clientVisible: false },
  { href: "/clients",       label: "Clients",       icon: Users,           clientVisible: false },
  { href: "/agent",         label: "AI Agent",      icon: Bot,             clientVisible: false },
  { href: "/settings",      label: "Settings",      icon: Settings,        clientVisible: false },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { agency, logout } = useAuth();

  const isClientPortal = agency?.is_client_portal ?? false;
  const navItems = ALL_NAV.filter(item => !isClientPortal || item.clientVisible);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const displayName = agency?.member_name ?? agency?.name ?? "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleLogout() {
    setOpen(false);
    if (isClientPortal) {
      clearToken();
      router.push("/client-portal/login");
    } else {
      logout();
    }
  }

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
      >
        <Menu size={18} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white border-r border-border z-50 flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent)" }}
                >
                  <Wifi size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-none">
                    {agency?.brand_name || "BrandBees"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">SnapshotAI</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-accent-light text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                    )}
                  >
                    <Icon size={16} className={active ? "text-accent" : ""} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* User footer */}
            <div className="px-3 py-4 border-t border-border">
              {agency && (
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
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
                      {agency.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
