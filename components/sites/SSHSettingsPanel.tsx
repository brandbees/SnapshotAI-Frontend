"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  saveSSHCredentials,
  deleteSSHCredentials,
  getSSHCredentialsStatus,
  SSHCredentials,
  SSHCredentialStatus,
} from "@/lib/api/ssh";
import type { Site } from "@/types";

interface SSHSettingsPanelProps {
  site: Site;
  onCredentialsSaved?: () => void;
}

export function SSHSettingsPanel({ site, onCredentialsSaved }: SSHSettingsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usePrivateKey, setUsePrivateKey] = useState(false);
  const [status, setStatus] = useState<SSHCredentialStatus>({ saved: false });
  const [formData, setFormData] = useState<SSHCredentials>({
    host: "",
    port: 22,
    username: "",
    password: "",
    privateKey: "",
  });

  // Form is editable when nothing is saved, or user clicked Update Credentials
  const formEnabled = !status.saved || editing;

  // Load credential status on mount
  useEffect(() => {
    loadStatus();
  }, [site.id]);

  const loadStatus = async () => {
    try {
      const result = await getSSHCredentialsStatus(site.id);
      setStatus(result);
    } catch (error) {
      console.error("Failed to load SSH status:", error);
    }
  };

  // Backend tests the connection before encrypting & saving — one click does both
  const handleConnectAndSave = async () => {
    if (!formData.host || !formData.username) {
      toast.error("Host and username are required");
      return;
    }

    if (!usePrivateKey && !formData.password) {
      toast.error("Enter password or use private key");
      return;
    }

    setLoading(true);
    try {
      await saveSSHCredentials(site.id, formData);
      toast.success("✓ Connected — credentials saved securely!");
      setEditing(false);
      await loadStatus();
      onCredentialsSaved?.();
    } catch (error) {
      toast.error("Connection failed: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect SSH? Saved credentials will be removed and you'll need to re-enter them next time.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const success = await deleteSSHCredentials(site.id);
      if (success) {
        toast.success("✓ SSH disconnected");
        setFormData({ host: "", port: 22, username: "", password: "", privateKey: "" });
        setEditing(false);
        await loadStatus();
      }
    } catch (error) {
      toast.error("Failed to disconnect: " + (error as Error).message);
    } finally {
      setDisconnecting(false);
    }
  };

  const startEditing = () => {
    setFormData({ host: "", port: 22, username: "", password: "", privateKey: "" });
    setEditing(true);
  };

  return (
    <div className="space-y-5">
      {status.saved && !editing && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                SSH Connected — Credentials Encrypted
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Secured with AES-256-GCM • Saved {new Date(status.saved_at || "").toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Host */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Host
          </label>
          <input
            type="text"
            placeholder="ssh.example.com"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            disabled={!formEnabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Port & Username */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Port
            </label>
            <input
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
              disabled={!formEnabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              placeholder="deploy"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!formEnabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Auth Method Toggle */}
        {formEnabled && (
          <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usePrivateKey}
                onChange={(e) => setUsePrivateKey(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Use Private Key
              </span>
            </label>
          </div>
        )}

        {/* Password or Private Key */}
        {usePrivateKey ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Private Key
            </label>
            <textarea
              placeholder="-----BEGIN RSA PRIVATE KEY-----"
              value={formData.privateKey || ""}
              onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
              disabled={!formEnabled}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password || ""}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={!formEnabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          {formEnabled ? (
            <>
              {editing && (
                <Button
                  onClick={() => setEditing(false)}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleConnectAndSave}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
                {loading ? "Connecting…" : "Connect & Save Credentials"}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={startEditing}
                disabled={disconnecting}
                variant="outline"
                className="flex-1"
              >
                Update Credentials
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
              >
                {disconnecting && <Loader2 size={16} className="mr-2 animate-spin" />}
                Disconnect
              </Button>
            </>
          )}
        </div>

        {/* Info */}
        {formEnabled && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-md">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              💡 <strong>Tip:</strong> Connect once — credentials are encrypted and the AI agent gets automatic SSH access. No repeated prompts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
