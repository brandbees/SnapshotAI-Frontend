"use client";

import { useRouter } from "next/navigation";
import { FileText, TrendingUp, Search, Shield, Bug, ChevronRight, Globe } from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { scoreHex, truncateUrl, timeAgo } from "@/lib/utils";
import type { Site } from "@/types";

const PILLARS = [
  { key: "performance" as const, label: "Perf",  color: "#10b981", Icon: TrendingUp },
  { key: "seo"         as const, label: "SEO",   color: "#ec4899", Icon: Search    },
  { key: "security"    as const, label: "Sec",   color: "#06b6d4", Icon: Shield    },
  { key: "malware"     as const, label: "Mal",   color: "#8b5cf6", Icon: Bug       },
];

const AVATAR_COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
function avatarColor(id: string) { return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length]; }

function ScorePill({ score }: { score: number | undefined }) {
  if (score === undefined) {
    return <span className="text-sm font-bold text-gray-300">—</span>;
  }
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color: scoreHex(score) }}>
      {score}
    </span>
  );
}

function ReportSiteCard({ site }: { site: Site }) {
  const router = useRouter();
  const hasScores = !!site.latest_scores;
  const overall = hasScores
    ? Math.round(
        ((site.latest_scores!.performance ?? 0) +
          (site.latest_scores!.seo ?? 0) +
          (site.latest_scores!.security ?? 0) +
          (site.latest_scores!.malware ?? 100)) / 4
      )
    : null;

  return (
    <button
      onClick={() => router.push(`/reports/${site.id}`)}
      className="w-full text-left bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-accent/30 transition-all group flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
            style={{ background: avatarColor(site.id) }}
          >
            {site.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground leading-snug truncate">
              {site.name}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {truncateUrl(site.url)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overall !== null && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: scoreHex(overall) }}
            >
              {overall}
            </div>
          )}
          <ChevronRight
            size={16}
            className="text-muted-foreground group-hover:text-accent transition-colors shrink-0"
          />
        </div>
      </div>

      {/* Pillar scores */}
      <div className="grid grid-cols-4 gap-1.5 px-3 py-3 border-t border-border/50">
        {PILLARS.map(({ key, label, color, Icon }) => (
          <div
            key={key}
            className="flex flex-col items-center gap-1.5 bg-[#f8fafc] rounded-xl py-2.5 px-1"
          >
            <Icon size={12} style={{ color }} />
            <ScorePill score={site.latest_scores?.[key]} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {site.last_audit_at ? `Last audit ${timeAgo(site.last_audit_at)}` : "No audit yet"}
        </span>
        <span
          className="text-xs font-semibold flex items-center gap-1 transition-colors text-muted-foreground group-hover:text-accent"
        >
          <FileText size={11} />
          View reports
        </span>
      </div>
    </button>
  );
}

export default function ReportsPage() {
  const { sites, loading, error } = useSites();

  const sitesWithAudits = sites.filter((s) => !!s.last_audit_at);
  const sitesWithout = sites.filter((s) => !s.last_audit_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate and send branded PDF reports to clients
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && sites.length === 0 && (
        <EmptyState
          icon={<FileText size={20} />}
          title="No sites yet"
          description="Add a site and run an audit before generating reports."
        />
      )}

      {!loading && !error && sites.length > 0 && (
        <>
          {/* Sites with audit data */}
          {sitesWithAudits.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Ready to report ({sitesWithAudits.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sitesWithAudits.map((site) => (
                  <ReportSiteCard key={site.id} site={site} />
                ))}
              </div>
            </section>
          )}

          {/* Sites without audit data */}
          {sitesWithout.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Needs audit first ({sitesWithout.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sitesWithout.map((site) => (
                  <div
                    key={site.id}
                    className="bg-white rounded-2xl border border-dashed border-border flex items-center gap-3 p-4 opacity-60"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
                      style={{ background: avatarColor(site.id) }}
                    >
                      {site.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground">Run an audit to generate a report</p>
                    </div>
                    <Globe size={16} className="text-muted-foreground ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
