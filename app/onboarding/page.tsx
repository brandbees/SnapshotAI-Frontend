"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Copy, Loader2, ArrowRight, SkipForward, Globe, LayoutDashboard, AlertCircle, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

const STEPS = ["Welcome", "Add site", "Install plugin", "First scan"];

// ── Step 1 — Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext, isIndividual }: { onNext: () => void; isIndividual: boolean }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
        style={{ background: "var(--accent)" }}
      >
        <Camera size={28} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to BrandBees SnapshotAI
        </h1>
        {isIndividual ? (
          <>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Keep your WordPress site healthy, secure, and fast — without
              needing to be a developer. We&apos;ll monitor your site around the
              clock and alert you before small issues become big problems.
            </p>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Let&apos;s connect your site now. It only takes a few minutes.
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitor your clients&apos; WordPress sites, catch threats early, and
              deliver beautiful audit reports — all from one dashboard.
            </p>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Let&apos;s get your first site set up. It only takes a few minutes.
            </p>
          </>
        )}
      </div>
      <Button
        onClick={onNext}
        className="px-8 h-11 rounded-xl font-bold text-sm flex items-center gap-2"
      >
        Get started <ArrowRight size={15} />
      </Button>
    </div>
  );
}

// ── Step 2 — Add site ─────────────────────────────────────────────────────────

interface NewSite {
  id: string;
  site_token: string;
  name: string;
  url: string;
}

function StepAddSite({ onNext, isIndividual }: { onNext: (site: NewSite) => void; isIndividual: boolean }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-surface focus:border-transparent transition-all";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<{ site: NewSite }>("/sites", { name, url });
      onNext(data.site);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to add site. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow"
          style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
        >
          <Globe size={20} style={{ color: "var(--accent)" }} />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {isIndividual ? "Add your site" : "Add your first client site"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isIndividual
            ? "Enter your WordPress site URL so we can start monitoring it."
            : "Enter the WordPress site you want to monitor for your client."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {isIndividual ? "Site name" : "Client site name"}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder={isIndividual ? "My Business Website" : "Acme Corp Website"}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Site URL
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
            placeholder={isIndividual ? "https://mybusiness.com" : "https://acme.com"}
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
          className="w-full h-11 rounded-xl font-bold text-sm mt-1"
        >
          {isIndividual ? "Add my site" : "Add site"}
        </Button>
      </form>
    </div>
  );
}

// ── Step 3 — Install plugin ────────────────────────────────────────────────────

function StepInstallPlugin({
  site,
  onConnected,
  onSkip,
  isIndividual,
}: {
  site: NewSite;
  onConnected: () => void;
  onSkip: () => void;
  isIndividual: boolean;
}) {
  const [copied, setCopied]         = useState(false);
  const [status, setStatus]         = useState<"waiting" | "checking" | "connected">("waiting");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnection = useCallback(async (manual = false) => {
    if (manual) setStatus("checking");
    try {
      const { data } = await api.get<{ plugin_connected: boolean }>(
        `/sites/${site.id}/connection-status`
      );
      if (data.plugin_connected) {
        setStatus("connected");
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(onConnected, 1200);
      } else if (manual) {
        setStatus("waiting");
      }
    } catch {
      if (manual) setStatus("waiting");
    }
  }, [site.id, onConnected]);

  useEffect(() => {
    pollRef.current = setInterval(() => checkConnection(false), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkConnection]);

  function copyToken() {
    navigator.clipboard.writeText(site.site_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "connected") {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "color-mix(in srgb, #22c55e 15%, transparent)" }}>
          <Check size={30} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Plugin connected!</h2>
          <p className="text-sm text-muted-foreground">
            Running your first audit on{" "}
            <span className="font-medium text-foreground">{site.name}</span>…
          </p>
        </div>
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">Install the plugin</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isIndividual
            ? <>Install the BrandBees plugin on your site <span className="font-medium text-foreground">{site.name}</span> — no coding required.</>
            : <>Install and activate the BrandBees plugin on <span className="font-medium text-foreground">{site.name}</span>, then paste your token.</>
          }
        </p>
      </div>

      <div className="space-y-3">
        {/* Plugin download */}
        <a
          href={`${API_BASE_URL}/plugin/download`}
          download="brandbees-snapshot.zip"
          className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 6%, transparent)" }}
        >
          <span>Download BrandBees Plugin (.zip)</span>
          <Download size={16} />
        </a>

        {/* Step instructions */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          {(isIndividual ? [
            "Log in to your WordPress dashboard (yoursite.com/wp-admin)",
            "Go to Plugins → Add New → Upload Plugin",
            "Upload the downloaded zip file and click Install Now",
            "Activate the plugin, then go to Settings → BrandBees Snapshot",
            "Paste your site token and click Save & Connect — that's it!",
          ] : [
            "In WordPress admin go to Plugins → Add New → Upload Plugin",
            "Upload the downloaded zip file and click Install Now",
            "Activate the plugin, then go to Settings → BrandBees Snapshot",
            "Paste your site token below and click Save & Connect",
          ]).map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span
                className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 text-white"
                style={{ background: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <span className="text-foreground leading-snug">{step}</span>
            </div>
          ))}
        </div>

        {/* Token copy */}
        <div className="bg-muted border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Your site token
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-foreground font-mono bg-surface border border-border rounded-lg px-3 py-2 truncate">
              {site.site_token}
            </code>
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-surface text-foreground hover:bg-muted transition-colors shrink-0"
            >
              {copied ? (
                <><Check size={12} className="text-green-500" /> Copied</>
              ) : (
                <><Copy size={12} /> Copy</>
              )}
            </button>
          </div>
        </div>

        {/* Manual check button — primary action after pasting token */}
        <button
          onClick={() => checkConnection(true)}
          disabled={status === "checking"}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold border-2 transition-colors disabled:opacity-60"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {status === "checking" ? (
            <><Loader2 size={15} className="animate-spin" /> Checking…</>
          ) : (
            <><Check size={15} /> I&apos;ve connected it — verify now</>
          )}
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse shrink-0" />
          Also checking automatically every 5 seconds
        </div>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <SkipForward size={13} />
          {isIndividual
            ? "Skip for now — I'll do this later"
            : "Skip for now — I'll connect later"}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 — First scan ───────────────────────────────────────────────────────

