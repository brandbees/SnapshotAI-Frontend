import { useState, useCallback, useEffect } from "react";
import { getSSHCredentialsStatus, SSHCredentialStatus } from "@/lib/api/ssh";

/**
 * Hook to manage SSH credentials state and settings for a site
 */
export function useSSHSettings(siteId: string) {
  const [status, setStatus] = useState<SSHCredentialStatus>({ saved: false });
  const [loading, setLoading] = useState(true);
  const [sshToken, setSshToken] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, [siteId]);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSSHCredentialsStatus(siteId);
      setStatus(result);
    } catch (error) {
      console.error("Failed to load SSH status:", error);
      setStatus({ saved: false });
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  const setTokenFromConnect = useCallback((token: string) => {
    setSshToken(token);
  }, []);

  const clearToken = useCallback(() => {
    setSshToken(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    await loadStatus();
  }, [loadStatus]);

  return {
    status,
    loading,
    sshToken,
    setTokenFromConnect,
    clearToken,
    refreshStatus,
    isSaved: status.saved,
  };
}
