"use client";

/**
 * Token top-up modal for the Agent screen.
 *
 * Opens Stripe checkout in a NEW TAB (source=agent) so the chat stays mounted and
 * intact. The checkout success page notifies this tab via BroadcastChannel; the
 * parent (Agent page) handles that signal, refreshes the balance, and closes this
 * modal. Here we just present packages, launch checkout, and show a waiting state.
 */

import { useEffect, useState } from "react";
import { X, Zap, Loader2, ExternalLink } from "lucide-react";
import api from "@/lib/api";

interface TokenPackage {
  tokens:      number;
  price_cents: number;
  label:       string;
}

const fmtTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n));
const fmtPrice  = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export function TokenTopupModal({
  onClose,
  outOfCredits,
}: {
  onClose: () => void;
  outOfCredits?: boolean;
}) {
  const [packages, setPackages] = useState<Record<string, TokenPackage>>({});
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ packages: Record<string, TokenPackage> }>("/billing/tokens/packages")
      .then(({ data }) => setPackages(data.packages || {}))
      .catch(() => setErr("Could not load token packages. Please try again."))
      .finally(() => setLoadingPkgs(false));
  }, []);

  async function buy(pkgKey: string) {
    setLaunching(pkgKey);
    setErr(null);
    try {
      const { data } = await api.post<{ url: string }>("/billing/tokens/checkout", {
        package: pkgKey,
        source: "agent",
      });
      // Open checkout in a new tab so the chat tab is never navigated away from.
      const tab = window.open(data.url, "_blank", "noopener");
      if (!tab) {
        setErr("Your browser blocked the checkout tab. Please allow pop-ups and try again.");
        setLaunching(null);
        return;
      }
      setWaiting(true);
    } catch {
      setErr("Failed to start checkout. Please try again.");
    } finally {
      setLaunching(null);
    }
  }

  const entries = Object.entries(packages).sort((a, b) => a[1].tokens - b[1].tokens);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Zap size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {outOfCredits ? "You're out of tokens" : "Top up AI tokens"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {outOfCredits
                  ? "Add tokens to continue this chat — your conversation stays exactly as it is."
                  : "Tokens never expire. Checkout opens in a new tab; your chat stays intact."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {waiting ? (
            <div className="text-center py-6">
              <Loader2 size={28} className="mx-auto mb-3 animate-spin text-accent" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Waiting for your payment…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete checkout in the new tab. Your tokens appear here automatically — no refresh needed.
              </p>
              <button
                onClick={() => setWaiting(false)}
                className="mt-4 text-xs font-medium text-accent hover:underline"
              >
                Choose a different package
              </button>
            </div>
          ) : loadingPkgs ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-2.5">
                {entries.map(([key, pkg]) => (
                  <button
                    key={key}
                    onClick={() => buy(key)}
                    disabled={launching !== null}
                    className="flex items-center justify-between rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors px-4 py-3 text-left disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {fmtTokens(pkg.tokens)} tokens
                      </p>
                      <p className="text-xs text-muted-foreground">{pkg.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {fmtPrice(pkg.price_cents)}
                      </span>
                      {launching === key ? (
                        <Loader2 size={14} className="animate-spin text-accent" />
                      ) : (
                        <ExternalLink size={13} className="text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {entries.length === 0 && !err && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No token packages are available right now.
                </p>
              )}
            </>
          )}

          {err && <p className="mt-3 text-xs text-destructive text-center">{err}</p>}
        </div>
      </div>
    </div>
  );
}
