"use client";
import Link from "next/link";
import { CheckCircle, ArrowRight, Bell, FileText } from "lucide-react";
import { useInView } from "./hooks";

/* ── Mock UI: White-label Report ─────────────────────────────────────────── */

function MockReport() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-white/90 text-xs font-bold tracking-widest uppercase mb-1">Your Agency</div>
          <div className="text-white/60 text-[10px]">Monthly Site Report — May 2026</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
          <FileText size={17} className="text-white" />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Overall Score</p>
            <p className="text-2xl font-black text-gray-900">87 / 100</p>
            <p className="text-xs text-green-600 font-semibold mt-0.5">↑ +4 from last month</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
            <span className="text-xl font-black text-green-600">A</span>
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          {[
            { l: "Performance", s: 84, c: "#16a34a" },
            { l: "SEO",         s: 91, c: "#16a34a" },
            { l: "Security",    s: 78, c: "#d97706" },
            { l: "Malware",     s: 96, c: "#16a34a" },
          ].map(({ l, s, c }) => (
            <div key={l} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0">{l}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s}%`, background: c }} />
              </div>
              <span className="text-xs font-bold w-6 text-right" style={{ color: c }}>{s}</span>
            </div>
          ))}
        </div>

        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-1.5">
            AI Recommendation
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Enable server-side caching to improve load times by an estimated 23%. We&apos;ve identified 3 additional quick wins.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Mock UI: Alert Feed ─────────────────────────────────────────────────── */

function MockAlerts() {
  const alerts = [
    { dot: "bg-red-500",    label: "Malware detected",      site: "clientsite.com",   time: "Just now",  urgent: true  },
    { dot: "bg-amber-400",  label: "Performance dropped",   site: "shop.example.com", time: "12 min ago",urgent: false },
    { dot: "bg-green-500",  label: "Audit complete — 91/100",site: "agencysite.io",   time: "1h ago",    urgent: false },
    { dot: "bg-amber-400",  label: "Plugin update needed",  site: "myshop.com",       time: "3h ago",    urgent: false },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">Alert Feed</p>
        <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold">
          1 urgent
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              a.urgent ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${a.urgent ? "text-red-700" : "text-gray-800"}`}>
                {a.label}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{a.site}</p>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">{a.time}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-gray-100">
        <Bell size={13} className="text-gray-400 shrink-0" />
        <p className="text-xs text-gray-500">
          Alerts → <span className="font-semibold text-gray-700">team@youragency.com</span> &amp; Slack
        </p>
      </div>
    </div>
  );
}

/* ── Spotlight 1: White-label reports ───────────────────────────────────── */

function Spotlight1() {
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text */}
          <div
            className={`transition-all duration-700 ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-semibold mb-5">
              White-label reports
            </span>
            <h2 className="text-4xl font-black text-gray-900 mb-5 leading-tight">
              Deliver reports your clients will actually read — with your brand on every page.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-6">
              Auto-generated PDF reports look like they came from a premium in-house team. Add your logo, brand colors, and custom domain. Clients see your agency — not ours.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Fully white-labeled — your logo, your colors, your domain",
                "AI-written narratives in plain, jargon-free English",
                "Score trends, recommendations, and prioritized next steps",
                "Delivered via secure client portal or direct email",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <span className="text-[15px] text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors group"
            >
              Get started for free
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Visual */}
          <div
            className={`transition-all duration-700 ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <MockReport />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Spotlight 2: Proactive alerts ───────────────────────────────────────── */

function Spotlight2() {
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Visual — left */}
          <div
            className={`order-2 lg:order-1 transition-all duration-700 ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <MockAlerts />
          </div>

          {/* Text — right */}
          <div
            className={`order-1 lg:order-2 transition-all duration-700 ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-semibold mb-5">
              Proactive monitoring
            </span>
            <h2 className="text-4xl font-black text-gray-900 mb-5 leading-tight">
              Know about issues before your clients ever notice them.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-6">
              Get instant alerts when a score drops, malware is detected, or a plugin has a vulnerability. You stay one step ahead — every single time.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Real-time malware and threat detection alerts",
                "Score-drop notifications via email or Slack",
                "Plugin vulnerability and update monitoring",
                "Uptime tracking with instant downtime alerts",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <span className="text-[15px] text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors group"
            >
              Start monitoring today
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SpotlightSection() {
  return (
    <>
      <Spotlight1 />
      <Spotlight2 />
    </>
  );
}
