"use client";
import { X, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useInView } from "./hooks";

const BEFORE = [
  "Manual site checks eating 10+ hours a month",
  "Clients blame you when things break without warning",
  "Copy-pasting data into Word docs for client reports",
  "No proof of the maintenance work you're delivering",
  "Missed malware infections until an angry client calls",
  "Juggling 5 different tools just for one site audit",
];

const AFTER = [
  "Automated audits on every site, every week",
  "Instant alerts before your client ever notices a problem",
  "Beautiful white-label PDF reports — auto-generated",
  "Score trends that prove the value you deliver monthly",
  "Real-time malware scanning across your entire portfolio",
  "One dashboard: security, SEO, performance, reports",
];

export function ProblemSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="max-w-2xl mx-auto text-center mb-16">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-600 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Sound familiar?
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 mb-4 leading-tight transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Stop juggling outdated tools.
            <br />
            <span className="text-sky-500">Start running on real infrastructure.</span>
          </h2>
          <p
            className={`text-gray-500 text-lg transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Here&apos;s what managing WordPress sites looks like before and after SnapshotAI.
          </p>
        </div>

        {/* Before / After comparison */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-gray-200 shadow-lg transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "250ms" }}
        >
          {/* Before column */}
          <div className="bg-slate-50 border-b md:border-b-0 md:border-r border-gray-200 p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <X size={15} className="text-red-500" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-none">Without SnapshotAI</h3>
                <p className="text-xs text-gray-400 mt-0.5">The old way</p>
              </div>
            </div>
            <ul className="space-y-4">
              {BEFORE.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                    <X size={9} className="text-red-400" strokeWidth={3} />
                  </div>
                  <span className="text-[15px] text-gray-500 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* After column */}
          <div className="bg-white p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle size={15} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-none">With SnapshotAI</h3>
                <p className="text-xs text-gray-400 mt-0.5">The new way</p>
              </div>
            </div>
            <ul className="space-y-4">
              {AFTER.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <span className="text-[15px] text-gray-700 leading-relaxed font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-7 border-t border-gray-100">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors group"
              >
                Make the switch — free for 14 days
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
