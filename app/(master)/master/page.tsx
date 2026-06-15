"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isMasterLoggedIn } from "@/lib/masterAuth";

export default function MasterRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isMasterLoggedIn()) {
      router.replace("/master/dashboard");
    } else {
      router.replace("/master/login");
    }
  }, [router]);

  return null;
}
