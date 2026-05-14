"use client";

import { useAuth } from "./useAuth";
import type { TeamRole } from "@/types";

const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  owner:   ["view", "run_audit", "run_scan", "generate_report", "edit_white_label", "manage_alerts", "manage_team", "access_billing", "add_site", "delete_site"],
  admin:   ["view", "run_audit", "run_scan", "generate_report", "manage_alerts", "manage_team", "add_site", "delete_site"],
  manager: ["view", "run_audit", "run_scan", "generate_report"],
  analyst: ["view"],
};

export function useRole() {
  const { agency, loading } = useAuth();
  const role: TeamRole = agency?.role ?? "owner";

  function roleCanDo(action: string): boolean {
    return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
  }

  return { role, roleCanDo, loading };
}
