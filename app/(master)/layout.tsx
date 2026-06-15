"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MasterSidebar } from "@/components/master/MasterSidebar";
import { MasterTopBar } from "@/components/master/MasterTopBar";
import { isMasterLoggedIn } from "@/lib/masterAuth";
import { MasterPlatformProvider } from "@/context/MasterPlatformContext";

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/master/login") return;
    if (!isMasterLoggedIn()) {
      router.replace("/master/login");
    }
  }, [pathname, router]);

  if (pathname === "/master/login") {
    return <>{children}</>;
  }

  return (
    <MasterPlatformProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
        <MasterSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MasterTopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </MasterPlatformProvider>
  );
}
