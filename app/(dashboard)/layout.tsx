"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { isLoggedIn, isTokenExpired, clearToken, getAgency } from "@/lib/auth";

// Paths a client portal user is allowed to visit
const CLIENT_ALLOWED = ["/dashboard", "/sites", "/seo", "/performance", "/security", "/malware", "/uptime"];

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    // Client portal users can only access specific routes
    const agency = getAgency();
    if (agency?.is_client_portal) {
      const path = window.location.pathname;
      const allowed = CLIENT_ALLOWED.some(p => path === p || path.startsWith(p + "/"));
      if (!allowed) { router.replace("/dashboard"); return; }
    }

    import("@/lib/api").then(({ default: api }) => {
      // Check maintenance before rendering any dashboard content
      api.get("/status").then(({ data }) => {
        if (data.maintenance) {
          window.location.href = "/maintenance";
        } else {
          setReady(true);
        }
      }).catch(() => {
        // On error, allow through so a network hiccup doesn't lock agencies out
        setReady(true);
      });

      // Always verify onboarding status from the server — localStorage can be stale
      api.get("/auth/me").then(({ data }) => {
        const agency = data.agency;
        if (agency && agency.onboarding_complete === false && agency.trial_ends_at != null) {
          api.get("/sites?limit=1").then(({ data: sitesData }) => {
            if ((sitesData.total ?? sitesData.sites?.length ?? 0) === 0) {
              router.replace("/onboarding");
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    });
  }, [router]);

  // Auto-logout on inactivity or when returning to a tab with an expired token
  useEffect(() => {
    function doLogout() {
      clearToken();
      window.location.href = "/login";
    }

    function resetTimer() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible" && isTokenExpired()) {
        doLogout();
      }
    }

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibility);
    resetTimer();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!ready) return null;

  return (
    <BrandingProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <TrialBanner />
          <AnnouncementBanner />
          <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">{children}</main>
        </div>
      </div>
    </BrandingProvider>
  );
}
