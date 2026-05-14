"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, RefreshCw, ExternalLink, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Shield, Package, ShoppingCart, Wifi, Key, Copy, Eye, EyeOff,
} from "lucide-react";
import { useSite } from "@/hooks/useSite";
import { useAuditStatus } from "@/hooks/useAuditStatus";
import { useRole } from "@/hooks/useRole";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AuditHistoryTable } from "@/components/dashboard/AuditHistoryTable";
import { MalwareBadge } from "@/components/dashboard/MalwareBadge";
import { UptimeBadge } from "@/components/dashboard/UptimeBadge";
import { LoadingPage, LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import { scoreColor, timeAgo } from "@/lib/utils";
import type { Site, Audit, ScanResult, SeoData } from "@/types";

// ── Tab config ────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "security"
  | "performance"
  | "seo"
  | "malware"
  | "plugins"
  | "woocommerce";

const BASE_TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "security", label: "Security" },
  { key: "performance", label: "Performance" },
  { key: "seo", label: "SEO" },
  { key: "malware", label: "Malware" },
  { key: "plugins", label: "Plugins" },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function sslDaysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function getSeoCheck(data: SeoData, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const val = data[key];
    if (val === undefined || val === null) continue;
    if (typeof val === "boolean") return val;
    if (typeof val === "object" && "present" in (val as object))
      return (val as { present?: boolean }).present ?? null;
    if (typeof val === "string") return val.length > 0;
  }
  return null;
}

// ── Signal row (Security + Performance) ──────────────────────────────────────

function SignalRow({
  label,
  value,
  risky,
  na = false,
  text,
}: {
  label: string;
  value: boolean | null | undefined;
  risky: boolean; // true when value=true is bad
  na?: boolean;
  text?: string;
}) {
  if (value === null || value === undefined || na) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{text || "Unknown"}</span>
      </div>
    );
  }
  const isRisk = risky ? value : !value;
  const Icon = isRisk ? XCircle : CheckCircle2;
  const color = isRisk ? "var(--score-bad)" : "var(--score-good)";
  const statusText =
    text ??
    (risky
      ? value ? "Enabled (risk)" : "Disabled (safe)"
      : value ? "Active (safe)" : "Not active (risk)");
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{statusText}</span>
        <Icon size={15} style={{ color }} />
      </div>
    </div>
  );
}

// ── Plugin data panel (collapsible) ──────────────────────────────────────────

