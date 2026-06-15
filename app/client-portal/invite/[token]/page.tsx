"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { setToken, setAgency } from "@/lib/auth";
import type { Agency } from "@/types";

interface InviteInfo {
  name: string;
  email: string;
  agency_name: string;
  brand_name: string | null;
  logo_url: string | null;
  accent_color: string | null;
  favicon_url: string | null;
}

export default function ClientPortalInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo]           = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [fieldError, setFieldError]         = useState<string | null>(null);
  const [done, setDone]                     = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/client-portal/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setLoadError(data.error); return; }
        setInfo(data);
        if (data.accent_color) {
          document.documentElement.style.setProperty("--accent", data.accent_color);
        }
      })
      .catch(() => setLoadError("Could not load invite. Check your link and try again."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setFieldError(null);
    if (password.length < 8) { setFieldError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setFieldError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/client-portal/accept/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setFieldError(data.error || "Something went wrong."); return; }

      const agency: Agency = {
        id:               data.client.agency_id,
        name:             data.client.agency_name,
        email:            data.client.email,
        plan:             "freemium",
        brand_name:       data.client.brand_name ?? null,
        logo_url:         data.client.logo_url ?? null,
        accent_color:     data.client.accent_color ?? null,
        favicon_url:      data.client.favicon_url ?? null,
        role:             "viewer",
        member_name:      data.client.name,
        is_client_portal: true,
        sites_count:      0,
      };

      setToken(data.token);
      setAgency(agency);
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setFieldError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const accent = info?.accent_color || "#3B82F6";
  const brandName = info?.brand_name || info?.agency_name || "Your Agency";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-7 h-7 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border max-w-sm w-full p-8 text-center">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h2 className="font-bold text-foreground mb-1">Invite unavailable</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border max-w-sm w-full p-8 text-center">
          <CheckCircle2 size={40} style={{ color: accent }} className="mx-auto mb-3" />
          <h2 className="font-bold text-foreground mb-1">You&apos;re in!</h2>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border max-w-sm w-full overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center border-b border-border">
          {info?.logo_url ? (
            <img src={info.logo_url} alt={brandName} className="h-10 mx-auto mb-3 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: `${accent}20` }}>
              <Shield size={20} style={{ color: accent }} />
            </div>
          )}
          <h1 className="text-base font-bold text-foreground">{brandName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hi {info?.name}, set a password to access your dashboard
          </p>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
            <input value={info?.email || ""} readOnly
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-muted/30 text-muted-foreground cursor-default" />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Create password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Confirm password <span className="text-destructive">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {fieldError && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle size={12} />{fieldError}
            </p>
          )}

          <button
            onClick={handleAccept}
            disabled={submitting || !password || !confirmPassword}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: accent }}>
            {submitting ? "Setting up your account…" : "Access My Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