type ScanState = "scanning" | "slow" | "ready" | "failed";

const SLOW_THRESHOLD_MS = 90_000;

function StepFirstScan({
  site,
  onComplete,
}: {
  site: NewSite;
  onComplete: () => void;
}) {
  const [state, setState] = useState<ScanState>("scanning");
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAudit = useCallback(async () => {
    try {
      const { data } = await api.get<{ audits: { status: string }[] }>(`/sites/${site.id}`);
      const audits = data.audits ?? [];
      if (audits.some((a) => a.status === "completed")) {
        setState("ready");
        if (pollRef.current)    clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (audits.length > 0 && audits.every((a) => a.status === "failed")) {
        setState("failed");
        if (pollRef.current)    clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    } catch {
      // silently ignore poll errors
    }
  }, [site.id]);

  useEffect(() => {
    // The audit is already queued automatically when the site was created —
    // no need to fire another one here.
    pollRef.current    = setInterval(checkAudit, 3000);
    timeoutRef.current = setTimeout(() => setState("slow"), SLOW_THRESHOLD_MS);
    return () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkAudit]);

  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-sm mx-auto">
      {state === "ready" && (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "color-mix(in srgb, #22c55e 15%, transparent)" }}
          >
            <Check size={28} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Your first report is ready!
            </h2>
            <p className="text-sm text-muted-foreground">
              Head to your dashboard to see the full audit results for{" "}
              <span className="font-medium text-foreground">{site.name}</span>.
            </p>
          </div>
          <Button
            onClick={onComplete}
            className="px-8 h-11 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <LayoutDashboard size={15} /> Go to dashboard
          </Button>
        </>
      )}

      {state === "failed" && (
        <>
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center shadow-lg">
            <AlertCircle size={28} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Audit couldn&apos;t complete
            </h2>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t reach{" "}
              <span className="font-medium text-foreground">{site.name}</span> right now.
              You can run a manual audit from your dashboard once the site is live.
            </p>
          </div>
          <Button
            onClick={onComplete}
            className="px-8 h-11 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <LayoutDashboard size={15} /> Go to dashboard
          </Button>
        </>
      )}

      {(state === "scanning" || state === "slow") && (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
          >
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Running your first audit…
            </h2>
            <p className="text-sm text-muted-foreground">
              We&apos;re scanning{" "}
              <span className="font-medium text-foreground">{site.name}</span>.
              {state === "slow"
                ? " This is taking a little longer than usual."
                : " This usually takes 30–60 seconds."}
            </p>
          </div>

          {state === "scanning" && (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {state === "slow" && (
            <Button
              onClick={onComplete}
              className="px-8 h-11 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <LayoutDashboard size={15} /> Go to dashboard
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { agency, updateAgency } = useAuth();
  const [step, setStep] = useState(0);
  const [site, setSite] = useState<NewSite | null>(null);
  const isIndividual = agency?.account_type === "individual";

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  async function markComplete() {
    try {
      await api.patch("/auth/complete-onboarding");
      updateAgency({ onboarding_complete: true });
    } catch {
      // proceed anyway
    }
    router.replace("/dashboard");
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8f9fb 100%)" }}
    >
      {/* Header */}
      <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center px-6 gap-3 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <Camera size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">BrandBees SnapshotAI</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%`, background: "var(--accent)" }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-center gap-0 pt-6 px-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? "bg-green-500 text-white shadow-sm"
                    : i === step
                    ? "text-white shadow-md scale-110"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
                style={i === step ? { background: "var(--accent)" } : {}}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span
                className={`text-xs leading-tight text-center max-w-[64px] ${
                  i === step
                    ? "font-semibold text-foreground"
                    : i < step
                    ? "font-medium text-green-600"
                    : "font-medium text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-10 sm:w-16 h-px mx-2 mb-6 transition-colors ${
                  i < step ? "bg-green-400" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-8 shadow-[0_4px_32px_0_rgb(0_0_0/0.08)]">
          {step === 0 && <StepWelcome onNext={() => setStep(1)} isIndividual={isIndividual} />}
          {step === 1 && (
            <StepAddSite
              isIndividual={isIndividual}
              onNext={(newSite) => {
                setSite(newSite);
                setStep(2);
              }}
            />
          )}
          {step === 2 && site && (
            <StepInstallPlugin
              site={site}
              isIndividual={isIndividual}
              onConnected={() => setStep(3)}
              onSkip={markComplete}
            />
          )}
          {step === 3 && site && (
            <StepFirstScan site={site} onComplete={markComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
