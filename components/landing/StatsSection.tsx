"use client";
import { useInView, useCountUp } from "./hooks";

function Counter({ end, suffix, enabled }: { end: number; suffix: string; enabled: boolean }) {
  const count = useCountUp(end, 2200, enabled);
  return (
    <span className="tabular-nums">
      {(enabled ? count : 0).toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection({ cms = {} }: { cms?: Record<string, string> }) {
  const { ref, inView } = useInView(0.3);

  const stats = [
    { end: parseInt(cms.stat_1_end  ?? "2400",  10) || 2400,  suffix: cms.stat_1_suffix ?? "+",    label: cms.stat_1_label ?? "Sites Monitored",   sub: cms.stat_1_sub ?? "Across agencies worldwide"    },
    { end: parseInt(cms.stat_2_end  ?? "14000", 10) || 14000, suffix: cms.stat_2_suffix ?? "+",    label: cms.stat_2_label ?? "Reports Generated", sub: cms.stat_2_sub ?? "Beautiful AI-powered PDFs"    },
    { end: parseInt(cms.stat_3_end  ?? "99",    10) || 99,    suffix: cms.stat_3_suffix ?? ".7%",  label: cms.stat_3_label ?? "Uptime Accuracy",   sub: cms.stat_3_sub ?? "Real-time alert reliability"  },
    { end: parseInt(cms.stat_4_end  ?? "240",   10) || 240,   suffix: cms.stat_4_suffix ?? "+",    label: cms.stat_4_label ?? "Agencies Trust Us", sub: cms.stat_4_sub ?? "And growing every day"        },
  ];

  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {stats.map((stat, i) => (
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
