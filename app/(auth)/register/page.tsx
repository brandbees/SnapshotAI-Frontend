"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { cn, isValidEmail } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  useEffect(() => {
    import("@/lib/auth").then(({ isLoggedIn }) => {
      if (isLoggedIn()) router.replace("/dashboard");
    });
  }, [router]);

  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface focus:border-transparent transition-all";

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await register(agencyName, email, password, coupon || undefined);
      router.replace("/onboarding");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start monitoring client sites
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-7 shadow-[0_4px_24px_0_rgb(0_0_0/0.08)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Agency name
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
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@agency.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* Coupon */}
            <div>
              <button
                type="button"
                onClick={() => setShowCoupon(!showCoupon)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  size={13}
                  className={cn(
                    "transition-transform",
                    showCoupon && "rotate-180"
                  )}
                />
                Have a coupon code?
              </button>
              {showCoupon && (
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className={cn(inputCls, "mt-2")}
                  placeholder="COUPON-CODE"
                />
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
              className="w-full h-11 rounded-xl text-sm font-bold mt-1"
            >
              Create account
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
