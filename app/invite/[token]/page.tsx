"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { setToken, setAgency } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

interface InviteInfo {
  email: string;
  name: string | null;
  role: string;
  agency_name: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin:   "Admin",
  manager: "Manager",
  analyst: "Analyst",
};

const ROLE_DESC: Record<string, string> = {
  admin:   "Can manage sites, alerts, and team members.",
  manager: "Can run audits and generate reports.",
  analyst: "View-only access to dashboards and reports.",
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/team/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); return; }
        setInfo(data);
        if (data.name) setName(data.name);
      })
      .catch(() => setLoadError("Could not load invite. Check your link and try again."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setFieldError(null);
    if (!name.trim()) { setFieldError("Please enter your name."); return; }
    if (password.length < 8) { setFieldError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setFieldError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/team/accept/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setFieldError(data.error ?? "Failed to accept invite."); return; }

      // Log in immediately
      setToken(data.token);
      setAgency(data.agency);
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch {
      setFieldError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error (invalid / expired / already used)
  if (loadError || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={22} className="text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Invite unavailable</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{loadError}</p>
      </div>
    );
  }

  // Success
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={22} className="text-green-600" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">You&apos;re in!</h1>
        <p className="text-sm text-muted-foreground">Taking you to the dashboard…</p>
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    );
  }

  // Invite form
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm" style={{ background: "var(--accent)" }}>
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">You&apos;ve been invited</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join <strong className="text-foreground">{info.agency_name}</strong> on BrandBees SnapshotAI
          </p>
        </div>

        {/* Role pill */}
        <div className="bg-white rounded-xl border border-border p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Shield size={15} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Role: {ROLE_LABEL[info.role] ?? info.role}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ROLE_DESC[info.role] ?? ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Joining as <strong>{info.email}</strong></p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Your name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Set a password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              onKeyDown={(e) => e.key === "Enter" && handleAccept()}
            />
          </div>

          {fieldError && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="shrink-0" />
              {fieldError}
            </div>
          )}

          <Button className="w-full" onClick={handleAccept} loading={submitting}>
            Accept invitation
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link href="/login" className="underline font-medium text-foreground">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
