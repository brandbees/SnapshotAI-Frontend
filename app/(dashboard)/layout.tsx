"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { isLoggedIn, getAgency } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    const agency = getAgency();
    // Only redirect to onboarding for new accounts (trial_ends_at is set on register).
    // Old accounts have trial_ends_at = null and must never be forced through onboarding.
    if (agency && agency.onboarding_complete === false && agency.trial_ends_at != null) {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <BrandingProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <TrialBanner />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </BrandingProvider>
  );
}
