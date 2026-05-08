"use client";
import { useState } from "react";
import { ChevronDown, Mail, Phone, BookOpen, MessageCircle } from "lucide-react";
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
    a: "On the Starter plan, you trigger audits manually. Growth runs weekly audits automatically, and Agency+ runs daily — or you can trigger a manual audit at any time on any plan.",
  },
  {
    q: "Is my client data kept private and secure?",
    a: "Absolutely. Each agency's data is fully isolated. Your clients only see what you share through the white-label portal. We never cross-reference or share data between agencies.",
  },
  {
    q: "Can I put my agency logo and brand on the reports?",
    a: "Yes, on Growth and above you can add your logo, brand colors, and a custom domain for the client portal. Clients see your agency brand throughout — Snapshot AI stays behind the scenes.",
  },
  {
    q: "What happens when a threat or issue is detected?",
    a: "You get an instant alert via email or Slack (your choice) with the site name, issue type, severity level, and recommended next steps. Everything is visible in the dashboard so you can take action immediately.",
  },
  {
    q: "Can I safely update plugins from the dashboard?",
    a: "Yes. Our safe update system creates an automatic restore point before every plugin update. If anything breaks after the update, you can roll back to the previous state in one click.",
  },
  {
    q: "Can multiple team members access the dashboard?",
    a: "Yes. All paid plans support team members with role-based access (Owner, Admin, Manager, Analyst). You control who sees what across your site portfolio.",
  },
];

/* ── FAQ accordion item ───────────────────────────────────────────────────── */

function FAQItem({
  q, a, open, onClick,
}: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div className={`border-b transition-colors duration-150 ${open ? "border-sky-100" : "border-gray-100"}`}>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className={`text-base font-semibold leading-snug ${open ? "text-sky-700" : "text-gray-900"}`}>
          {q}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-sky-500" : "text-gray-400"}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48 pb-5" : "max-h-0"}`}>
        <p className="text-base text-gray-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Support cards ────────────────────────────────────────────────────────── */

const SUPPORT_CARDS = [
  {
    icon: Mail,
    iconBg: "#e0f2fe",
    iconColor: "#0ea5e9",
    title: "Contact us",
    desc: "Our team responds within a few hours, Monday to Friday.",
    href: "mailto:hello@brandbees.net",
  },
  {
    icon: Phone,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
    title: "Book a demo",
    desc: "Schedule a 1:1 walkthrough with someone from our team.",
    href: "/register",
  },
  {
    icon: BookOpen,
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
    title: "Visit our Help Center",
    desc: "How-to guides and tutorials to get the most from SnapshotAI.",
    href: "#",
  },
  {
    icon: MessageCircle,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    title: "Join the community",
    desc: "Connect with other agencies, share tips, and get answers fast.",
    href: "#",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref, inView } = useInView(0.08);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="mb-14">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-600 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Got questions?
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Frequently asked questions.
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-16 items-start">

          {/* Left: accordion */}
          <div
            className={`transition-all duration-700 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: "150ms" }}
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

            <p className="mt-8 text-sm text-gray-400">
              Still have questions?{" "}
              <a href="mailto:hello@brandbees.net" className="text-sky-600 hover:underline font-medium">
                Email us at hello@brandbees.net
              </a>
            </p>
          </div>

          {/* Right: support cards */}
          <div
            className={`space-y-3 transition-all duration-700 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            {SUPPORT_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <a
                  key={i}
                  href={card.href}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-[#f8f9fb] hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: card.iconBg }}
                  >
                    <Icon size={20} style={{ color: card.iconColor }} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 mb-0.5 group-hover:text-sky-600 transition-colors">
                      {card.title}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
