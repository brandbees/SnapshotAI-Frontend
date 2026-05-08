"use client";
import { Download, Activity, FileDown, CheckCircle, ArrowRight, Cpu, Plug, BarChart3, Send } from "lucide-react";
import Link from "next/link";
import { useInView } from "./hooks";

/* ── Step visual mockups ──────────────────────────────────────────────────── */

function PluginMockup() {
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-400/25 flex items-center justify-center">
            <Plug size={12} className="text-sky-200" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white">SnapshotAI Monitor</p>
            <p className="text-[9px] text-white/40">WordPress Plugin · v1.2</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-green-400/20 text-green-300 text-[9px] font-bold border border-green-400/20">
          Active
        </span>
      </div>
      <div className="h-px bg-white/10 mb-3" />
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-white/50">Connected to SnapshotAI · 2s ago</span>
      </div>
    </div>
  );
}

function AuditMockup() {
  const bars = [
    { l: "Performance", s: 84, c: "#7dd3fc" },
    { l: "Security",    s: 91, c: "#6ee7b7" },
    { l: "SEO",         s: 78, c: "#c4b5fd" },
    { l: "Malware",     s: 97, c: "#6ee7b7" },
  ];
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-white">Audit complete</p>
        <span className="text-[9px] text-white/40">abc.com · just now</span>
      </div>
      <div className="space-y-2">
        {bars.map(({ l, s, c }) => (
          <div key={l} className="flex items-center gap-2">
            <span className="text-[9px] text-white/40 w-16 shrink-0">{l}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s}%`, background: c }} />
            </div>
            <span className="text-[9px] font-bold w-4 text-right" style={{ color: c }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportMockup() {
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-5 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-400/25 flex items-center justify-center">
          <Send size={12} className="text-emerald-200" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-white">Report sent to client</p>
          <p className="text-[9px] text-white/40">client@abc.com</p>
        </div>
      </div>
      <div className="bg-white/8 border border-white/10 rounded-lg p-2.5">
        <p className="text-[9px] font-semibold text-white/70 mb-1">May 2026 — Site Health Report</p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-green-300">87 / 100</span>
          <span className="text-[9px] text-white/30">↑ +4 from April</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <CheckCircle size={10} className="text-green-400" />
        <span className="text-[9px] text-white/40">Opened by client · 3 min ago</span>
      </div>
    </div>
  );
}

/* ── Step data ────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    number: "01",
    icon: Download,
    mockup: PluginMockup,
    title: "Install the Plugin",
    desc: "Drop our lightweight WordPress plugin on any client site in 2 clicks. It connects automatically — no API keys, no server config, no developer needed.",
    accent: "#7dd3fc",
  },
  {
    number: "02",
    icon: Activity,
    mockup: AuditMockup,
    title: "Run Your First Audit",
    desc: "Trigger a manual audit instantly or set a weekly/daily schedule. Our engine scores performance, SEO, security, and malware in minutes.",
    accent: "#c4b5fd",
  },
  {
    number: "03",
    icon: FileDown,
    mockup: ReportMockup,
    title: "Deliver the Report",
    desc: "Share a beautiful white-label PDF with your client automatically. They see results and data; you look like a premium service provider.",
    accent: "#6ee7b7",
  },
];

/* ── System flow diagram ──────────────────────────────────────────────────── */

const FLOW_NODES = [
  { icon: Plug,     label: "WP Plugin",     sub: "Installed on site" },
  { icon: Cpu,      label: "AI Engine",     sub: "Scans & scores"    },
  { icon: BarChart3,label: "Dashboard",     sub: "Real-time view"    },
  { icon: Send,     label: "Client Report", sub: "Auto-delivered"    },
];

function SystemFlowDiagram({ inView }: { inView: boolean }) {
  return (
    <div
      className={`mt-16 transition-all duration-700 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: "700ms" }}
    >
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-white/40 mb-6">
        How data flows through SnapshotAI
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-0">
        {FLOW_NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={i} className="flex items-center">
              {/* Node */}
              <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl bg-white/8 border border-white/15 min-w-[110px] text-center">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon size={18} className="text-sky-200" />
                </div>
                <p className="text-xs font-bold text-white leading-none">{node.label}</p>
                <p className="text-[9px] text-white/40 leading-none">{node.sub}</p>
              </div>
              {/* Arrow connector (not after last) */}
              {i < FLOW_NODES.length - 1 && (
                <div className="flex items-center px-2">
                  <div className="hidden sm:flex items-center gap-1 text-white/20">
                    <div className="w-6 h-px bg-white/20" />
                    <ArrowRight size={12} className="text-white/30 -ml-1" />
                  </div>
                  <div className="sm:hidden flex flex-col items-center py-1">
                    <div className="w-px h-4 bg-white/20" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main section ─────────────────────────────────────────────────────────── */

export function HowItWorksSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
          <defs>
            <pattern id="grid-light" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-light)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-[52px] left-[calc(16.6%+28px)] right-[calc(16.6%+28px)] h-px bg-white/15" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const Mockup = step.mockup;
            return (
              <div
                key={i}
                className={`relative bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-sm transition-all duration-700 hover:bg-white/15 hover:-translate-y-1 ${
                  inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                {/* Step icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 relative z-10"
                  style={{ background: `${step.accent}20`, border: `1px solid ${step.accent}40` }}
                >
                  <Icon size={20} style={{ color: step.accent }} />
                </div>

                {/* Ghost step number */}
                <span className="absolute top-4 right-5 text-5xl font-black opacity-[0.1] select-none leading-none text-white">
                  {step.number}
                </span>

                {/* Visual mockup */}
                <Mockup />

                <h3 className="text-lg font-bold text-white mb-2.5">{step.title}</h3>
                <p className="text-base text-sky-100 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* System flow diagram */}
        <SystemFlowDiagram inView={inView} />

        {/* CTA */}
        <div
          className={`text-center mt-14 transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "850ms" }}
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-sky-700 font-bold text-sm shadow-xl hover:bg-sky-50 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-sky-600"
          >
            Get started in 5 minutes
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
