"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, RefreshCw, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface ActivityLog {
  id: string;
  site_id: string | null;
  site_name: string | null;
  site_url: string | null;
  actor_email: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  site_added:        { label: "Site Added",        color: "bg-green-100 text-green-700"  },
  site_deleted:      { label: "Site Deleted",      color: "bg-red-100 text-red-700"      },
  bulk_run_audit:    { label: "Bulk Audit",         color: "bg-[var(--accent-light)] text-[var(--accent-hover)]"},
  bulk_trigger_scan: { label: "Bulk Scan",          color: "bg-purple-100 text-purple-700"},
  bulk_send_report:  { label: "Bulk Report",        color: "bg-blue-100 text-blue-700"   },
  audit_triggered:   { label: "Audit Triggered",   color: "bg-[var(--accent-light)] text-[var(--accent-hover)]"},
  report_sent:       { label: "Report Sent",        color: "bg-blue-100 text-blue-700"   },
  plugin_connected:  { label: "Plugin Connected",   color: "bg-green-100 text-green-700" },
};

function actionMeta(action: string) {
  return ACTION_LABELS[action] ?? { label: action.replace(/_/g, " "), color: "bg-gray-100 text-gray-600" };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PAGE_SIZE = 25;

export default function ActivityPage() {
  const [logs, setLogs]       = useState<ActivityLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchLogs = useCallback(async (offset: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ logs: ActivityLog[]; total: number }>(
        `/activity?limit=${PAGE_SIZE}&offset=${offset}`
      );
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      setError("Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page * PAGE_SIZE); }, [fetchLogs, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All significant actions across your agency account
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page * PAGE_SIZE)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl shadow-elevated-sm hover:shadow-elevated-md transition-shadow duration-base overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive px-5 py-8">{error}</p>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Activity size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const meta = actionMeta(log.action);
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  {/* Action badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${meta.color}`}>
                    {meta.label}
                  </span>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    {log.site_name ? (
                      <Link
                        href={log.site_id ? `/sites/${log.site_id}` : "#"}
                        className="text-sm font-medium text-foreground hover:text-accent hover:underline truncate block"
                      >
                        {log.site_name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {log.details && typeof log.details === "object" && "name" in log.details
                          ? String(log.details.name)
                          : "—"}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {log.site_url && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Globe size={9} />
                          {log.site_url.replace(/^https?:\/\//, "")}
                        </span>
                      )}
                      {log.actor_email && (
                        <span className="text-[10px] text-muted-foreground">
                          by {log.actor_email}
                        </span>
                      )}
                      {log.details && "count" in log.details && (
                        <span className="text-[10px] text-muted-foreground">
                          {String(log.details.count)} site{Number(log.details.count) !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
