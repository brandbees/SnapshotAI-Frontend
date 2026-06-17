"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import api from "@/lib/api";

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("No reset token found. Please use the link from your email.");
  }, [token]);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password))  s++;
    if (/[0-9]/.test(password))  s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength] ?? "";
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"][strength] ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      toast.success("Password reset! Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? "Failed to reset password. The link may have expired.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />

          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Lock size={18} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Reset your password</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Choose a new password for your account</p>
              </div>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
                <p className="text-sm font-semibold text-foreground">Password updated!</p>
                <p className="text-xs text-muted-foreground text-center">Redirecting you to login…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    New password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      className="w-full pr-10 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex-1 h-1 rounded-full transition-all"
                            style={{ background: i <= strength ? strengthColor : "#e5e7eb" }} />
                        ))}
                      </div>
                      <p className="text-[11px] font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                  />
                  {confirm && password !== confirm && (
                    <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
                >
                  {loading ? "Resetting…" : "Set new password"}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                    Back to login
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
