"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
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
          <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            to BrandBees SnapshotAI
          </p>
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
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface focus:border-transparent transition-all"
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

            <Button
              type="submit"
              loading={loading}
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
