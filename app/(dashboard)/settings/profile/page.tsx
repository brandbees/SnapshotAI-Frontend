"use client";

import { useState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import api from "@/lib/api";

export default function ProfilePage() {
  const { agency, updateAgency } = useAuth();
  const { role } = useRole();

  // Display name — for owners it's the agency name, for members it's their personal name
  const isOwner = role === "owner";
  const displayName = isOwner ? (agency?.name ?? "") : (agency?.member_name ?? agency?.name ?? "");
  const email = agency?.email ?? "";

  const [name, setName] = useState(displayName);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handleSaveProfile() {
    if (!name.trim()) return;
    setProfileSaving(true);
    try {
      const { data } = await api.put<{ name: string }>("/auth/profile", { name: name.trim() });
      if (isOwner) {
        updateAgency({ name: data.name });
      } else {
        updateAgency({ member_name: data.name });
      }
      toast.success("Profile updated.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to save.";
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.put("/auth/password", { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to change password.";
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  }

  // Avatar: use first letter of display name
  const avatarLetter = (name || "?")[0].toUpperCase();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Profile"
        description="Update your personal details and password."
      />

      {/* ── Profile info ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <User size={15} className="inline mr-2 opacity-60" />
            Account info
          </CardTitle>
        </CardHeader>

        <div className="px-5 pb-5 space-y-5">
          {/* Avatar + role */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {avatarLetter}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{name || "—"}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{role}</p>
            </div>
          </div>

          {/* Name field */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {isOwner ? "Agency name" : "Your name"}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isOwner ? "Acme Agency" : "Jane Smith"}
              onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
            />
          </div>

          {/* Email — always read-only */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email address
            </label>
            <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground select-all">
              {email}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Email cannot be changed from here. Contact support if needed.
            </p>
          </div>

          <Button
            onClick={handleSaveProfile}
            loading={profileSaving}
            disabled={!name.trim() || name.trim() === displayName}
          >
            Save changes
          </Button>
        </div>
      </Card>

      {/* ── Change password ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Lock size={15} className="inline mr-2 opacity-60" />
            Change password
          </CardTitle>
        </CardHeader>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current password</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">New password</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm new password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />
          </div>

          <Button onClick={handleChangePassword} loading={passwordSaving}>
            Update password
          </Button>
        </div>
      </Card>
    </div>
  );
}
