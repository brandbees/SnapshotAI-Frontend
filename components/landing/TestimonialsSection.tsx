"use client";
import { useInView } from "./hooks";

const TESTIMONIALS = [
  {
    quote:
      "BrandBeesAI completely changed how we handle client reporting. What took us hours now happens automatically, and our clients are blown away by the professional PDF reports.",
    name:     "Sarah Mitchell",
    role:     "Founder, PixelCraft Agency",
    initials: "SM",
    color:    "#0ea5e9",
  },
  {
    quote:
      "The malware detection caught a serious infection on one of our client's e-commerce sites before it caused any damage. That single alert paid for a full year of the subscription.",
    name:     "James Thornton",
    role:     "Lead Developer, ThornDigital",
    initials: "JT",
    color:    "#8b5cf6",
  },
  {
    quote:
      "Managing 40+ WordPress sites used to be chaos. Now we have a single dashboard that shows everything at a glance. The AI score breakdowns are genuinely insightful.",
    name:     "Priya Nair",
    role:     "Director, Nair Web Studio",
    initials: "PN",
    color:    "#10b981",
  },
];

export function TestimonialsSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={ref} className="text-center max-w-2xl mx-auto mb-16">
          <p
            className={`text-xs font-semibold uppercase tracking-widest text-sky-500 mb-3 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            What agencies say
          </p>
          <h2
            className={`text-4xl font-black text-gray-900 mb-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Agencies love BrandBeesAI.
          </h2>
          <p
            className={`text-gray-500 text-lg transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Real teams. Real results. See what our customers have to say.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className={`bg-[#f8f9fb] rounded-2xl border border-gray-100 p-6 transition-all duration-700 hover:shadow-md hover:-translate-y-1 ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {"★★★★★".split("").map((s, j) => (
                  <span key={j} className="text-amber-400 text-sm leading-none">
                    {s}
                  </span>
                ))}
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
