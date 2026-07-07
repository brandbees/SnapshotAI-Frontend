"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { connectSSH, SSHCredentials } from "@/lib/api/ssh";

interface SSHConnectModalProps {
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export function SSHConnectModal({
  siteId,
  isOpen,
  onClose,
  onSuccess,
}: SSHConnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [usePrivateKey, setUsePrivateKey] = useState(false);
  const [formData, setFormData] = useState<SSHCredentials>({
    host: "",
    port: 22,
    username: "",
    password: "",
    privateKey: "",
  });

  const handleConnect = async () => {
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
      const result = await connectSSH(siteId, formData, saveCredentials);
      toast.success("✓ SSH connected!");
      onSuccess(result.ssh_token);

      if (saveCredentials) {
        toast.success("✓ Credentials saved for future use");
      }

      // Reset form
      setFormData({ host: "", port: 22, username: "", password: "", privateKey: "" });
      setSaveCredentials(false);
      onClose();
    } catch (error) {
      toast.error("Connection failed: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enter SSH Credentials
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Info Banner */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <Shield size={14} className="inline mr-2" />
                <strong>Encrypted.</strong> Credentials are encrypted with AES-256.
              </p>
            </div>

            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Host *
              </label>
              <input
                type="text"
                placeholder="ssh.example.com"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Port & Username */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  placeholder="deploy"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Auth Method */}
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

            {/* Password or Key */}
            {usePrivateKey ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Private Key
                </label>
                <textarea
                  placeholder="-----BEGIN RSA PRIVATE KEY-----"
                  value={formData.privateKey || ""}
                  onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
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

            {/* Save Checkbox */}
            <label className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={saveCredentials}
                onChange={(e) => setSaveCredentials(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Save credentials for future use (encrypted)
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
              Connect
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
