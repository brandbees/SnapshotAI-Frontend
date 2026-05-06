"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Zap, Clock } from "lucide-react";

export function OfferPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("offer-dismissed")) return;
    const t = setTimeout(() => setOpen(true), 4500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem("offer-dismissed", "1");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={dismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Gradient top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

        <div className="p-6 pt-5">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>

          {/* Icon + badge */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Zap size={22} className="text-white" fill="white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold mb-1">
                <Clock size={10} />
                Limited Time Offer
              </span>
              <p className="text-xs text-gray-400">Launch special · Ends soon</p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2">
            Get 30% off your first 3 months
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            Sign up today and lock in 30% off any paid plan for 3 months. Join 240+ agencies already monitoring smarter.
          </p>

          {/* Promo code box */}
          <div className="flex items-center gap-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-3 mb-5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Promo code</p>
              <p className="text-lg font-black text-gray-900 tracking-[0.15em]">LAUNCH30</p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText("LAUNCH30")}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 text-xs font-semibold border border-sky-200 hover:bg-sky-100 transition-colors"
            >
              Copy
            </button>
          </div>

          <Link
            href="/register"
            onClick={dismiss}
            className="block text-center px-5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all mb-3"
          >
            Claim Offer — Start Free →
          </Link>

          <button
            onClick={dismiss}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            No thanks, I'll pay full price
          </button>
        </div>
      </div>
    </div>
  );
}
