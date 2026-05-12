"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const DISMISSED_KEY = "bb_trial_banner_dismissed";

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

export function TrialBanner() {
  const { agency } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  if (!agency?.trial_ends_at) return null;

  const days = getDaysRemaining(agency.trial_ends_at);
  const isExpired = days === 0;

  if (!isExpired && dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  if (isExpired) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium text-white bg-red-600">
        <span>
          Your trial has ended. Add a payment method to continue using SnapshotAI.
        </span>
        <Link
          href="/billing"
          className="underline underline-offset-2 font-semibold hover:no-underline shrink-0"
        >
          Add payment method
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
      style={{ background: "var(--trial-bg)", color: "var(--trial-text)" }}
    >
      <span>
        You have{" "}
        <strong>
          {days} day{days !== 1 ? "s" : ""}
        </strong>{" "}
        left in your free trial.
      </span>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/billing"
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Upgrade Now
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="p-0.5 rounded hover:opacity-70 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
