"use client";

import { useState, useEffect } from "react";
import { Shield, LogOut, RefreshCw } from "lucide-react";
import { useMasterAuth } from "@/hooks/useMasterAuth";
import { useMasterPlatform } from "@/context/MasterPlatformContext";
import masterApi from "@/lib/masterApi";

const LS_KEY = "bb_master_last_refresh";

function tsAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function MasterTopBar() {
  const { logout } = useMasterAuth();
  const { platform } = useMasterPlatform();

  const [refreshing,   setRefreshing]   = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setLastRefreshed(parseInt(stored));
    } catch { /* ignore */ }
  }, []);

  // Re-render every 30s so the "X ago" label stays current
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await masterApi.delete("/master/cache").catch(() => {});
      const now = Date.now();
      setLastRefreshed(now);
      try { localStorage.setItem(LS_KEY, String(now)); } catch { /* ignore */ }
      // Signal all master pages that have a bb:master-refresh listener
      window.dispatchEvent(new Event("bb:master-refresh"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <header className="flex items-center justify-between h-14 px-5 border-b border-border bg-white shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield size={15} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-semibold text-foreground">{platform.name}</span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
          >
            MASTER
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Clear server cache and reload data"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          <span>{lastRefreshed ? `Updated ${tsAgo(lastRefreshed)}` : "Refresh"}</span>
        </button>
      </div>

      {/* Right */}
      <button
        onClick={logout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors border border-border"
      >
        <LogOut size={13} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </header>
  );
}
