"use client";

import { useRouter } from "next/navigation";
import {
  getMasterToken,
  setMasterToken,
  clearMasterToken,
  isMasterLoggedIn,
} from "@/lib/masterAuth";
import masterApi from "@/lib/masterApi";

export function useMasterAuth() {
  const router = useRouter();

  const isAuthenticated = isMasterLoggedIn();

  async function login(email: string, password: string, cfTurnstileToken?: string | null): Promise<void> {
    const { data } = await masterApi.post<{ token: string }>(
      "/master/auth/login",
      { email, password, cf_turnstile_token: cfTurnstileToken }
    );
    setMasterToken(data.token);
  }

  function logout(): void {
    clearMasterToken();
    router.replace("/master/login");
  }

  return { isAuthenticated, login, logout, getMasterToken };
}
