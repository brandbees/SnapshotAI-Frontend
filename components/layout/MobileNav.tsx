"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Camera, LayoutDashboard, Globe, Users,
  FileText, Bot, Settings, CreditCard, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_LABELS } from "@/lib/constants";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sites", label: "Your Sites", icon: Globe },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/agent", label: "AI Assistant", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { agency, logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Menu size={18} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-border z-50 flex flex-col shadow-lg">
            <div className="flex items-center justify-between px-5 h-16 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--accent)" }}
                >
                  <Camera size={14} className="text-white" />
                </div>
                <span className="font-bold text-sm">
                  {agency?.brand_name || "SnapshotAI"}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
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
            </nav>

            <div className="px-3 py-3 border-t border-border">
              {agency && (
                <div className="flex items-center gap-2.5 p-2">
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
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
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
