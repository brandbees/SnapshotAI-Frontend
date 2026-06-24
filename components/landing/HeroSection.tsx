"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Shield, TrendingUp, CheckCircle } from "lucide-react";

/* ── Mock Dashboard ──────────────────────────────────────────────────────── */

function MockDashboard() {
  const bars = [
    { label: "Performance", score: 84, color: "#16a34a" },
    { label: "SEO",         score: 91, color: "#16a34a" },
    { label: "Security",    score: 78, color: "#d97706" },
    { label: "Malware",     score: 96, color: "#16a34a" },
  ];

  return (
    <div className="relative">
      {/* Main card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-7 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              abc.com
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">Audit Report</p>
          </div>
          <span className="px-3 py-1.5 text-xs font-bold bg-green-50 text-green-600 rounded-full border border-green-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Clean
          </span>
        </div>

        <div className="flex items-center gap-5 mb-7">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center border border-green-200 shrink-0">
            <span className="text-5xl font-black text-green-600">87</span>
          </div>
          <div className="flex-1 space-y-3.5">
            {bars.map(({ label, score, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                </div>
                <span className="text-xs font-bold w-6 text-right" style={{ color }}>
                  {score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-50 pt-5">
          <p className="text-xs text-gray-400 mb-3">Score trend — Last 7 audits</p>
          <div className="flex items-end gap-1.5 h-16">
            {[55, 62, 59, 71, 74, 80, 87].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${h}%`, background: `hsl(206,${40 + i * 5}%,${72 - i * 7}%)` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge — top right */}
      <div className="absolute -top-6 -right-5 z-20 animate-float">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Shield size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">No threats found</p>
            <p className="text-xs text-gray-400">Just scanned · 2m ago</p>
          </div>
        </div>
      </div>

      {/* Floating badge — bottom left */}
      <div
        className="absolute -bottom-7 -left-5 z-20 animate-float"
        style={{ animationDelay: "1.8s" }}
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <TrendingUp size={18} className="text-sky-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">+12 pts this month</p>
            <p className="text-xs text-gray-400">Performance improved</p>
          </div>
        </div>
      </div>

      {/* Subtle shadow glow */}
      <div className="absolute inset-x-4 -bottom-8 h-14 bg-black/10 blur-xl rounded-full -z-10" />
    </div>
  );
}

/* ── Hero Section ────────────────────────────────────────────────────────── */

const PILLS = [
  "No setup hassle",
  "Auto-scheduled audits",
  "White-label reports",
  "AI recommendations",
];

export function HeroSection({ cms = {} }: { cms?: Record<string, string> }) {
  const c = (k: string, d: string) => cms[k] || d;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-white pt-24 pb-0 lg:pt-32">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pb-16 lg:pb-24">

          {/* ── Left: copy ── */}
          <div>
            {/* Eyebrow */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold mb-7 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              {c("eyebrow", "AI-Powered WordPress Monitoring for Agencies")}
            </div>

            {/* Headline */}
            <h1
              className={`text-5xl sm:text-6xl font-black text-gray-900 leading-[1.08] tracking-tight mb-6 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              {c("heading_line1", "Monitor every")}
              <br />
              <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
                {c("heading_highlight", "Client site")}
              </span>
              <br />
              {c("heading_line3", "like a pro.")}
            </h1>

            {/* Subtext */}
            <p
              className={`text-lg text-gray-500 leading-relaxed mb-8 max-w-lg transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              {c("subtitle", "Automatically score performance, catch malware, track SEO, and deliver stunning AI-powered reports — so you can focus on growing your agency.")}
            </p>

            {/* CTA buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-3 mb-10 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <Link
                href={c("cta_url", "/register")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-2"
              >
                {c("cta_label", "Start Free — No Card Needed")}
                <ArrowRight size={16} />
              </Link>
              <button className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
                <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
                  <Play size={9} className="ml-0.5 fill-sky-600 text-sky-600" />
                </div>
                {c("cta2_label", "Watch 2-min Demo")}
              </button>
            </div>

            {/* Feature pills */}
            <div
              className={`flex flex-wrap gap-2 mb-10 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              {PILLS.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                >
                  <CheckCircle size={11} className="text-sky-500 shrink-0" />
                  {f}
                </span>
              ))}
            </div>

            {/* Social proof */}
            <div
              className={`flex items-center gap-4 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "500ms" }}
            >
              <div className="flex -space-x-2.5">
                {(["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"] as const).map((bg, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ background: bg }}
                  >
                    {["A", "B", "C", "D", "E"][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  {c("social_proof", "Trusted by 240+ digital agencies")}
                </p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i} className="text-amber-400 text-xs leading-none">{s}</span>
                  ))}
                  <span className="text-gray-400 text-xs ml-1.5">4.9 / 5.0</span>
                </div>
              </div>
            </div>

            {/* Agency logos strip */}
            <div
              className={`mt-8 pt-7 border-t border-gray-100 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Used by agencies at
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {["PixelCraft", "ThornDigital", "Nair Studio", "WebForge", "CloudMind", "Apex Media"].map((name) => (
                  <span
                    key={name}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 shadow-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: mock dashboard ── */}
          <div
            className={`flex justify-center lg:justify-end transition-all duration-1000 ${
              visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="w-full max-w-[480px]">
              <MockDashboard />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom divider into next section */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </section>
  );
}
