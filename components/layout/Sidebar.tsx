"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Users,
  FileText,
  Bot,
  Settings,
  CreditCard,
  LogOut,
  Camera,
  Shield,
  Zap,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_LABELS } from "@/lib/constants";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/performance", label: "Performance", icon: Zap },
  { href: "/seo", label: "SEO", icon: Search },
  { href: "/sites", label: "Sites", icon: Globe },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/agent", label: "AI Agent", icon: Bot },
];

const settingsItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { agency, logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-surface border-r border-border shadow-[1px_0_0_0_var(--border)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
          style={{ background: "var(--accent)" }}
        >
          <Camera size={15} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-none">
            {agency?.brand_name || "SnapshotAI"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">by BrandBees</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                active
                  ? "bg-accent-light text-accent shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
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

        <div className="pt-3 mt-2 border-t border-border space-y-0.5">
          {settingsItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  active
                    ? "bg-accent-light text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon size={16} className={active ? "text-accent" : ""} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Agency footer */}
      <div className="px-3 py-3 border-t border-border">
        {agency && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {agency.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {agency.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {PLAN_LABELS[agency.plan]}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
