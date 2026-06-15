"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { AUDIT_POLL_INTERVAL_MS } from "@/lib/constants";
import type { Audit } from "@/types";

export function useAuditStatus(auditId: string | null) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!auditId) {
      setDone(false);
      return;
    }
    setDone(false);

    const poll = async () => {
      try {
        const { data } = await api.get<Audit>(`/audits/${auditId}/status`);
        setAudit(data);
        if (data.status === "completed" || data.status === "failed") {
          setDone(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // keep polling silently
      }
    };

    poll();
    intervalRef.current = setInterval(poll, AUDIT_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auditId]);

  return { audit, done };
}
