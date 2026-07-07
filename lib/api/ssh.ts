/**
 * SSH Credentials API Client
 * Handles all API calls for saving/loading/deleting SSH credentials
 */

import api from "@/lib/api";

export interface SSHCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface SSHCredentialStatus {
  saved: boolean;
  vault_id?: string;
  saved_at?: string;
  updated_at?: string;
}

export interface SSHConnectResponse {
  success: boolean;
  message: string;
  ssh_token: string;
  vault_id: string;
}

/**
 * Test SSH connection without saving
 */
export async function testSSHConnection(credentials: SSHCredentials): Promise<boolean> {
  try {
    const response = await api.post(
      `/api/agent/ssh/connect`,
      {
        site_id: "test",
        ...credentials,
        save: false, // Don't save, just test
      },
      { validateStatus: () => true }
    );
    return response.status === 200;
  } catch (error) {
    console.error("SSH test failed:", error);
    return false;
  }
}

/**
 * Save SSH credentials for a site
 */
export async function saveSSHCredentials(
  siteId: string,
  credentials: SSHCredentials
): Promise<SSHConnectResponse> {
  const response = await api.post(
    `/api/sites/${siteId}/ssh/credentials/save`,
    credentials
  );
  return response.data;
}

/**
 * Check if SSH credentials are saved for a site
 */
export async function getSSHCredentialsStatus(
  siteId: string
): Promise<SSHCredentialStatus> {
  try {
    const response = await api.get(
      `/api/sites/${siteId}/ssh/credentials/status`,
      { validateStatus: () => true }
    );

    if (response.status === 404) {
      return { saved: false };
    }

    return response.data;
  } catch (error) {
    console.error("Failed to get SSH credentials status:", error);
    return { saved: false };
  }
}

/**
 * Delete saved SSH credentials for a site
 */
export async function deleteSSHCredentials(siteId: string): Promise<boolean> {
  try {
    const response = await api.delete(
      `/api/sites/${siteId}/ssh/credentials`,
      { validateStatus: () => true }
    );
    return response.status === 200;
  } catch (error) {
    console.error("Failed to delete SSH credentials:", error);
    return false;
  }
}

/**
 * Connect SSH (on-demand, with optional save)
 */
export async function connectSSH(
  siteId: string,
  credentials: SSHCredentials,
  save: boolean = false
): Promise<SSHConnectResponse> {
  const response = await api.post(
    `/api/agent/ssh/connect`,
    {
      site_id: siteId,
      ...credentials,
      save,
    }
  );
  return response.data;
}
