"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { getBranding } from "@/lib/auth";
import { isValidEmail } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/constants";
import type { StoredBranding } from "@/lib/auth";

const CF_SITE_KEY = process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY ?? "";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cfToken, setCfToken] = useState<string | null>(null);

  function validateEmail(v: string) {
    if (v && !isValidEmail(v)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  }

  // Start null so SSR and first client render match — populated in useEffect (client-only)
  const [branding, setBranding] = useState<StoredBranding | null>(null);

  useEffect(() => {
    // Already logged in — skip login page
    import("@/lib/auth").then(({ isLoggedIn }) => {
      if (isLoggedIn()) { router.replace("/dashboard"); return; }
    });

    // Pre-fill error from ?error= param (e.g. redirected here after suspension)
    const paramError = searchParams.get("error");
    if (paramError) setError(paramError);

    const stored = getBranding();
    setBranding(stored);
    if (stored?.accent_color) {
      document.documentElement.style.setProperty("--accent", stored.accent_color);
    }
    // Redirect to maintenance page if platform is down
    fetch(`${API_BASE_URL}/status`)
      .then(r => r.json())
      .then(d => { if (d.maintenance) window.location.href = "/maintenance"; })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password, cfToken);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const brandName = branding?.brand_name ?? "BrandBees SnapshotAI";
  const logoUrl   = branding?.logo_url   ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8f9fb 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-12 w-auto object-contain mb-4" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/Brandbees-sas-x512.png" alt="BrandBees" className="w-14 h-14 object-contain mb-4" />
          )}
          <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">to {brandName}</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-7 shadow-[0_4px_24px_0_rgb(0_0_0/0.08)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                onBlur={(e) => validateEmail(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:bg-surface transition-all ${emailError ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-ring focus:border-ring"}`}
                placeholder="you@agency.com"
              />
              {emailError && <p className="text-xs text-red-600">{emailError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {CF_SITE_KEY && (
              <Turnstile
                siteKey={CF_SITE_KEY}
                onSuccess={setCfToken}
                onExpire={() => setCfToken(null)}
                onError={() => setCfToken(null)}
                options={{ theme: "light", size: "flexible" }}
              />
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!!emailError || (!!CF_SITE_KEY && !cfToken)}
              className="w-full h-11 rounded-xl text-sm font-bold mt-1"
            >
              Sign in
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-accent hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
