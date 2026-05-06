import { scoreColor, formatDateTime } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { FileDown } from "lucide-react";
import type { Audit } from "@/types";

interface AuditHistoryTableProps {
  audits: Audit[];
  onViewReport?: (auditId: string) => void;
}

function StatusBadge({ status, triggeredBy }: { status: Audit["status"]; triggeredBy?: string }) {
  const label = triggeredBy === "manual" ? "Manual" : "Scheduled";

  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        {label}
      </span>
    );
  if (status === "failed")
    return <Badge variant="danger">Failed</Badge>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
      <LoadingSpinner size="sm" />
      Running
    </span>
  );
}

function ScoreCell({ score }: { score: number | undefined }) {
  if (score === undefined)
    return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <span
      className="text-sm font-bold tabular-nums"
      style={{ color: scoreColor(score) }}
    >
      {score}
    </span>
  );
}

function OverallScoreCell({ score }: { score: number | undefined }) {
  if (score === undefined)
    return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold tabular-nums"
      style={{
        color: scoreColor(score),
        background:
          score >= 80
            ? "var(--score-good-bg)"
            : score >= 50
            ? "var(--score-warn-bg)"
            : "var(--score-bad-bg)",
      }}
    >
      {score}
    </span>
  );
}

export function AuditHistoryTable({ audits, onViewReport }: AuditHistoryTableProps) {
  if (audits.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground">No audits yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Run your first audit to see history.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px]">
        <thead>
          <tr className="border-b border-border">
            {[
              { label: "Date & Time" },
              { label: "Audit Type" },
              { label: "Score" },
              { label: "Perf" },
              { label: "SEO" },
              { label: "Sec" },
              { label: "Mal" },
              { label: "Report" },
            ].map(({ label }) => (
              <th
                key={label}
                className="pb-3 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider first:pl-0 last:pr-0"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {audits.map((audit) => {
            const overall =
              audit.overall_score ??
              (audit.scores
                ? Math.round(
                    (audit.scores.performance +
                      audit.scores.seo +
                      audit.scores.security +
                      audit.scores.malware) / 4
                  )
                : undefined);

            return (
              <tr
                key={audit.id}
                className="hover:bg-muted/30 transition-colors"
              >
                {/* Date */}
                <td className="py-3.5 px-3 pl-0">
                  <p className="text-xs font-semibold text-foreground">
                    {new Date(audit.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(audit.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </td>

                {/* Audit type */}
                <td className="py-3.5 px-3">
                  <StatusBadge
                    status={audit.status}
                    triggeredBy={audit.audit_type}
                  />
                </td>

                {/* Overall score */}
                <td className="py-3.5 px-3">
                  <OverallScoreCell score={overall} />
                </td>

                {/* Pillars */}
                <td className="py-3.5 px-3">
                  <ScoreCell score={audit.scores?.performance} />
                </td>
                <td className="py-3.5 px-3">
                  <ScoreCell score={audit.scores?.seo} />
                </td>
                <td className="py-3.5 px-3">
                  <ScoreCell score={audit.scores?.security} />
                </td>
                <td className="py-3.5 px-3">
                  <ScoreCell score={audit.scores?.malware} />
                </td>

                {/* Report / PDF */}
                <td className="py-3.5 px-3 pr-0">
                  {audit.status === "completed" ? (
                    <button
                      onClick={() => onViewReport?.(audit.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-accent hover:border-accent hover:bg-accent-light transition-colors"
                    >
                      <FileDown size={12} />
                      PDF
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
