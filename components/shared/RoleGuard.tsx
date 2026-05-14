"use client";

import { useRole } from "@/hooks/useRole";

interface RoleGuardProps {
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ action, children, fallback = null }: RoleGuardProps) {
  const { roleCanDo } = useRole();
  if (!roleCanDo(action)) return <>{fallback}</>;
  return <>{children}</>;
}
