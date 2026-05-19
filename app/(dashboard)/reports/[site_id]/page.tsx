"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText, Download, Send, Link2, RefreshCw, CheckCircle,
  AlertCircle, Clock, ChevronLeft, ExternalLink, Copy, Check,
  TrendingUp, Search, Shield, Bug, Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { useSite } from "@/hooks/useSite";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreHex, formatDateTime, timeAgo } from "@/lib/utils";
import type { Report } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawReport {
  id: string;
  audit_id: string;
  pdf_url?: string | null;
  portal_token: string;
  overall_score?: number | null;
  status: "pending" | "completed" | "failed";
  sent_to?: string | null;
  sent_at?: string | null;
  created_at: string;
  completed_at?: string | null;
  performance_score?: number | null;
  seo_score?: number | null;
  security_score?: number | null;
  malware_score?: number | null;
}

function mapReport(r: RawReport): Report {
  return {
    id: r.id,
    site_id: "",
    audit_id: r.audit_id,
    pdf_url: r.pdf_url ?? null,
    portal_token: r.portal_token,
    overall_score: r.overall_score ?? null,
    status: r.status,
    sent_to: r.sent_to ?? null,
    sent_at: r.sent_at ?? null,
    created_at: r.created_at,
    completed_at: r.completed_at ?? null,
    performance_score: r.performance_score ?? null,
    seo_score: r.seo_score ?? null,
    security_score: r.security_score ?? null,
    malware_score: r.malware_score ?? null,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PORTAL_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin}/portal`
    : "/portal";

function ScoreDot({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-sm text-gray-300 font-bold">—</span>;
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color: scoreHex(score) }}>
      {score}
    </span>
  );
}

const PILLAR_META = [
  { key: "performance_score" as const, label: "Perf",  Icon: TrendingUp, color: "#10b981" },
  { key: "seo_score"         as const, label: "SEO",   Icon: Search,     color: "#ec4899" },
  { key: "security_score"    as const, label: "Sec",   Icon: Shield,     color: "#06b6d4" },
  { key: "malware_score"     as const, label: "Mal",   Icon: Bug,        color: "#8b5cf6" },
];

// ── Send report modal ─────────────────────────────────────────────────────────

interface SendModalProps {
  report: Report;
  onClose: () => void;
  onSent: () => void;
}

function SendReportModal({ report, onClose, onSent }: SendModalProps) {
  const [email, setEmail] = useState(report.sent_to ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.post(`/reports/send/${report.id}`, { email: email.trim() });
      onSent();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send";
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Send Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Email the PDF report to your client
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Recipient email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: Report;
  isPolling: boolean;
  onSend: (r: Report) => void;
}

function ReportCard({ report, isPolling, onSend }: ReportCardProps) {
  const [copied, setCopied] = useState(false);

  const portalUrl = `${PORTAL_BASE}/${report.portal_token}`;

  async function copyPortalLink() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const isPending   = report.status === "pending";
  const isCompleted = report.status === "completed";
  const isFailed    = report.status === "failed";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          {isPending && (
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              {isPolling ? (
                <Loader2 size={16} className="text-amber-500 animate-spin" />
              ) : (
                <Clock size={16} className="text-amber-500" />
              )}
            </div>
          )}
          {isCompleted && (
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <FileText size={16} className="text-green-600" />
            </div>
          )}
          {isFailed && (
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle size={16} className="text-red-500" />
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-foreground">
              {isCompleted
                ? `Report · ${formatDateTime(report.completed_at ?? report.created_at)}`
                : isPending
                ? "Generating PDF…"
                : "Generation failed"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {timeAgo(report.created_at)}
              {report.sent_to && ` · Sent to ${report.sent_to}`}
            </p>
          </div>
        </div>

        {/* Overall score badge */}
        {report.overall_score != null && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: scoreHex(report.overall_score) }}
          >
            {report.overall_score}
          </div>
        )}
      </div>

      {/* Pillar scores */}
      <div className="grid grid-cols-4 divide-x divide-border/50 border-b border-border/50">
        {PILLAR_META.map(({ key, label, Icon, color }) => (
          <div key={key} className="flex flex-col items-center gap-1.5 py-3">
            <Icon size={12} style={{ color }} />
            <ScoreDot score={report[key]} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3">
        {isCompleted && report.pdf_url && (
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <Download size={13} />
            Download PDF
          </a>
        )}

        {isCompleted && (
          <>
            <button
              onClick={() => onSend(report)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-gray-50 transition-colors"
            >
              <Send size={13} />
              {report.sent_to ? "Resend" : "Send to client"}
            </button>

            <button
              onClick={copyPortalLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy portal link"}
            </button>

            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
            >
              <ExternalLink size={12} />
              Preview
            </a>
          </>
        )}

        {isPending && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            PDF is being generated — this usually takes under a minute
          </p>
        )}

        {isFailed && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle size={12} />
            Generation failed. Try generating a new report.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SiteReportsPage() {
  const { site_id } = useParams<{ site_id: string }>();
  const router = useRouter();
  const { site, loading: siteLoading } = useSite(site_id);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<Report | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  // IDs of reports currently being polled
  const pollingRef = useRef<Set<string>>(new Set());
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await api.get<{ reports: RawReport[] }>(`/reports/${site_id}`);
      const mapped = (data.reports ?? []).map(mapReport);
      setReports(mapped);
      return mapped;
    } catch {
      /* silently fail on background refresh */
    } finally {
      setLoadingReports(false);
    }
    return [];
  }, [site_id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Poll a single report until it's no longer pending
  function startPolling(reportId: string) {
    if (pollingRef.current.has(reportId)) return;
    pollingRef.current.add(reportId);

    const timer = setInterval(async () => {
      try {
        const { data } = await api.get<RawReport>(`/reports/status/${reportId}`);
        if (data.status !== "pending") {
          clearInterval(timer);
          pollTimersRef.current.delete(reportId);
          pollingRef.current.delete(reportId);
          // Refresh full list
          fetchReports();
        } else {
          // Update in-place so card shows spinner
          setReports((prev) =>
            prev.map((r) => (r.id === reportId ? { ...r, status: data.status } : r))
          );
        }
      } catch {
        clearInterval(timer);
        pollTimersRef.current.delete(reportId);
        pollingRef.current.delete(reportId);
      }
    }, 4000);

    pollTimersRef.current.set(reportId, timer);
  }

  // Start polling for any pending reports on mount
  useEffect(() => {
    reports.forEach((r) => {
      if (r.status === "pending") startPolling(r.id);
    });
    // Cleanup on unmount
    return () => {
      pollTimersRef.current.forEach((t) => clearInterval(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.map((r) => r.id).join(",")]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const { data } = await api.post<{ queued: boolean; report_id: string; portal_token: string }>(
        `/reports/generate/${site_id}`
      );
      // Add optimistic pending entry
      const pending: Report = {
        id: data.report_id,
        site_id,
        audit_id: "",
        pdf_url: null,
        portal_token: data.portal_token,
        overall_score: null,
        status: "pending",
        sent_to: null,
        sent_at: null,
        created_at: new Date().toISOString(),
        completed_at: null,
        performance_score: null,
        seo_score: null,
        security_score: null,
        malware_score: null,
      };
      setReports((prev) => [pending, ...prev]);
      startPolling(data.report_id);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to start report generation.";
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  }

  if (siteLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!site) {
    return (
      <EmptyState
        icon={<AlertCircle size={20} />}
        title="Site not found"
        description="This site doesn't exist or you don't have access."
      />
    );
  }

  const hasCompletedAudit = !!site.last_audit_at;
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/reports")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft size={15} />
            All reports
          </button>
          <h1 className="text-xl font-bold text-foreground">{site.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{site.url}</p>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !hasCompletedAudit}
          title={!hasCompletedAudit ? "Run an audit first" : undefined}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
          style={{ background: "var(--accent)" }}
        >
          {generating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {generating ? "Queuing…" : "Generate Report"}
        </button>
      </div>

      {/* Alerts */}
      {!hasCompletedAudit && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertCircle size={16} className="shrink-0" />
          No completed audit found for this site. Run an audit first, then generate a report.
        </div>
      )}

      {genError && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {genError}
        </div>
      )}

      {sentSuccess && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <CheckCircle size={16} className="shrink-0" />
          Report sent successfully!
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
          <Loader2 size={16} className="animate-spin shrink-0" />
          {pendingCount === 1
            ? "1 report is being generated — this usually takes under a minute."
            : `${pendingCount} reports are being generated.`}
        </div>
      )}

      {/* Report list */}
      {loadingReports ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="No reports yet"
          description={
            hasCompletedAudit
              ? "Click \"Generate Report\" to create your first branded PDF."
              : "Run an audit first, then generate a report."
          }
        />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              isPolling={pollingRef.current.has(r.id)}
              onSend={setSendTarget}
            />
          ))}
        </div>
      )}

      {/* Send modal */}
      {sendTarget && (
        <SendReportModal
          report={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={() => {
            setSendTarget(null);
            setSentSuccess(true);
            fetchReports();
            setTimeout(() => setSentSuccess(false), 4000);
          }}
        />
      )}
    </div>
  );
}
