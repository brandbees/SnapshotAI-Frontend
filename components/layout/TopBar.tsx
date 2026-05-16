"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Plus, ChevronDown, RefreshCw, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { AddSiteModal } from "@/components/sites/AddSiteModal";

export function TopBar() {
  const { agency, logout } = useAuth();
  const { roleCanDo } = useRole();
  const router = useRouter();
  const [showAddSite, setShowAddSite] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = agency?.member_name ?? agency?.name ?? "";
  const agencyLabel = agency?.brand_name || agency?.name || "Agency";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  return (
    <>
      <header className="flex items-center justify-between h-14 px-5 border-b border-border bg-white shrink-0">
        {/* Left: mobile nav + agency selector */}
        <div className="flex items-center gap-3">
          <MobileNav />

          {/* Agency selector pill with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: "var(--accent)" }}
              >
                {agencyLabel[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">
                {agencyLabel}
              </span>
              <ChevronDown
                size={13}
                className={`text-muted-foreground transition-transform duration-150 ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {agency?.email}
                  </p>
                </div>

                {/* Options */}
                <div className="py-1.5">
                  <Link
                    href="/settings/profile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <User size={14} className="text-indigo-500" />
                    </div>
                    <span className="font-medium">Profile</span>
                  </Link>

                  <div className="mx-3 my-1 border-t border-border" />

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <LogOut size={14} className="text-red-500" />
                    </div>
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Last updated hint */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw size={11} />
            <span>Updated 2 min ago</span>
          </div>
        </div>

        {/* Right: Add Site + Bell + Avatar */}
        <div className="flex items-center gap-2">
          {roleCanDo("add_site") && (
            <button
              onClick={() => setShowAddSite(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: "var(--accent)" }}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Site</span>
            </button>
          )}

          <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {agency && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-pointer"
              style={{ background: "var(--accent)" }}
              title={displayName}
            >
              {initials}
            </div>
          )}
        </div>
      </header>

      {showAddSite && (
        <AddSiteModal
          onClose={() => setShowAddSite(false)}
          onSuccess={() => {
            setShowAddSite(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
