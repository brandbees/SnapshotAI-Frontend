"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ListChecks, RefreshCw, Trash2, RotateCcw,
  CheckCircle2, Clock, AlertTriangle, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import masterApi from "@/lib/masterApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface JobCounts {
  waiting:   number;
  active:    number;
  completed: number;
  failed:    number;
  delayed:   number;
  paused:    number;
}

interface FailedJob {
  id:           string;
  name:         string;
  failedReason: string;
  attemptsMade: number;
  timestamp:    number;
  data:         Record<string, unknown>;
}

interface QueueInfo {
  name:    string;
  counts:  JobCounts;
  failed:  FailedJob[];
}

interface Totals {
  waiting:   number;
  active:    number;
  completed: number;
  failed:    number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";

const QUEUE_LABELS: Record<string, string> = {
  AuditQueue:     "Audit",
  ScanQueue:      "Scan",
  UptimeQueue:    "Uptime",
  AlertQueue:     "Alert",
  SchedulerQueue: "Scheduler",
  ReportQueue:    "Report",
};

const QUEUE_COLORS: Record<string, string> = {
  AuditQueue:     "#f59e0b",
  ScanQueue:      "#8b5cf6",
  UptimeQueue:    "#10b981",
  AlertQueue:     "#ef4444",
  SchedulerQueue: "#3b82f6",
  ReportQueue:    "#6366f1",
};

function fmtTs(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function CountBadge({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-xl" style={{ background: bg }}>
      <span className="text-lg font-bold leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] font-medium mt-0.5" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({ queue, onRetry, onClean, onCleanCompleted }: {
  queue: QueueInfo;
  onRetry: (name: string) => void;
  onClean: (name: string) => void;
  onCleanCompleted: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color  = QUEUE_COLORS[queue.name] ?? "#64748b";
  const label  = QUEUE_LABELS[queue.name] ?? queue.name;
  const hasFailed = queue.counts.failed > 0;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow ${
      hasFailed ? "border-red-200 shadow-sm" : "border-border"
    }`}>
      {/* Color strip */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}18` }}>
              <ListChecks size={14} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{queue.name}</p>
            </div>
          </div>
          {hasFailed && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={9} /> {queue.counts.failed} failed
            </span>
          )}
        </div>

        {/* Count badges */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <CountBadge label="Waiting"   value={queue.counts.waiting}   color="#f59e0b" bg="rgba(245,158,11,0.08)" />
          <CountBadge label="Active"    value={queue.counts.active}    color="#3b82f6" bg="rgba(59,130,246,0.08)" />
          <CountBadge label="Completed" value={queue.counts.completed} color="#10b981" bg="rgba(16,185,129,0.08)" />
          <CountBadge label="Failed"    value={queue.counts.failed}    color="#ef4444" bg="rgba(239,68,68,0.08)"  />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {queue.counts.failed > 0 && (
            <>
              <button
                onClick={() => onRetry(queue.name)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
              >
                <RotateCcw size={10} /> Retry Failed
              </button>
              <button
                onClick={() => onClean(queue.name)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
              >
                <Trash2 size={10} /> Clear Failed
              </button>
            </>
          )}
          {queue.counts.completed > 0 && (
            <button
              onClick={() => onCleanCompleted(queue.name)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-50 text-muted-foreground hover:bg-gray-100 transition-colors border border-border"
            >
              <Trash2 size={10} /> Clear Completed
            </button>
          )}
          {queue.failed.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Hide" : "Show"} jobs
            </button>
          )}
        </div>
      </div>

      {/* Failed jobs list */}
      {expanded && queue.failed.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {queue.failed.map(job => (
            <div key={job.id} className="px-4 py-2.5 bg-red-50/40">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{job.name} <span className="text-muted-foreground font-normal">#{job.id}</span></p>
                  <p className="text-[11px] text-red-600 mt-0.5 break-words">{job.failedReason}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtTs(job.timestamp)}</p>
                  <p className="text-[10px] text-muted-foreground">{job.attemptsMade} attempt{job.attemptsMade !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterQueuePage() {
  const [queues,   setQueues]   = useState<QueueInfo[]>([]);
  const [totals,   setTotals]   = useState<Totals | null>(null);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get<{ queues: QueueInfo[]; totals: Totals }>("/master/queue");
      setQueues(data.queues);
      setTotals(data.totals);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function retryFailed(name: string) {
    try {
      await masterApi.post(`/master/queue/${name}/retry-failed`);
      await load();
      toast.success(`Retrying failed jobs in ${QUEUE_LABELS[name] ?? name}.`);
    } catch {
      toast.error("Failed to retry jobs.");
    }
  }

  async function cleanFailed(name: string) {
    try {
      await masterApi.delete(`/master/queue/${name}/failed`);
      await load();
      toast.success(`Cleared failed jobs from ${QUEUE_LABELS[name] ?? name}.`);
    } catch {
      toast.error("Failed to clear jobs.");
    }
  }

  async function cleanCompleted(name: string) {
    try {
      await masterApi.delete(`/master/queue/${name}/completed`);
      await load();
      toast.success(`Cleared completed jobs from ${QUEUE_LABELS[name] ?? name}.`);
    } catch {
      toast.error("Failed to clear jobs.");
    }
  }

  const totalFailed = totals?.failed ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${AMBER}, #fbbf24)` }} />
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Queue Monitor</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totals ? (
                <>
                  <span className="font-semibold text-foreground">{totals.active}</span> active ·{" "}
                  <span className="font-semibold text-amber-600">{totals.waiting}</span> waiting ·{" "}
                  {totalFailed > 0 ? (
                    <span className="font-semibold text-red-500">{totalFailed} failed</span>
                  ) : (
                    <span className="font-semibold text-green-600">0 failed</span>
                  )}
                </>
              ) : (
                <span className="inline-block w-48 h-4 bg-gray-100 rounded animate-pulse" />
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Total pills */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-gray-50 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              <Zap size={12} className="text-blue-500" />
              <span className="text-foreground">{totals?.active ?? "—"}</span>
              <span>active</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-gray-50 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              <CheckCircle2 size={12} className="text-green-500" />
              <span className="text-foreground">{totals?.completed ?? "—"}</span>
              <span>completed</span>
            </div>
            {totalFailed > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-600 whitespace-nowrap">
                <AlertTriangle size={12} />
                <span>{totalFailed}</span>
                <span>failed</span>
              </div>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-muted-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Waiting",   value: totals?.waiting,   color: AMBER,      bg: "rgba(245,158,11,0.08)", icon: Clock          },
          { label: "Active",    value: totals?.active,    color: "#3b82f6",  bg: "rgba(59,130,246,0.08)", icon: Zap            },
          { label: "Completed", value: totals?.completed, color: "#10b981",  bg: "rgba(16,185,129,0.08)", icon: CheckCircle2   },
          { label: "Failed",    value: totals?.failed,    color: "#ef4444",  bg: "rgba(239,68,68,0.08)",  icon: AlertTriangle  },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Queue cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-4 h-36 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((__, j) => (
                  <div key={j} className="h-12 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {queues.map(q => (
            <QueueCard
              key={q.name}
              queue={q}
              onRetry={retryFailed}
              onClean={cleanFailed}
              onCleanCompleted={cleanCompleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
