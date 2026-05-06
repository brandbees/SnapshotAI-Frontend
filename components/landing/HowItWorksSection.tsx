"use client";
import { Download, Activity, FileDown } from "lucide-react";
import Link from "next/link";
import { useInView } from "./hooks";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: Download,
    title: "Install the Plugin",
    desc: "Drop our lightweight WordPress plugin on any client site in 2 clicks. It connects automatically — no API keys, no server config, no developer needed.",
    accent: "#7dd3fc",
  },
  {
    number: "02",
    icon: Activity,
    title: "Run Your First Audit",
    desc: "Trigger a manual audit instantly or set a weekly/daily schedule. Our engine scores performance, SEO, security, and malware in minutes.",
    accent: "#c4b5fd",
  },
  {
    number: "03",
    icon: FileDown,
    title: "Deliver the Report",
    desc: "Share a beautiful white-label PDF with your client automatically. They see results and data; you look like a premium service provider.",
    accent: "#6ee7b7",
  },
];

export function HowItWorksSection() {
  const { ref, inView } = useInView(0.12);

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-700 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
          <defs>
            <pattern id="grid-light" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-light)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="text-center max-w-2xl mx-auto mb-16">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-200 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Simple setup
          </p>
          <h2
            className={`text-4xl font-black text-white mb-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Up and running in 3 steps.
          </h2>
          <p
            className={`text-sky-100 text-lg transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            From zero to a full client site audit in under 5 minutes. No developer required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative mb-14">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[calc(16.6%+28px)] right-[calc(16.6%+28px)] h-px bg-white/20" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={`relative bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-sm transition-all duration-700 hover:bg-white/15 hover:-translate-y-1 ${
                  inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 relative z-10"
                  style={{ background: `${step.accent}20`, border: `1px solid ${step.accent}40` }}
                >
                  <Icon size={20} style={{ color: step.accent }} />
                </div>

                {/* Ghost step number */}
                <span
                  className="absolute top-4 right-5 text-5xl font-black opacity-[0.12] select-none leading-none text-white"
                >
                  {step.number}
                </span>

                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-sky-100 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "650ms" }}
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-sky-700 font-bold text-sm shadow-xl hover:bg-sky-50 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-sky-600"
          >
            Get started in 5 minutes
          </Link>
        </div>
      </div>
    </section>
  );
}
