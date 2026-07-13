"use client";

/**
 * Token top-up return page (opened in a NEW TAB from the Agent screen).
 *
 * Flow: Stripe redirects here after payment → we verify the session (which credits
 * the tokens idempotently) → notify the Agent tab via BroadcastChannel + a
 * localStorage ping (belt-and-suspenders; window.opener is unreliable after the
 * Stripe redirect) → self-close. The Agent tab updates its balance in place, so
 * the chat is never lost.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

type Phase = "verifying" | "success" | "cancelled" | "error";

const CHANNEL = "bbss-tokens";
const LS_KEY  = "bbss-topup-signal";

function notifyOpener(payload: Record<string, unknown>) {
  // Primary: BroadcastChannel (same-origin, cross-tab, opener-independent).
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(payload);
    bc.close();
  } catch { /* older browsers */ }
  // Fallback: localStorage write fires a `storage` event in other tabs.
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, _t: Date.now() }));
  } catch { /* ignore */ }
}

function CheckoutTokensInner() {
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [tokensExtra, setTokensExtra] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = params.get("session_id");
    const cancelled = params.get("cancelled");

    if (cancelled) {
      notifyOpener({ type: "topup-cancelled" });
      setPhase("cancelled");
      setTimeout(() => window.close(), 1200);
      return;
    }
    if (!sessionId) {
      setPhase("error");
      return;
    }

    let done = false;
    api.post<{ type: string; tokens_extra?: number }>("/billing/verify-session", { session_id: sessionId })
      .then(({ data }) => {
        done = true;
        setTokensExtra(data.tokens_extra ?? null);
        notifyOpener({ type: "topup-success", tokens_extra: data.tokens_extra ?? null });
        setPhase("success");
        // Give the opener a moment to receive the message, then close the tab.
        setTimeout(() => window.close(), 1400);
      })
      .catch(() => {
        if (done) return;
        // Even on verify failure the webhook will credit shortly — tell the opener to refresh.
        notifyOpener({ type: "topup-success", tokens_extra: null });
        setPhase("error");
      });
  }, [params]);

  const wrap = "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6";
  const card = "w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-8 text-center";

  return (
    <div className={wrap}>
      <div className={card}>
        {phase === "verifying" && (
          <>
            <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={32} />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Confirming your payment…</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This only takes a second.</p>
          </>
        )}
        {phase === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={32} />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Tokens added!</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {tokensExtra != null ? `Your balance is topped up.` : `Your balance is updating.`} You can close this tab and continue your chat.
            </p>
            <button onClick={() => window.close()}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline">Close this tab</button>
          </>
        )}
        {phase === "cancelled" && (
          <>
            <XCircle className="mx-auto mb-4 text-gray-400" size={32} />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Payment cancelled</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No charge was made. You can close this tab.</p>
            <button onClick={() => window.close()}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline">Close this tab</button>
          </>
        )}
        {phase === "error" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={32} />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Payment received</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your tokens are being applied and will appear in your chat tab shortly. You can close this tab.
            </p>
            <button onClick={() => window.close()}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline">Close this tab</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutTokensPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutTokensInner />
    </Suspense>
  );
}
