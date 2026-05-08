"use client";
import {
  Shield, TrendingUp, FileText, Bell, Users,
  Globe, BarChart2, Activity, Layers, Package,
  UserCheck, ShieldCheck, HardDrive, ShoppingCart,
  Bot, Lock, Link2,
} from "lucide-react";
import { useInView } from "./hooks";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon:  LucideIcon;
  color: string;
  bg:    string;
  title: string;
  desc:  string;
}

/* ── Top 3 spotlight features ─────────────────────────────────────────────── */

const SPOTLIGHT: Feature[] = [
  {
    icon: TrendingUp,
    color: "#0ea5e9", bg: "#e0f2fe",
    title: "Performance Monitoring",
    desc: "Track Core Web Vitals, page speed, and Lighthouse scores automatically across every client site in your portfolio — on every audit cycle.",
  },
  {
    icon: Shield,
    color: "#16a34a", bg: "#f0fdf4",
    title: "Security Scanning",
    desc: "Detect file permission issues, login vulnerabilities, XML-RPC exploits, and hardening gaps before they become incidents that put you on the spot.",
  },
  {
    icon: FileText,
    color: "#d97706", bg: "#fffbeb",
    title: "AI-Powered Reports",
    desc: "Beautiful white-label PDF reports auto-generated with AI narratives, score breakdowns, and prioritized recommendations — delivered to clients automatically.",
  },
];

/* ── Secondary feature grid ───────────────────────────────────────────────── */

const FEATURES: Feature[] = [
  {
    icon: Globe,
    color: "#8b5cf6", bg: "#ede9fe",
    title: "SEO Health Tracking",
    desc: "Flag missing meta tags, broken links, thin content, and canonical issues before they hurt your client's search rankings.",
  },
  {
    icon: Activity,
    color: "#0891b2", bg: "#ecfeff",
    title: "Uptime Monitoring",
    desc: "Know the instant a client site goes down with real-time uptime checks and immediate downtime alerts via email or Slack.",
  },
  {
    icon: Bell,
    color: "#ec4899", bg: "#fdf2f8",
    title: "Instant Alerts",
    desc: "Get notified the moment a score drops, malware is detected, or a site goes offline — via email or Slack, your choice.",
  },
  {
    icon: ShieldCheck,
    color: "#7c3aed", bg: "#f5f3ff",
    title: "Malware Detection",
    desc: "Real-time scans for injected code, backdoors, and blacklisted URLs — across your entire client portfolio.",
  },
  {
    icon: Package,
    color: "#b45309", bg: "#fef3c7",
    title: "Plugin Vulnerability Scans",
    desc: "Automatically flag plugins with known CVEs, outdated versions, and abandoned maintenance — before they become attack vectors.",
  },
  {
    icon: Lock,
    color: "#0284c7", bg: "#e0f2fe",
    title: "SSL & Domain Expiry Alerts",
    desc: "Never let a client's SSL certificate or domain expire. Automated alerts fire at 30, 14, and 7 days before expiry.",
  },
  {
    icon: Link2,
    color: "#059669", bg: "#ecfdf5",
    title: "Broken Link Scanner",
    desc: "Weekly crawl across up to 50 pages per site, catching 404s and dead links before they tank SEO or embarrass your client.",
  },
  {
    icon: ShoppingCart,
    color: "#9333ea", bg: "#fdf4ff",
    title: "WooCommerce Monitoring",
    desc: "Track orders, revenue trends, failed payment rates, and avg order value for every client e-commerce site.",
  },
  {
    icon: HardDrive,
    color: "#dc2626", bg: "#fef2f2",
    title: "Automated Backups",
    desc: "Full database and file backups on your schedule, stored to your cloud storage. One-click restore whenever you need it.",
  },
  {
    icon: Package,
    color: "#16a34a", bg: "#f0fdf4",
    title: "Safe Plugin Updates",
    desc: "Update plugins from the dashboard with automatic pre-update snapshots and instant rollback if anything breaks after the update.",
  },
  {
    icon: Bot,
    color: "#0ea5e9", bg: "#e0f2fe",
    title: "AI Agent",
    desc: 'Ask your AI agent anything: "Which site has the lowest SEO score?" or "Send the May report to client@abc.com" — it acts.',
  },
  {
    icon: BarChart2,
    color: "#6366f1", bg: "#eef2ff",
    title: "Score Trend History",
    desc: "Visualize site health over time and pinpoint exactly when something changed — across any date range up to 12 months.",
  },
  {
    icon: Layers,
    color: "#0891b2", bg: "#ecfeff",
    title: "White-label Client Portal",
    desc: "Give each client a branded portal to review their site health. Your logo, your domain — SnapshotAI stays completely invisible.",
  },
  {
    icon: UserCheck,
    color: "#d97706", bg: "#fffbeb",
    title: "Team Management",
    desc: "Invite team members with role-based access. Owners, admins, managers, and analysts — everyone sees what they need.",
  },
  {
    icon: Users,
    color: "#8b5cf6", bg: "#ede9fe",
    title: "Multi-Site Dashboard",
    desc: "Manage hundreds of client WordPress sites from one clean, unified agency dashboard with portfolio-level health scoring.",
  },
];

/* ── Components ───────────────────────────────────────────────────────────── */

function SpotlightCard({
  icon: Icon, color, bg, title, desc, index, inView,
}: Feature & { index: number; inView: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 80}ms`, transitionDuration: "600ms" }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shrink-0"
        style={{ background: bg }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2.5">{title}</h3>
      <p className="text-base text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon, color, bg, title, desc, index, inView,
}: Feature & { index: number; inView: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${300 + index * 40}ms`, transitionDuration: "600ms" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0"
        style={{ background: bg }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export function FeaturesSection() {
  const { ref, inView } = useInView(0.05);

  return (
    <section id="features" className="py-24 bg-[#f8f9fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="text-center max-w-2xl mx-auto mb-14">
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
            Stop juggling tools. SnapshotAI covers every dimension of WordPress site management
            so you can focus on growing your agency.
          </p>
        </div>

        {/* Spotlight row — 3 primary features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          {SPOTLIGHT.map((f, i) => (
            <SpotlightCard key={f.title} {...f} index={i} inView={inView} />
          ))}
        </div>

        {/* Secondary features — 3-col grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