function PluginDataPanel({ site }: { site: Site }) {
  const [open, setOpen] = useState(false);
  const pd = site.plugin_data;
  if (!pd && !site.mysql_version && !site.memory_limit) return null;

  const rows = [
    { label: "WordPress", value: pd?.wp_version },
    { label: "PHP", value: pd?.php_version },
    { label: "MySQL", value: site.mysql_version },
    { label: "Server", value: pd?.server_software },
    { label: "Memory limit", value: site.memory_limit },
    { label: "DB size", value: site.database_size_mb != null ? `${site.database_size_mb} MB` : undefined },
    { label: "Last sync", value: pd?.last_sync ? timeAgo(pd.last_sync) : undefined },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-semibold text-foreground"
      >
        Server & Environment
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="px-5 py-3 space-y-0 bg-surface">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  site,
  audits,
  runAudit,
  auditLoading,
  canRunAudit,
}: {
  site: Site;
  audits: Audit[];
  runAudit: () => void;
  auditLoading: boolean;
  canRunAudit: boolean;
}) {
  const scores = site.latest_scores;
  const prevAudit = audits[1];

  const pillarConfig: {
    key: "performance" | "seo" | "security" | "malware";
    label: string;
    isMalware?: boolean;
  }[] = [
    { key: "performance", label: "Performance" },
    { key: "seo", label: "SEO" },
    { key: "security", label: "Security" },
    { key: "malware", label: "Malware", isMalware: true },
  ];

  function sublabelVariant(key: string, score: number): "good" | "warn" | "bad" {
    if (key === "malware") return score >= 80 ? "good" : "bad";
    return score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
  }

  return (
    <div className="space-y-5">
      {scores ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pillarConfig.map(({ key, label, isMalware }) => {
            const score = scores[key];
            const prevScore = prevAudit?.scores?.[key];
            const delta =
              prevScore !== undefined ? score - prevScore : undefined;
            const sub =
              delta === undefined
                ? undefined
                : delta === 0
                ? "No change"
                : `${delta > 0 ? "+" : ""}${delta} from last`;
            return (
              <Card key={key} padding="md" className="flex flex-col items-center justify-center min-h-[200px]">
                <ScoreGauge
                  score={score}
                  label={label}
                  sublabel={sub}
                  sublabelVariant={delta === 0 ? "warn" : sublabelVariant(key, score)}
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
            {canRunAudit && (
              <Button className="mt-4" size="sm" onClick={runAudit} loading={auditLoading}>
                Run first audit
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {audits.filter((a) => a.status === "completed").length >= 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Score Trend</CardTitle>
              </CardHeader>
              <TrendChart audits={audits} />
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
            </CardHeader>
            <AuditHistoryTable audits={audits} />
          </Card>
        </div>
        <div>
          <PluginDataPanel site={site} />
        </div>
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab({ site }: { site: Site }) {
  const score = site.latest_scores?.security;
  const sslDays = sslDaysRemaining(site.ssl_expiry_date);
  const sslText =
    sslDays === null
      ? undefined
      : sslDays <= 0
      ? "Expired"
      : `${sslDays}d remaining`;
  const sslColor =
    sslDays === null
      ? undefined
      : sslDays <= 7
      ? "var(--score-bad)"
      : sslDays <= 30
      ? "var(--score-warn)"
      : "var(--score-good)";

  const adminNames = site.admin_usernames ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-3">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Security Score"
              sublabel={score >= 80 ? "Hardened" : score >= 50 ? "Needs work" : "At risk"}
              sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
              size="lg"
            />
          ) : (
            <div className="text-center py-6">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </Card>

        {/* Security signals */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              Security Signals
            </p>
            <SignalRow label="XML-RPC" value={site.xml_rpc_enabled} risky={true} />
            <SignalRow label="File Editor" value={site.file_editor_enabled} risky={true} />
            <SignalRow label="Debug Mode" value={site.wp_debug_enabled} risky={true} />
            <SignalRow label="Default Login URL" value={site.login_url_default} risky={true} />
            <SignalRow label="wp-config.php Writable" value={site.wp_config_writable} risky={true} />
            <SignalRow label=".htaccess Writable" value={site.htaccess_writable} risky={true} />
            <SignalRow label="PHP in Uploads" value={site.uploads_php_enabled} risky={true} />

            {/* SSL row (special) */}
            <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm text-foreground">SSL Certificate</span>
              {site.ssl_expiry_date ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: sslColor }}>
                    {sslText}
                  </span>
                  {sslDays !== null && sslDays > 0 ? (
                    <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                  ) : (
                    <XCircle size={15} style={{ color: "var(--score-bad)" }} />
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unknown</span>
              )}
            </div>
          </Card>

          {/* Admin users */}
          {(site.admin_users_count != null || adminNames.length > 0) && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Admin Users
                </p>
                {site.admin_users_count != null && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      color: site.admin_users_count > 2 ? "var(--score-warn)" : "var(--score-good)",
                      background: site.admin_users_count > 2 ? "var(--score-warn-bg, #fef3c7)" : "var(--score-good-bg)",
                    }}
                  >
                    {site.admin_users_count} admin{site.admin_users_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {adminNames.length > 0 ? (
                <div className="space-y-1.5">
                  {adminNames.map((name) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-foreground">{name}</span>
                      {name.toLowerCase() === "admin" && (
                        <AlertCircle size={12} style={{ color: "var(--score-warn)" }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No usernames available</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab({ site, audits }: { site: Site; audits: Audit[] }) {
  const score = site.latest_scores?.performance;
  const latestAudit = audits.find((a) => a.status === "completed");
  const perf = latestAudit?.performance_data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-3">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Performance Score"
              sublabel={score >= 80 ? "Fast" : score >= 50 ? "Needs work" : "Slow"}
              sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
              size="lg"
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Scanner metrics */}
          {perf && (
            <Card padding="md">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Speed Metrics
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const p = perf as any;
                  const ttfb: number | null = p.ttfb_ms ?? null;
                  const total: number | null = p.total_ms ?? null;
                  const scripts: number | null = p.script_count ?? null;
                  const htmlKb: number | null = p.html_kb ?? null;
                  return [
                    {
                      label: "TTFB",
                      value: ttfb != null ? `${Number(ttfb).toLocaleString()}ms` : "—",
                      color:
                        ttfb == null
                          ? "var(--muted-foreground)"
                          : ttfb > 800
                          ? "var(--score-bad)"
                          : ttfb > 400
                          ? "var(--score-warn)"
                          : "var(--score-good)",
                    },
                    {
                      label: "Load Time",
                      value: total != null ? `${Number(total).toLocaleString()}ms` : "—",
                      color: "var(--foreground)",
                    },
                    {
                      label: "JS Files",
                      value: scripts != null ? String(scripts) : "—",
                      color:
                        scripts == null
                          ? "var(--muted-foreground)"
                          : scripts > 20
                          ? "var(--score-warn)"
                          : "var(--score-good)",
                    },
                    {
                      label: "HTML Size",
                      value: htmlKb != null ? `${Number(htmlKb).toFixed(1)} KB` : "—",
                      color: "var(--foreground)",
                    },
                  ];
                })().map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {label}
                    </p>
                    <p className="text-lg font-bold tabular-nums" style={{ color }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Caching / CDN signals */}
          <Card padding="md">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              Caching & CDN
            </p>
            {[
              { label: "Caching Plugin", value: site.caching_plugin },
              { label: "CDN Plugin", value: site.cdn_plugin },
              { label: "Image Optimisation", value: site.image_optimization_plugin },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <span className="text-sm text-foreground">{label}</span>
                {value ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{value}</span>
                    <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">None</span>
                    <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-foreground">Object Cache</span>
              {site.object_cache_enabled === null || site.object_cache_enabled === undefined ? (
                <span className="text-xs text-muted-foreground">Unknown</span>
              ) : site.object_cache_enabled ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Enabled</span>
                  <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Disabled</span>
                  <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                </div>
              )}
            </div>
          </Card>

          {/* Real-user metrics placeholder */}
          <Card padding="md" className="border-dashed">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              Real-user Metrics (LCP, CLS, FID, TTFB)
            </p>
            <p className="text-xs text-muted-foreground">
              Enable the JS snippet on this site to start collecting real-user Core Web Vitals.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── SEO Tab ───────────────────────────────────────────────────────────────────

function SeoTab({ site, audits }: { site: Site; audits: Audit[] }) {
  const score = site.latest_scores?.seo;
  const latestAudit = audits.find((a) => a.status === "completed");
  const seoData = latestAudit?.seo_data;

  type SeoCheck = { id: string; label: string; status: "pass" | "fail" | "warn"; detail?: string };
  const CHECK_ROWS: { id: string; label: string }[] = [
    { id: "meta_desc",   label: "Meta Description" },
    { id: "canonical",   label: "Canonical URL" },
    { id: "og_title",    label: "OG / Social Tags" },
    { id: "h1",          label: "H1 Heading" },
    { id: "robots_meta", label: "Robots Meta" },
    { id: "html_lang",   label: "Language Attribute" },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checksArray: SeoCheck[] = Array.isArray((seoData as any)?.checks) ? (seoData as any).checks : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-3">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="SEO Score"
              sublabel={score >= 80 ? "Optimised" : score >= 50 ? "Needs work" : "Poor"}
              sublabelVariant={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}
              size="lg"
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No audit yet</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <Card padding="md">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              On-page Checklist
            </p>
            {!seoData ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Run an audit to see on-page SEO signals.
              </p>
            ) : (
              <div>
                {CHECK_ROWS.map(({ id, label }) => {
                  const check = checksArray.find((c) => c.id === id);
                  const status = check?.status ?? null;
                  return (
                    <div
                      key={id}
                      className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-4"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-foreground">{label}</span>
                        {check?.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{check.detail}</p>
                        )}
                      </div>
                      {status === null ? (
                        <span className="text-xs text-muted-foreground shrink-0">Unknown</span>
                      ) : status === "pass" ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs" style={{ color: "var(--score-good)" }}>Pass</span>
                          <CheckCircle2 size={15} style={{ color: "var(--score-good)" }} />
                        </div>
                      ) : status === "warn" ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs" style={{ color: "var(--score-warn)" }}>Warn</span>
                          <AlertCircle size={15} style={{ color: "var(--score-warn)" }} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs" style={{ color: "var(--score-bad)" }}>Fail</span>
                          <XCircle size={15} style={{ color: "var(--score-bad)" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card padding="md" className="border-dashed mt-4">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
              Broken Links
            </p>
            <p className="text-xs text-muted-foreground">
              Broken link scanning is available in Phase 3B.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Malware Tab ───────────────────────────────────────────────────────────────

function MalwareTab({
  site,
  scans,
  onRunScan,
  scanning,
  canRunScan,
}: {
  site: Site;
  scans: ScanResult[];
  onRunScan: () => void;
  scanning: boolean;
  canRunScan: boolean;
}) {
  const score = site.latest_scores?.malware;
  const [expandedScan, setExpandedScan] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score gauge */}
        <Card padding="lg" className="flex flex-col items-center gap-4">
          {score !== undefined ? (
            <ScoreGauge
              score={score}
              label="Malware Score"
              sublabel={score >= 80 ? "No threats" : "Threats found"}
              sublabelVariant={score >= 80 ? "good" : "bad"}
              size="lg"
              isMalware
            />
          ) : (
            <div className="text-center py-6">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No scan yet</p>
            </div>
          )}
          {canRunScan && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRunScan}
              loading={scanning}
              className="w-full"
            >
              <RefreshCw size={13} />
              {scanning ? "Scanning…" : "Run Scan"}
            </Button>
          )}
        </Card>

        {/* Scan history */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
            </CardHeader>
            {scans.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No scans yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run your first scan to detect malware.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {scans.map((scan) => {
                  const hasThreats = scan.threats && scan.threats.length > 0;
                  const isExpanded = expandedScan === scan.id;
                  return (
                    <div key={scan.id}>
                      <div
                        className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 -mx-5 px-5 transition-colors"
                        onClick={() =>
                          setExpandedScan(isExpanded ? null : scan.id)
                        }
                      >
                        <div className="flex items-center gap-3">
                          {scan.is_clean ? (
                            <CheckCircle2 size={16} style={{ color: "var(--score-good)" }} />
                          ) : (
                            <XCircle size={16} style={{ color: "var(--score-bad)" }} />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {scan.is_clean ? "Clean" : "Threats Detected"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(scan.created_at).toLocaleString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!scan.is_clean && scan.threats && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                color: "var(--score-bad)",
                                background: "var(--score-bad-bg)",
                              }}
                            >
                              {scan.threats.length} threat{scan.threats.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {hasThreats && (
                            isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          )}
                        </div>
                      </div>
                      {isExpanded && hasThreats && (
                        <div className="mx-0 mb-2 bg-red-50 rounded-xl overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-red-100">
                                <th className="px-4 py-2 text-left font-semibold text-red-700">Type</th>
                                <th className="px-4 py-2 text-left font-semibold text-red-700">Severity</th>
                                <th className="px-4 py-2 text-left font-semibold text-red-700">File / Detail</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scan.threats!.map((threat, i) => (
                                <tr key={i} className="border-b border-red-100 last:border-0">
                                  <td className="px-4 py-2 text-foreground">
                                    {threat.threat_type || threat.type || "Unknown"}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span
                                      className="font-semibold capitalize"
                                      style={{
                                        color:
                                          threat.severity === "critical" || threat.severity === "high"
                                            ? "var(--score-bad)"
                                            : threat.severity === "medium"
                                            ? "var(--score-warn)"
                                            : "var(--muted-foreground)",
                                      }}
                                    >
                                      {threat.severity || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                                    {threat.file_path || threat.description || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Plugins Tab ───────────────────────────────────────────────────────────────

function PluginsTab({ site }: { site: Site }) {
  const plugins = site.plugin_data?.plugins ?? [];
  const needsUpdates = site.plugins_needing_updates ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">Active Plugins</h2>
        {needsUpdates > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: "var(--score-warn)",
              background: "var(--score-warn-bg, #fef3c7)",
            }}
          >
            {needsUpdates} update{needsUpdates !== 1 ? "s" : ""} available
          </span>
        )}
      </div>

      {plugins.length === 0 ? (
        <Card className="py-12 text-center">
          <Package size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {site.plugin_connected
              ? "Plugin data will appear after the next cron push."
              : "Connect the WordPress plugin to see active plugins."}
          </p>
        </Card>
      ) : (
        <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {["Plugin", "Version", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plugins.map((plugin) => (
                  <tr key={plugin.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {plugin.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground font-mono">
                        {plugin.version || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {plugin.update_available ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: "var(--score-warn)",
                            background: "var(--score-warn-bg, #fef3c7)",
                          }}
                        >
                          Update available
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            color: "var(--score-good)",
                            background: "var(--score-good-bg)",
                          }}
                        >
                          Up to date
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WooCommerce Tab ───────────────────────────────────────────────────────────

function WooCommerceTab({ site }: { site: Site }) {
  const stats = [
    {
      label: "Total Orders",
      value: site.woo_order_count != null ? String(site.woo_order_count) : "—",
    },
    {
      label: "Total Revenue",
      value:
        site.woo_revenue != null
          ? `$${Number(site.woo_revenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <Card key={label} padding="md">
            <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Card padding="md" className="border-dashed">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart size={14} className="text-muted-foreground" />
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Extended WooCommerce Data
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Orders 7d/30d, revenue trends, failed orders, and payment gateway health
          will be available in Phase 3B when the plugin sends extended WooCommerce metrics.
        </p>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { site, loading, error, refetch } = useSite(id);
  const { roleCanDo } = useRole();
  const canRunAudit = roleCanDo("run_audit");
  const canDeleteSite = roleCanDo("delete_site");
  const [pendingAuditId, setPendingAuditId] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  function copyToken(token: string) {
    navigator.clipboard.writeText(token).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }

  const rawTab = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(rawTab ?? "overview");

  const { done: auditDone } = useAuditStatus(pendingAuditId);
  if (auditDone && pendingAuditId) {
    setPendingAuditId(null);
    refetch();
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    router.push(`/sites/${id}?tab=${tab}`, { scroll: false });
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

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteLoading(true);
    try {
      await api.delete(`/sites/${id}`);
      router.replace("/sites");
    } catch {
      setDeleteLoading(false);
      setDeleteConfirm(false);
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

  const tabs = [
    ...BASE_TABS,
    ...(site.woocommerce_active
      ? [{ key: "woocommerce" as Tab, label: "WooCommerce" }]
      : []),
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
              {site.name}
            </h1>
            <UptimeBadge status={site.uptime_status} />
            <MalwareBadge status={site.malware_status} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canDeleteSite && deleteConfirm && (
              <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
            )}
            {canDeleteSite && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDelete}
                loading={deleteLoading}
                className={deleteConfirm ? "border-red-300 text-red-600 hover:bg-red-50" : ""}
              >
                <Trash2 size={13} />
                {deleteConfirm ? "Confirm?" : "Delete"}
              </Button>
            )}
            {canRunAudit && (
              <Button
                size="sm"
                loading={auditLoading || !!pendingAuditId}
                onClick={runAudit}
              >
                <RefreshCw size={13} />
                {pendingAuditId ? "Running…" : "Run Audit"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pl-9 flex-wrap">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
          >
            {site.url.replace(/^https?:\/\//, "")}
            <ExternalLink size={10} />
          </a>
          {site.last_audit_at && (
            <span className="text-xs text-muted-foreground">
              · Last audit {timeAgo(site.last_audit_at)}
            </span>
          )}

          {/* Site token */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Key size={10} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono select-all">
              {tokenVisible ? site.site_token : `${site.site_token.slice(0, 6)}••••••••`}
            </span>
            <button
              onClick={() => setTokenVisible((v) => !v)}
              title={tokenVisible ? "Hide token" : "Show token"}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {tokenVisible ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button
              onClick={() => copyToken(site.site_token)}
              title="Copy site token"
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {tokenCopied ? (
                <CheckCircle2 size={11} style={{ color: "var(--score-good)" }} />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>
        </div>

        {/* Audit running banner */}
        {pendingAuditId && (
          <div className="mt-3 ml-9 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg max-w-sm">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-blue-700 font-medium">
              Audit running — results will update automatically
            </p>
          </div>
        )}
      </div>

      {/* ── Tab nav ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface px-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={[
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              ].join(" ")}
            >
              {label}
              {key === "woocommerce" && (
                <ShoppingCart size={11} className="inline ml-1 opacity-60" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        {activeTab === "overview" && (
          <OverviewTab
            site={site}
            audits={site.audits}
            runAudit={runAudit}
            auditLoading={auditLoading}
            canRunAudit={canRunAudit}
          />
        )}
        {activeTab === "security" && <SecurityTab site={site} />}
        {activeTab === "performance" && (
          <PerformanceTab site={site} audits={site.audits} />
        )}
        {activeTab === "seo" && <SeoTab site={site} audits={site.audits} />}
        {activeTab === "malware" && (
          <MalwareTab
            site={site}
            scans={site.scans}
            onRunScan={runAudit}
            scanning={auditLoading || !!pendingAuditId}
            canRunScan={canRunAudit}
          />
        )}
        {activeTab === "plugins" && <PluginsTab site={site} />}
        {activeTab === "woocommerce" && <WooCommerceTab site={site} />}
      </div>
    </div>
  );
}
