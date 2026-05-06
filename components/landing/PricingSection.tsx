"use client";
import { CheckCircle, XCircle, Zap } from "lucide-react";
import Link from "next/link";
import { useInView } from "./hooks";

interface Feature { text: string; included: boolean }

interface Plan {
  name: string;
  price: number;
  period?: string;
  desc: string;
  badge: string | null;
  features: Feature[];
  cta: string;
  ctaHref: string;
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
      { text: "Manual audits only",           included: true  },
      { text: "Performance & SEO scores",     included: true  },
      { text: "Security scanning",            included: true  },
      { text: "Malware detection",            included: false },
      { text: "PDF report generator",         included: false },
      { text: "Scheduled auto-audits",        included: false },
      { text: "White-label branding",         included: false },
      { text: "AI narratives",                included: false },
    ],
  },
  {
    name: "Pro",
    price: 49,
    period: "/mo",
    desc: "For agencies managing multiple client sites.",
    badge: "Most Popular",
    highlight: true,
    cta: "Start 14-day Trial",
    ctaHref: "/register?plan=pro",
    features: [
      { text: "Up to 10 sites",               included: true  },
      { text: "Manual & scheduled audits",    included: true  },
      { text: "All 4 pillar scores",          included: true  },
      { text: "Security scanning",            included: true  },
      { text: "Malware detection",            included: true  },
      { text: "PDF report generator",         included: true  },
      { text: "Weekly auto-audits",           included: true  },
      { text: "White-label branding",         included: false },
      { text: "AI narratives & recs",         included: true  },
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
      { text: "Unlimited sites",              included: true },
      { text: "All audit types",              included: true },
      { text: "All 4 pillar scores",          included: true },
      { text: "Advanced security scans",      included: true },
      { text: "Priority malware detection",   included: true },
      { text: "PDF + client portal",          included: true },
      { text: "Daily auto-audits",            included: true },
      { text: "Full white-label branding",    included: true },
      { text: "AI narratives & recs",         included: true },
    ],
  },
];

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 transition-all duration-700 ${
                plan.highlight
                  ? "bg-[#060d1f] border-sky-500/40 shadow-2xl shadow-sky-500/15 md:scale-[1.03] md:-translate-y-1"
                  : "bg-white border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-500/30">
                    <Zap size={10} fill="white" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name + price */}
              <div className="mb-6">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${plan.highlight ? "text-sky-400" : "text-gray-400"}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-black ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                    ${plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlight ? "text-gray-400" : "text-gray-500"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${plan.highlight ? "text-gray-400" : "text-gray-500"}`}>
                  {plan.desc}
                </p>
              </div>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className={`block text-center px-5 py-3 rounded-xl text-sm font-semibold mb-7 transition-all ${
                  plan.highlight
                    ? "bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    {f.included ? (
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-gray-300 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        f.included
                          ? plan.highlight ? "text-gray-200" : "text-gray-700"
                          : plan.highlight ? "text-gray-600 line-through" : "text-gray-400 line-through"
                      }`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          All paid plans include a 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
