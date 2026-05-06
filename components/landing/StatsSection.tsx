"use client";
import { useInView, useCountUp } from "./hooks";

const STATS = [
  { end: 2400,  suffix: "+",  label: "Sites Monitored",   sub: "Across agencies worldwide"    },
  { end: 14000, suffix: "+",  label: "Reports Generated", sub: "Beautiful AI-powered PDFs"    },
  { end: 99,    suffix: ".7%",label: "Uptime Accuracy",   sub: "Real-time alert reliability"  },
  { end: 240,   suffix: "+",  label: "Agencies Trust Us", sub: "And growing every day"        },
];

function Counter({ end, suffix, enabled }: { end: number; suffix: string; enabled: boolean }) {
  const count = useCountUp(end, 2200, enabled);
  return (
    <span className="tabular-nums">
      {(enabled ? count : 0).toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const { ref, inView } = useInView(0.3);

  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={`text-center px-4 transition-all duration-700 ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <p className="text-4xl font-black text-gray-900 mb-1">
                <Counter end={stat.end} suffix={stat.suffix} enabled={inView} />
              </p>
              <p className="text-sm font-semibold text-gray-900">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
