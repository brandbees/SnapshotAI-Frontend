"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Shield } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { setToken, setAgency, getToken } from "@/lib/auth";
import type { Agency } from "@/types";

export default function ClientPortalLoginPage() {
  const router = useRouter();

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function handleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/client-portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid email or password."); return; }

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
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border max-w-sm w-full overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center border-b border-border">
          <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center bg-accent/10">
            <Shield size={20} className="text-accent" />
          </div>
          <h1 className="text-base font-bold text-foreground">Client Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sign in to view your sites</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleLogin(); }} className="px-8 py-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle size={12} />{error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-accent disabled:opacity-50 hover:opacity-90 transition-opacity">
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
