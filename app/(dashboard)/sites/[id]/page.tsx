"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Settings, ExternalLink, Wifi } from "lucide-react";
import { useSite } from "@/hooks/useSite";
import { useAuditStatus } from "@/hooks/useAuditStatus";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { UptimeBadge } from "@/components/dashboard/UptimeBadge";
import { MalwareBadge } from "@/components/dashboard/MalwareBadge";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AuditHistoryTable } from "@/components/dashboard/AuditHistoryTable";
import { PluginStatusPanel } from "@/components/sites/PluginStatusPanel";
import { SecurityNotificationsPanel } from "@/components/sites/SecurityNotificationsPanel";
import { LoadingPage, LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import { timeAgo } from "@/lib/utils";

type PillarKey = "performance" | "seo" | "security" | "malware";

interface PillarDef {
  key: PillarKey;
  label: string;
  sublabelFn: (s: number, prev?: number) => string | undefined;
  isMalware?: boolean;
}

const pillarConfig: PillarDef[] = [
  {
    key: "performance",
    label: "Performance",
    sublabelFn: (s, prev) =>
      prev !== undefined ? `${s > prev ? "+" : ""}${s - prev}% from last audit` : undefined,
  },
  {
    key: "seo",
    label: "SEO Score",
    sublabelFn: (s) => (s < 80 ? "Issues detected" : "Good"),
  },
  {
    key: "security",
    label: "Security",
    sublabelFn: (s) => (s >= 90 ? "Hardened" : s >= 70 ? "Good" : "At risk"),
  },
  {
    key: "malware",
    label: "Malware",
    sublabelFn: (s) => (s >= 80 ? "No threats found" : "Threats found"),
    isMalware: true,
  },
];

function sublabelVariant(key: string, score: number): "good" | "warn" | "bad" | "muted" {
  if (key === "malware") return score >= 80 ? "good" : "bad";
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { site, loading, error, refetch } = useSite(id);
  const [pendingAuditId, setPendingAuditId] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const { done: auditDone } = useAuditStatus(pendingAuditId);

  // When audit finishes, refresh site data
  if (auditDone && pendingAuditId) {
    setPendingAuditId(null);
    refetch();
  }

  async function runAudit() {
    setAuditLoading(true);
    try {
      const { data } = await api.post<{ audit_id: string }>(`/audits/${id}/run`);
      setPendingAuditId(data.audit_id);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }

  if (loading) return <LoadingPage />;
  if (error || !site) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error || "Site not found."}</p>
      </div>
    );
  }

  const scores = site.latest_scores;
  const prevAudit = site.audits[1];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">
              {site.url.replace(/^https?:\/\//, "")}
            </h1>
            <Badge
              variant={site.uptime_status === "up" ? "success" : "danger"}
              dot
            >
              {site.uptime_status === "up" ? "Online" : "Down"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm">
              <Settings size={13} />
              Edit Settings
            </Button>
            <Button
              size="sm"
              loading={auditLoading || !!pendingAuditId}
              onClick={runAudit}
            >
              <RefreshCw size={13} />
              {pendingAuditId ? "Running…" : "Manual Sync"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-9">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{site.name}</span>
          </p>
          {site.last_audit_at && (
            <span className="text-xs text-muted-foreground">
              · Last updated {timeAgo(site.last_audit_at)}
            </span>
          )}
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 ml-auto"
          >
            <ExternalLink size={11} />
            Visit site
          </a>
        </div>

        {/* Audit running indicator */}
        {pendingAuditId && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-blue-700 font-medium">
              Audit in progress — results will appear automatically
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 space-y-5">
        {/* Score gauges row */}
        {scores ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {pillarConfig.map(({ key, label, sublabelFn, isMalware }) => {
              const score = scores[key];
              const prevScore = prevAudit?.scores?.[key];
              const sub = sublabelFn(score, prevScore);
              const variant = sublabelVariant(key, score);
              return (
                <Card key={key} padding="md" className="flex justify-center">
                  <ScoreGauge
                    score={score}
                    label={label}
                    sublabel={sub}
                    sublabelVariant={variant}
                    size="lg"
                    isMalware={!!isMalware}
                  />
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="flex items-center justify-center py-12">
            <div className="text-center">
              <Wifi size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No audit data yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run your first audit to see scores
              </p>
              <Button className="mt-4" size="sm" onClick={runAudit} loading={auditLoading}>
                Run first audit
              </Button>
            </div>
          </Card>
        )}

        {/* Main content + right sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: chart + audit history */}
          <div className="lg:col-span-2 space-y-5">
            {/* Trend chart */}
            {site.audits.filter((a) => a.status === "completed").length >= 2 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Score Trend History</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Aggregated performance over time
                  </p>
                </CardHeader>
                <TrendChart audits={site.audits} />
              </Card>
            ) : null}

            {/* Audit history */}
            <Card>
              <CardHeader>
                <CardTitle>Audit History</CardTitle>
                <button className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
                  Export All
                </button>
              </CardHeader>
              <AuditHistoryTable audits={site.audits} />
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <PluginStatusPanel
              plugins={site.plugin_data?.plugins}
              isConnected={site.plugin_connected}
              lastSync={site.plugin_data?.last_sync}
            />
            <SecurityNotificationsPanel
              siteId={site.id}
              defaultEmail={`admin@${site.url.replace(/^https?:\/\//, "").split("/")[0]}`}
            />

            {/* Site info card */}
            {site.plugin_data && (
              <Card>
                <CardHeader>
                  <CardTitle>Site Info</CardTitle>
                </CardHeader>
                <div className="space-y-2">
                  {[
                    { label: "WordPress", value: site.plugin_data.wp_version },
                    { label: "PHP", value: site.plugin_data.php_version },
                    { label: "Server", value: site.plugin_data.server_software },
                    { label: "Plugins", value: site.plugin_data.active_plugins_count !== undefined ? `${site.plugin_data.active_plugins_count} active` : undefined },
                  ]
                    .filter((r) => r.value)
                    .map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
