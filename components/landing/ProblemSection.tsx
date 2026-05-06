"use client";
import { Clock, AlertOctagon, BarChart3 } from "lucide-react";
import { useInView } from "./hooks";

const PAINS = [
  {
    icon: Clock,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    title: "Reporting eats your billable hours",
    desc: "You spend hours every month manually checking sites, writing reports, and formatting PDFs for clients. That's time you could spend on strategy, new business, or actual billable work.",
  },
  {
    icon: AlertOctagon,
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    title: "Issues blindside you — and your clients blame you",
    desc: "A site gets infected, tanks in Google, or goes down at 2am. You had no warning. No data. Now you're scrambling to explain what happened instead of preventing it.",
  },
  {
    icon: BarChart3,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    title: "Hard to prove the value you're delivering",
    desc: "Without reports and data, clients don't see the maintenance work happening behind the scenes. Retention becomes a hard conversation instead of an easy one.",
  },
];

export function ProblemSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="max-w-2xl mx-auto text-center mb-14">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-600 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Sound familiar?
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 mb-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            The WordPress agency struggle is real.
          </h2>
          <p
            className={`text-gray-500 text-lg transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Managing client WordPress sites at scale is harder than it looks. Here&apos;s what agencies tell us every day.
          </p>
        </div>

        {/* Pain cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {PAINS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className={`rounded-2xl border p-6 transition-all duration-700 hover:shadow-md hover:-translate-y-0.5 ${
                  inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{
                  background: p.bg,
                  borderColor: p.border,
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${p.color}18` }}
                >
                  <Icon size={19} style={{ color: p.color }} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Solution teaser */}
        <div
          className={`text-center transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-sky-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
            <p className="text-sm font-semibold text-gray-800">
              Snapshot AI solves all of this — automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
