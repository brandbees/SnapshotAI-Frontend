"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { _subscribe, _answer, ConfirmOptions } from "@/lib/confirm";

export function ConfirmDialog() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => _subscribe(setOpts), []);

  useEffect(() => {
    if (opts) {
      requestAnimationFrame(() => setVisible(true));
      confirmBtnRef.current?.focus();
    } else {
      setVisible(false);
    }
  }, [opts]);

  useEffect(() => {
    if (!opts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") _answer(false);
      if (e.key === "Enter") _answer(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts]);

  if (!opts) return null;

  const isDanger = opts.danger ?? false;
  const accent   = isDanger ? "#ef4444" : "var(--accent, #f59e0b)";
  const accentBg = isDanger ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={() => _answer(false)}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(12px)",
        }}
      >
        {/* Top color strip */}
        <div className="h-1 w-full" style={{ background: accent }} />

        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: accentBg }}
            >
              {isDanger
                ? <Trash2 size={18} style={{ color: accent }} />
                : <AlertTriangle size={18} style={{ color: accent }} />
              }
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-base font-bold text-foreground leading-snug">
                {opts.title}
              </p>
              {opts.description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {opts.description}
                </p>
              )}
            </div>
          </div>

          {/* Hint */}
          <p className="text-[11px] text-muted-foreground/60 mb-5">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd> to cancel
          </p>

          {/* Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={() => _answer(false)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              {opts.cancelLabel ?? "Cancel"}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={() => _answer(true)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: accent }}
            >
              {opts.confirmLabel ?? (isDanger ? "Delete" : "Confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
