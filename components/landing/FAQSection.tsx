"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useInView } from "./hooks";

const FAQS = [
  {
    q: "Do I need to be a developer to use Snapshot AI?",
    a: "Not at all. Snapshot AI is built for agency owners, account managers, and client success teams. The WordPress plugin installs in 2 clicks, and the dashboard is fully visual — no code required.",
  },
  {
    q: "Does it work with any WordPress site?",
    a: "Yes. Any WordPress site can run our lightweight plugin, regardless of theme, page builder, or hosting provider. If it runs WordPress, it works with Snapshot AI.",
  },
  {
    q: "How often are audits run automatically?",
    a: "On the free Starter plan, you trigger audits manually. Pro runs weekly audits automatically, and Agency+ runs daily — or you can trigger a manual audit at any time on any plan.",
  },
  {
    q: "Is my client data kept private and secure?",
    a: "Absolutely. Each agency's data is fully isolated. Your clients only see what you explicitly share through the white-label portal. We never cross-reference or share data between agencies.",
  },
  {
    q: "Can I put my agency logo on the reports?",
    a: "Yes, on the Agency+ plan you can add your logo, brand colors, and even a custom domain for the client portal. Clients see your agency brand throughout — Snapshot AI stays behind the scenes.",
  },
  {
    q: "What happens when a threat or issue is detected?",
    a: "You get an instant alert via email or Slack (your choice) with the site name, issue type, severity level, and recommended next steps. Everything is visible in the dashboard so you can take action immediately.",
  },
  {
    q: "Can multiple team members access the dashboard?",
    a: "Yes. The Agency+ plan supports team members with role-based access (Admin, Analyst, Viewer). You control who sees what across your site portfolio.",
  },
];

function FAQItem({
  q, a, open, onClick,
}: {
  q: string; a: string; open: boolean; onClick: () => void;
}) {
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        open ? "border-sky-200 shadow-sm" : "border-gray-200"
      }`}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${
          open ? "bg-sky-50" : "bg-white hover:bg-gray-50"
        }`}
      >
        <span className={`text-sm font-semibold ${open ? "text-sky-700" : "text-gray-900"}`}>
          {q}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-sky-500" : "text-gray-400"
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48" : "max-h-0"}`}
      >
        <div className="px-5 py-4 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="text-center mb-14">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-600 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Got questions?
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 mb-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Frequently asked questions.
          </h2>
          <p
            className={`text-gray-500 text-base transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Still have questions?{" "}
            <a
              href="mailto:hello@brandbees.net"
              className="text-sky-600 hover:underline font-medium"
            >
              Email us at hello@brandbees.net
            </a>
          </p>
        </div>

        {/* FAQ list */}
        <div
          className={`space-y-3 transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "250ms" }}
        >
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              q={faq.q}
              a={faq.a}
              open={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
