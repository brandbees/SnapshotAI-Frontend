"use client";
import {
  Zap, Shield, TrendingUp, FileText, Bell, Users, Globe, BarChart2,
} from "lucide-react";
import { useInView } from "./hooks";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  color: string;
  bg: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: TrendingUp,
    color: "#0ea5e9", bg: "#e0f2fe",
    title: "Performance Monitoring",
    desc:  "Track Core Web Vitals, page speed, and Lighthouse scores on every audit cycle automatically.",
  },
  {
    icon: Globe,
    color: "#8b5cf6", bg: "#ede9fe",
    title: "SEO Health Tracking",
    desc:  "Identify missing meta tags, broken links, thin content, and canonical issues before they hurt rankings.",
  },
  {
    icon: Shield,
    color: "#16a34a", bg: "#f0fdf4",
    title: "Security Scanning",
    desc:  "Detect file permission issues, login vulnerabilities, XML-RPC exploits, and hardening gaps.",
  },
  {
    icon: Zap,
    color: "#dc2626", bg: "#fef2f2",
    title: "Malware Detection",
    desc:  "Real-time scans for injected code, backdoors, and blacklisted URLs — with zero false positives.",
  },
  {
    icon: FileText,
    color: "#d97706", bg: "#fffbeb",
    title: "AI-Powered Reports",
    desc:  "Beautiful white-label PDF reports generated automatically with AI narratives and recommendations.",
  },
  {
    icon: Bell,
    color: "#ec4899", bg: "#fdf2f8",
    title: "Instant Alerts",
    desc:  "Get notified via email or Slack the moment a score drops or a threat is detected.",
  },
  {
    icon: BarChart2,
    color: "#0891b2", bg: "#ecfeff",
    title: "Score Trend History",
    desc:  "Visualize site health over time with gradient bar charts and pinpoint when things changed.",
  },
  {
    icon: Users,
    color: "#7c3aed", bg: "#f5f3ff",
    title: "Multi-Site Dashboard",
    desc:  "Manage hundreds of client WordPress sites from one clean, unified agency dashboard.",
  },
];

function FeatureCard({
  icon: Icon, color, bg, title, desc, index, inView,
}: Feature & { index: number; inView: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 70}ms`, transitionDuration: "600ms" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0"
        style={{ background: bg }}
      >
        <Icon size={19} style={{ color }} />
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export function FeaturesSection() {
  const { ref, inView } = useInView(0.08);

  return (
    <section id="features" className="py-24 bg-[#f8f9fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="text-center max-w-2xl mx-auto mb-16">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-500 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Everything you need
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 mb-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            One platform. Full coverage.
          </h2>
          <p
            className={`text-gray-500 text-lg transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Stop juggling tools. BrandBeesAI covers every dimension of WordPress site health
            so you can focus on growing your agency.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
