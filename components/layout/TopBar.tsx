"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_LABELS } from "@/lib/constants";

export function TopBar() {
  const { agency } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-5 border-b border-border bg-surface shadow-[0_1px_0_0_var(--border)]">
      <div className="flex items-center gap-3 flex-1">
        <MobileNav />

        {/* Search */}
        <div className="relative hidden sm:block w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search sites..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell size={16} />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
        </button>

        {agency && (
          <Link
            href="/settings/profile"
            className="flex items-center gap-2.5 pl-2 ml-1 border-l border-border hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">
                {agency.member_name ?? agency.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {PLAN_LABELS[agency.plan]}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              {(agency.member_name ?? agency.name)[0].toUpperCase()}
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
