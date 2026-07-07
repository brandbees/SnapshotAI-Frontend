"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Trash2, CheckCircle2, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  saveSSHCredentials,
  deleteSSHCredentials,
  getSSHCredentialsStatus,
  testSSHConnection,
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
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleTestConnection = async () => {
    if (!formData.host || !formData.username) {
      toast.error("Host and username are required");
      return;
    }

    setTesting(true);
    try {
      const success = await testSSHConnection(site.id, formData);
      if (success) {
        toast.success("✓ Connection successful!");
      } else {
        toast.error("Connection failed. Check credentials.");
      }
    } catch (error) {
      toast.error("Connection test failed: " + (error as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
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
      toast.success("✓ SSH credentials saved securely!");
      await loadStatus();
      onCredentialsSaved?.();
    } catch (error) {
      toast.error("Failed to save: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete saved SSH credentials? You'll need to re-enter them next time.")) {
      return;
    }

    setDeleting(true);
    try {
      const success = await deleteSSHCredentials(site.id);
      if (success) {
        toast.success("✓ SSH credentials removed");
        await loadStatus();
        setFormData({ host: "", port: 22, username: "", password: "", privateKey: "" });
      }
    } catch (error) {
      toast.error("Failed to delete: " + (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {status.saved && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Credentials Saved & Encrypted
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
            disabled={status.saved}
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
              disabled={status.saved}
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
              disabled={status.saved}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Auth Method Toggle */}
        {!status.saved && (
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
              disabled={status.saved}
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
                disabled={status.saved}
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
          {!status.saved ? (
            <>
              <Button
                onClick={handleTestConnection}
                disabled={loading || testing}
                variant="outline"
                className="flex-1"
              >
                {testing && <Loader2 size={16} className="mr-2 animate-spin" />}
                Test Connection
              </Button>
              <Button
                onClick={handleSaveCredentials}
                disabled={loading || testing}
                className="flex-1"
              >
                {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
                Save Credentials
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" disabled>
                ✓ Credentials Saved
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
              >
                {deleting && <Loader2 size={16} className="mr-2 animate-spin" />}
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-md">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            💡 <strong>Tip:</strong> Save credentials once to enable automatic SSH access. No repeated prompts!
          </p>
        </div>
      </div>
    </div>
  );
}
