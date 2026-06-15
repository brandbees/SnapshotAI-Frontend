"use client";

import { useState, useEffect } from "react";
import { Wrench, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  // Auto-check every 30 s and redirect when maintenance ends
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function check() {
      try {
        const res = await fetch(`${API_BASE_URL}/status`);
        const json = await res.json();
        if (!json.maintenance) {
          setBackOnline(true);
          clearInterval(timer);
          setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
        }
      } catch { /* ignore */ }
    }

    timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, []);

  async function tryNow() {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/status`);
      const json = await res.json();
      if (!json.maintenance) {
        window.location.href = "/dashboard";
        return;
      }
    } catch { /* ignore */ }
    finally { setChecking(false); }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-border shadow-sm max-w-md w-full px-8 py-12 text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-6">
          <Wrench size={28} className="text-amber-500" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Down for Maintenance
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          BrandBees SnapshotAI is currently undergoing scheduled maintenance.
          We&apos;ll be back online shortly — no action is needed on your end.
        </p>

        {backOnline ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-semibold text-sm">
            <RefreshCw size={14} className="animate-spin" />
            Back online — redirecting…
          </div>
        ) : (
          <button
            onClick={tryNow}
            disabled={checking}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {checking
              ? <><RefreshCw size={13} className="animate-spin" /> Checking…</>
              : <><RefreshCw size={13} /> Try again</>}
          </button>
        )}

        <p className="text-[11px] text-muted-foreground mt-8">
          We check automatically every 30 seconds and will redirect you when we&apos;re back.
        </p>
      </div>
    </div>
  );
}
