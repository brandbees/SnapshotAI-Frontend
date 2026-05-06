import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { UptimeBadge } from "./UptimeBadge";
import { MalwareBadge } from "./MalwareBadge";
import { timeAgo, truncateUrl, scoreColor } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import type { Site } from "@/types";

interface SiteCardProps {
  site: Site;
}

const pillars = [
  { key: "performance" as const, label: "PERF" },
  { key: "seo" as const, label: "SEO" },
  { key: "security" as const, label: "SEC" },
  { key: "malware" as const, label: "MAL" },
];

const siteColors = [
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-green-500",
  "from-orange-400 to-amber-500",
  "from-pink-400 to-rose-500",
  "from-teal-400 to-cyan-500",
];

function siteColor(id: string) {
  const idx = id.charCodeAt(0) % siteColors.length;
  return siteColors[idx];
}

export function SiteCard({ site }: SiteCardProps) {
  const hasScan = site.latest_scores !== undefined && site.latest_scores !== null;

  return (
    <Link href={`/sites/${site.id}`} className="block group">
      <Card hover className="flex flex-col gap-0 p-0 overflow-hidden cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${siteColor(site.id)} flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm`}
            >
              {site.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-snug">
                {site.name}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {truncateUrl(site.url)}
              </p>
            </div>
          </div>

          {hasScan ? (
            <MalwareBadge status={site.malware_status} />
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
              Pending scan
            </span>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-4 px-5 pb-4">
          <UptimeBadge
            status={site.uptime_status}
            percentage={site.uptime_percentage}
          />
          {site.last_audit_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              {timeAgo(site.last_audit_at)}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5" />

        {/* Score row */}
        <div className="grid grid-cols-4 px-5 py-4">
          {pillars.map(({ key, label }) => {
            const score = site.latest_scores?.[key];
            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {label}
                </span>
                {score !== undefined ? (
                  key === "malware" ? (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: score >= 80 ? "var(--score-good)" : "var(--score-bad)",
                        background: score >= 80 ? "var(--score-good-bg)" : "var(--score-bad-bg)",
                      }}
                    >
                      {score >= 80 ? "PASS" : "FAIL"}
                    </span>
                  ) : (
                    <span
                      className="text-lg font-bold tabular-nums leading-none"
                      style={{ color: scoreColor(score) }}
                    >
                      {score}
                    </span>
                  )
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            VIEW DETAILS
            <ArrowRight
              size={12}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
