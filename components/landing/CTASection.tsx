"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useInView } from "./hooks";

export function CTASection() {
  const { ref, inView } = useInView(0.2);

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-600 to-indigo-700 px-8 py-16 sm:px-16 text-center transition-all duration-700 ${
            inView ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/[0.04] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/[0.08] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-200 mb-4">
              Start today — it&apos;s free
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
              Ready to make site monitoring
              <br />a competitive advantage?
            </h2>
            <p className="text-sky-100 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Join 240+ agencies using Snapshot AI to automate audits, impress clients, and protect every WordPress site they manage.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-sky-700 font-bold text-sm shadow-xl hover:bg-sky-50 transition-all hover:-translate-y-0.5"
              >
                Start Free — No Card Needed
                <ArrowRight size={16} />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/25 bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-all"
              >
                Compare Plans
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 text-sky-100">
              {["14-day free trial", "No credit card required", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm">
                  <CheckCircle size={14} className="text-sky-300 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
