"use client";

import { scoreColor } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Audit } from "@/types";

interface AuditHistoryTableProps {
  audits: Audit[];
  siteId: string;
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
    <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(score) }}>
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
        background: score >= 80 ? "var(--score-good-bg)" : score >= 50 ? "var(--score-warn-bg)" : "var(--score-bad-bg)",
      }}
    >
      {score}
    </span>
  );
}

function PdfButton({ audit, siteId }: { audit: Audit; siteId: string }) {
  const [loading, setLoading] = useState(false);

  async function downloadBlob(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }

  async function handleClick() {
    setLoading(true);
    try {
      // If report already exists — download directly
      if (audit.pdf_url) {
        await downloadBlob(audit.pdf_url, `report-${audit.id.slice(0, 8)}.pdf`);
        return;
      }

      // Generate a new report for this audit
      const { data: gen } = await api.post<{ report_id: string }>(
        `/reports/generate/${siteId}`,
        { audit_id: audit.id }
      );

      // Poll until complete (max 60s)
      let attempts = 0;
      while (attempts < 20) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data: status } = await api.get<{ status: string; pdf_url?: string }>(
          `/reports/status/${gen.report_id}`
        );
        if (status.status === "completed" && status.pdf_url) {
          await downloadBlob(status.pdf_url, `report-${audit.id.slice(0, 8)}.pdf`);
          return;
        }
        if (status.status === "failed") throw new Error("Report generation failed");
        attempts++;
      }
      throw new Error("Timed out waiting for report");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-accent hover:border-accent hover:bg-accent-light transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
      {loading ? "…" : "PDF"}
    </button>
  );
}

export function AuditHistoryTable({ audits, siteId }: AuditHistoryTableProps) {
  if (audits.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground">No audits yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Run your first audit to see history.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px]">
        <thead>
          <tr className="border-b border-border">
            {["Date & Time", "Audit Type", "Score", "Perf", "SEO", "Sec", "Mal", "Report"].map((label) => (
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
                ? Math.round((audit.scores.performance + audit.scores.seo + audit.scores.security + audit.scores.malware) / 4)
                : undefined);

            return (
              <tr key={audit.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3.5 px-3 pl-0">
                  <p className="text-xs font-semibold text-foreground">
                    {new Date(audit.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(audit.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </td>
                <td className="py-3.5 px-3">
                  <StatusBadge status={audit.status} triggeredBy={audit.audit_type} />
                </td>
                <td className="py-3.5 px-3"><OverallScoreCell score={overall} /></td>
                <td className="py-3.5 px-3"><ScoreCell score={audit.scores?.performance} /></td>
                <td className="py-3.5 px-3"><ScoreCell score={audit.scores?.seo} /></td>
                <td className="py-3.5 px-3"><ScoreCell score={audit.scores?.security} /></td>
                <td className="py-3.5 px-3"><ScoreCell score={audit.scores?.malware} /></td>
                <td className="py-3.5 px-3 pr-0">
                  {audit.status === "completed"
                    ? <PdfButton audit={audit} siteId={siteId} />
                    : <span className="text-muted-foreground text-xs">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
