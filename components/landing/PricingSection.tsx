"use client";
import { CheckCircle, XCircle, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useInView } from "./hooks";

interface Feature { text: string; included: boolean }

interface Plan {
  name:      string;
  price:     number;
  period?:   string;
  desc:      string;
  badge:     string | null;
  features:  Feature[];
  cta:       string;
  ctaHref:   string;
  highlight: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: 0,
    desc: "Perfect for freelancers dipping their toes in.",
    badge: null,
    highlight: false,
    cta: "Get Started Free",
    ctaHref: "/register",
    features: [
      { text: "1 WordPress site",            included: true  },
      { text: "Manual audits only",          included: true  },
      { text: "Performance & SEO scores",    included: true  },
      { text: "Security scanning",           included: true  },
      { text: "Uptime monitoring",           included: true  },
      { text: "Malware detection",           included: false },
      { text: "PDF report generator",        included: false },
      { text: "Scheduled auto-audits",       included: false },
      { text: "White-label branding",        included: false },
      { text: "AI narratives",               included: false },
    ],
  },
  {
    name: "Pro",
    price: 49,
    period: "/mo",
    desc: "For agencies managing multiple client WordPress sites.",
    badge: "Most Popular",
    highlight: true,
    cta: "Start 14-day Trial",
    ctaHref: "/register?plan=pro",
    features: [
      { text: "Up to 10 sites",              included: true  },
      { text: "Manual & scheduled audits",   included: true  },
      { text: "All 4 pillar scores",         included: true  },
      { text: "Security scanning",           included: true  },
      { text: "Uptime monitoring",           included: true  },
      { text: "Malware detection",           included: true  },
      { text: "PDF report generator",        included: true  },
      { text: "Weekly auto-audits",          included: true  },
      { text: "White-label branding",        included: false },
      { text: "AI narratives & recs",        included: true  },
    ],
  },
  {
    name: "Agency+",
    price: 129,
    period: "/mo",
    desc: "Unlimited scale with full white-label power.",
    badge: null,
    highlight: false,
    cta: "Contact Sales",
    ctaHref: "/register?plan=agency",
    features: [
      { text: "Unlimited sites",             included: true },
      { text: "All audit types",             included: true },
      { text: "All 4 pillar scores",         included: true },
      { text: "Advanced security scans",     included: true },
      { text: "Uptime monitoring",           included: true },
      { text: "Priority malware detection",  included: true },
      { text: "PDF + client portal",         included: true },
      { text: "Daily auto-audits",           included: true },
      { text: "Full white-label branding",   included: true },
      { text: "AI narratives & recs",        included: true },
    ],
  },
];

function PlanCard({ plan, index, inView }: { plan: Plan; index: number; inView: boolean }) {
  return (
    <div
      className={`relative rounded-3xl overflow-hidden transition-all duration-700 ${
        plan.highlight
          ? "shadow-2xl shadow-sky-500/20 ring-1 ring-sky-400/40 md:scale-[1.04] md:-translate-y-1"
          : "shadow-md shadow-gray-200/80 border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 bg-white"
      } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute top-5 right-5 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[11px] font-bold shadow">
            <Zap size={10} fill="white" />
            {plan.badge}
          </span>
        </div>
      )}

      {/* Card header */}
      {plan.highlight ? (
        <div className="bg-gradient-to-br from-sky-500 via-sky-500 to-indigo-600 px-8 pt-9 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-200 mb-3">{plan.name}</p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-6xl font-black text-white leading-none">${plan.price}</span>
            {plan.period && (
              <span className="text-base text-sky-200">{plan.period}</span>
            )}
          </div>
          <p className="text-base text-sky-100 leading-snug">{plan.desc}</p>
        </div>
      ) : (
        <div className="px-8 pt-9 pb-8 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{plan.name}</p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-6xl font-black text-gray-900 leading-none">${plan.price}</span>
            {plan.period && (
              <span className="text-base text-gray-500">{plan.period}</span>
            )}
          </div>
          <p className="text-base text-gray-500 leading-snug">{plan.desc}</p>
        </div>
      )}

      {/* CTA + features */}
      <div className={`px-8 py-8 ${plan.highlight ? "bg-white" : ""}`}>
        <Link
          href={plan.ctaHref}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold transition-all mb-8 ${
            plan.highlight
              ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30 hover:-translate-y-0.5"
              : "bg-gray-900 hover:bg-gray-800 text-white hover:-translate-y-0.5"
          }`}
        >
          {plan.cta}
          <ArrowRight size={16} />
        </Link>

        <ul className="space-y-4">
          {plan.features.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              {f.included ? (
                <CheckCircle size={17} className={plan.highlight ? "text-sky-500 shrink-0" : "text-green-500 shrink-0"} />
              ) : (
                <XCircle size={17} className="text-gray-200 shrink-0" />
              )}
              <span
                className={`text-[15px] ${
                  f.included
                    ? "text-gray-700 font-medium"
                    : "text-gray-400 line-through"
                }`}
              >
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PricingSection() {
  const { ref, inView } = useInView(0.08);

  return (
    <section id="pricing" className="py-24 bg-[#f8f9fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="text-center max-w-2xl mx-auto mb-16">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-500 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Simple pricing
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 mb-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Plans that scale with you.
          </h2>
          <p
            className={`text-gray-500 text-lg transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Start free, upgrade when you&apos;re ready. No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} inView={inView} />
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          All paid plans include a 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
