const TOKEN_KEY = "bb_master_token";

export function getMasterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setMasterToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearMasterToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isMasterTokenExpired(): boolean {
  const token = getMasterToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

export function isMasterLoggedIn(): boolean {
  return !!getMasterToken() && !isMasterTokenExpired();
}

export function getMasterRole(): string {
  const token = getMasterToken();
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.master_role ?? "";
  } catch {
    return "";
  }
}
