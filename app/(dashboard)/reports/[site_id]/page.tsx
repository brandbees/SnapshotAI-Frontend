"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText, Download, Send, CheckCircle,
  AlertCircle, ChevronLeft, ExternalLink, Copy, Check,
  TrendingUp, Search, Shield, Bug, Loader2, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { useSite } from "@/hooks/useSite";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { scoreHex, timeAgo } from "@/lib/utils";
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
  typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";

const PILLAR_META = [
  { key: "performance_score" as const, label: "Perf", Icon: TrendingUp, color: "#10b981" },
  { key: "seo_score"         as const, label: "SEO",  Icon: Search,     color: "#ec4899" },
  { key: "security_score"    as const, label: "Sec",  Icon: Shield,     color: "#06b6d4" },
  { key: "malware_score"     as const, label: "Mal",  Icon: Bug,        color: "#8b5cf6" },
];

function ScorePip({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-base font-bold text-gray-200">—</span>;
  return (
    <span className="text-base font-bold tabular-nums" style={{ color: scoreHex(score) }}>
      {score}
    </span>
  );
}

// ── Send modal ────────────────────────────────────────────────────────────────

function SendReportModal({ report, onClose, onSent }: { report: Report; onClose: () => void; onSent: () => void }) {
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
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Send Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Email the PDF report to your client</p>
        </div>
        <div className="px-6 py-5">
          <label className="text-xs font-semibold text-foreground block mb-1.5">Recipient email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-2">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
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

function ReportCard({ report, onSend }: { report: Report; onSend: (r: Report) => void }) {
  const [copied, setCopied] = useState(false);
  const portalUrl = `${PORTAL_BASE}/${report.portal_token}`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(portalUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  }

  const isPending   = report.status === "pending";
  const isCompleted = report.status === "completed";
  const isFailed    = report.status === "failed";

  const accentBar = isPending ? "#f59e0b" : isFailed ? "#ef4444" : report.overall_score != null ? scoreHex(report.overall_score) : "#10b981";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Colored top accent bar */}
      <div className="h-1 w-full" style={{ background: accentBar }} />

      {/* Header: date + score */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${accentBar}18` }}
          >
            {isPending  && <Loader2 size={15} className="animate-spin" style={{ color: accentBar }} />}
            {isCompleted && <FileText size={15} style={{ color: accentBar }} />}
            {isFailed   && <AlertCircle size={15} style={{ color: accentBar }} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-snug">
              {isCompleted
                ? new Date(report.completed_at ?? report.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : isPending ? "Generating PDF…" : "Generation failed"}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isCompleted && (
                <span className="text-xs font-medium text-foreground opacity-60">
                  {new Date(report.completed_at ?? report.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{timeAgo(report.created_at)}</span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                  <CheckCircle size={9} /> Completed
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Processing
                </span>
              )}
              {isFailed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                  Failed
                </span>
              )}
              {report.sent_to && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  ✓ Sent
                </span>
              )}
            </div>
          </div>
        </div>

        {report.overall_score != null && (
          <div className="shrink-0 text-right">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white shadow-sm"
              style={{ background: scoreHex(report.overall_score) }}
            >
              {report.overall_score}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">Overall</p>
          </div>
        )}
      </div>

      {/* Pillar scores */}
      <div className="grid grid-cols-4 mx-5 mb-4 rounded-xl overflow-hidden border border-border/60 divide-x divide-border/60">
        {PILLAR_META.map(({ key, label, Icon, color }) => (
          <div key={key} className="flex flex-col items-center gap-1.5 py-3 bg-[#f8fafc]">
            <Icon size={12} style={{ color }} />
            <ScorePip score={report[key]} />
            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 mx-0" />

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3">
        {isCompleted && (
          <>
            {/* Primary actions — text labels */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {report.pdf_url && (
                <a
                  href={report.pdf_url}
                  download
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                  style={{ background: "var(--accent)" }}
                >
                  <Download size={12} />
                  Download PDF
                </a>
              )}
              <button
                onClick={() => onSend(report)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-foreground hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <Send size={12} />
                {report.sent_to ? "Resend" : "Send to Client"}
              </button>
            </div>

            {/* Secondary actions — icon only */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={copyLink}
                title={copied ? "Copied!" : "Copy client portal link"}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Preview client portal"
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </>
        )}
        {isPending && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" />
            This usually takes under a minute…
          </p>
        )}
        {isFailed && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle size={11} />
            Generation failed — try generating again
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

  // Keep a ref to latest reports so the polling interval always sees current state
  const reportsRef = useRef<Report[]>([]);
  reportsRef.current = reports;

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await api.get<{ reports: RawReport[] }>(`/reports/${site_id}`);
      const mapped = (data.reports ?? []).map(mapReport);
      setReports(mapped);
      return mapped;
    } catch {
      /* ignore transient errors */
    } finally {
      setLoadingReports(false);
    }
    return [];
  }, [site_id]);

  // Initial load
  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Single polling interval — runs while any report is pending
  useEffect(() => {
    const timer = setInterval(() => {
      const hasPending = reportsRef.current.some((r) => r.status === "pending");
      if (hasPending) fetchReports();
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchReports]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const { data } = await api.post<{ queued: boolean; report_id: string; portal_token: string }>(
        `/reports/generate/${site_id}`
      );
      const pending: Report = {
        id: data.report_id, site_id, audit_id: "",
        pdf_url: null, portal_token: data.portal_token,
        overall_score: null, status: "pending",
        sent_to: null, sent_at: null,
        created_at: new Date().toISOString(), completed_at: null,
        performance_score: null, seo_score: null,
        security_score: null, malware_score: null,
      };
      setReports((prev) => [pending, ...prev]);
    } catch (e: unknown) {
      setGenError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to start report generation."
      );
    } finally {
      setGenerating(false);
    }
  }

  if (siteLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  if (!site) return (
    <EmptyState icon={<AlertCircle size={20} />} title="Site not found" description="This site doesn't exist or you don't have access." />
  );

  const hasCompletedAudit = !!site.last_audit_at;
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* Header */}
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
        <button
          onClick={handleGenerate}
          disabled={generating || !hasCompletedAudit}
          title={!hasCompletedAudit ? "Run an audit first" : undefined}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shrink-0 transition-opacity"
          style={{ background: "var(--accent)" }}
        >
          {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {generating ? "Queuing…" : "Generate Report"}
        </button>
      </div>

      {/* Banners */}
      {!hasCompletedAudit && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertCircle size={15} className="shrink-0" />
          No completed audit found — run an audit first.
        </div>
      )}
      {genError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" /> {genError}
        </div>
      )}
      {sentSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <CheckCircle size={15} className="shrink-0" /> Report sent successfully!
        </div>
      )}

      {/* Report grid */}
      {loadingReports ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="No reports yet"
          description={hasCompletedAudit ? `Click "Generate Report" to create your first PDF.` : "Run an audit first, then generate a report."}
        />
      ) : (
        <>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
              <Loader2 size={14} className="animate-spin shrink-0" />
              {pendingCount === 1 ? "Generating PDF — auto-updates when ready." : `${pendingCount} PDFs generating — auto-updating…`}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} onSend={setSendTarget} />
            ))}
          </div>
        </>
      )}

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
