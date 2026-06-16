"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Eye, EyeOff, CheckCircle2, Circle, ArrowLeft, RefreshCw, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { cn, isValidEmail } from "@/lib/utils";

// ── Password generator ────────────────────────────────────────────────────────

const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';

function generateStrongPassword(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => CHARSET[b % CHARSET.length]).join('');
}

// ── Password strength ─────────────────────────────────────────────────────────

const RULES = [
  { label: "At least 8 characters",        test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",          test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",          test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",                    test: (p: string) => /\d/.test(p) },
  { label: "One special character (!@#…)",  test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

function getStrength(password: string) {
  const passed = RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { level: 0, label: "Too weak",  color: "#ef4444" };
  if (passed === 2) return { level: 1, label: "Weak",     color: "#f97316" };
  if (passed === 3) return { level: 2, label: "Fair",     color: "#eab308" };
  if (passed === 4) return { level: 3, label: "Strong",   color: "#22c55e" };
  return             { level: 4, label: "Very strong", color: "#16a34a" };
}

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-surface focus:border-ring transition-all";

// ── Phase 1 — Registration form ───────────────────────────────────────────────

interface Phase1Props {
  onSuccess: (email: string) => void;
}

function RegistrationForm({ onSuccess }: Phase1Props) {
  const { register } = useAuth();
  const [agencyName, setAgencyName]   = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showStrength, setShowStrength] = useState(false);
  const [generated, setGenerated]       = useState(false);
  const [emailError, setEmailError]   = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const strength = getStrength(password);

  function validateEmail(v: string) {
    if (v && !isValidEmail(v)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await register(agencyName, email, password);
      if (result.pending) onSuccess(result.email);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Agency / business name
        </label>
        <input
          type="text"
          required
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          className={inputCls}
          placeholder="Acme Digital Agency"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
          onBlur={(e) => validateEmail(e.target.value)}
          className={cn(inputCls, emailError && "border-red-400 focus:ring-red-400")}
          placeholder="you@agency.com"
        />
        {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Password
          </label>
          <button
            type="button"
            onClick={() => {
              const pwd = generateStrongPassword();
              setPassword(pwd);
              setShowPassword(true);
              setShowStrength(true);
              setGenerated(true);
              setTimeout(() => setGenerated(false), 2000);
            }}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Wand2 size={11} />
            {generated ? "Copied!" : "Generate"}
          </button>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setShowStrength(true); }}
            className={cn(inputCls, "pr-10")}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {/* Strength meter */}
        {showStrength && password.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{
                    background: i <= strength.level ? strength.color : "#e2e8f0",
                  }}
                />
              ))}
            </div>
            <p className="text-xs font-medium" style={{ color: strength.color }}>
              {strength.label}
            </p>
            <div className="space-y-1">
              {RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                    {ok ? (
                      <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                    ) : (
                      <Circle size={11} className="text-muted-foreground shrink-0" />
                    )}
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        loading={loading}
        disabled={!!emailError}
        className="w-full h-11 rounded-xl text-sm font-bold mt-1"
      >
        Continue
      </Button>
    </form>
  );
}

// ── Phase 2 — OTP verification ────────────────────────────────────────────────

interface Phase2Props {
  email: string;
  onBack: () => void;
}

function VerifyEmailForm({ email, onBack }: Phase2Props) {
  const router = useRouter();
  const { verifyEmail, resendCode } = useAuth();
  const [code, setCode]             = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending]   = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
      router.replace("/onboarding");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Verification failed. Please check your code and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendCode(email);
      setResendCooldown(60);
      setError("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not resend code. Please try again.";
      setError(msg);
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">{email}</span>.
          Enter it below to activate your account.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Verification code
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={cn(inputCls, "text-center text-2xl font-bold tracking-[0.5em] py-4")}
          placeholder="000000"
          autoFocus
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        loading={loading}
        className="w-full h-11 rounded-xl text-sm font-bold"
      >
        Verify &amp; create account
      </Button>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={11} className={resending ? "animate-spin" : ""} />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [phase, setPhase]         = useState<"form" | "verify">("form");
  const [pendingEmail, setPending] = useState("");

  useEffect(() => {
    import("@/lib/auth").then(({ isLoggedIn }) => {
      if (isLoggedIn()) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8f9fb 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md"
            style={{ background: "var(--accent)" }}
          >
            <Camera size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {phase === "form" ? "Create account" : "Check your email"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {phase === "form"
              ? "Start monitoring your WordPress sites"
              : "Enter the code we emailed you"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-7 shadow-[0_4px_24px_0_rgb(0_0_0/0.08)]">
          {phase === "form" ? (
            <RegistrationForm
              onSuccess={(email) => {
                setPending(email);
                setPhase("verify");
              }}
            />
          ) : (
            <VerifyEmailForm
              email={pendingEmail}
              onBack={() => setPhase("form")}
            />
          )}

          {phase === "form" && (
            <p className="text-sm text-center text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
