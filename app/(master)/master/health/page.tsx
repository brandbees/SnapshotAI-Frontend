"use client";

import { useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";
import { HeartPulse, RefreshCw, CheckCircle, XCircle, Database, Zap, Cpu, BarChart3 } from "lucide-react";

interface HealthData {
  status: "healthy" | "degraded";
  checked_at: string;
  duration_ms: number;
  checks: {
    database: {
      status: string; latency_ms?: number;
      pool_total?: number; pool_idle?: number; pool_waiting?: number; error?: string;
    };
    redis: {
      status: string; latency_ms?: number; used_memory?: string; error?: string;
    };
    process: {
      uptime_human: string; uptime_seconds: number;
      heap_used_mb: number; heap_total_mb: number; rss_mb: number;
      node_version: string; platform: string;
    };
    platform: {
      total_agencies: number; total_sites: number; audits_24h: number; scans_24h: number; error?: string;
    };
  };
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle size={16} className="text-green-500" />
    : <XCircle size={16} className="text-red-500" />;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await masterApi.get("/master/health");
      setData(res.data);
    } catch {
      setError("Failed to load health data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const healthy = data?.status === "healthy";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: healthy || !data ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#ef4444,#dc2626)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: healthy || !data ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
              <HeartPulse size={20} style={{ color: healthy || !data ? "#10b981" : "#ef4444" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">System Health</h1>
              {data && (
                <p className="text-sm text-muted-foreground">
                  {healthy ? "All systems operational" : "One or more systems degraded"} · checked in {data.duration_ms}ms
                </p>
              )}
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={16} className="text-blue-500" />
              <h2 className="font-semibold text-foreground">PostgreSQL</h2>
              <span className="ml-auto"><StatusIcon ok={data.checks.database.status === "ok"} /></span>
            </div>
            {data.checks.database.error ? (
              <p className="text-sm text-red-500">{data.checks.database.error}</p>
            ) : (
              <>
                <StatRow label="Latency" value={`${data.checks.database.latency_ms}ms`} />
                <StatRow label="Pool total" value={data.checks.database.pool_total ?? "—"} />
                <StatRow label="Pool idle" value={data.checks.database.pool_idle ?? "—"} />
                <StatRow label="Pool waiting" value={data.checks.database.pool_waiting ?? "—"} />
              </>
            )}
          </div>

          {/* Redis */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-red-500" />
              <h2 className="font-semibold text-foreground">Redis</h2>
              <span className="ml-auto"><StatusIcon ok={data.checks.redis.status === "ok"} /></span>
            </div>
            {data.checks.redis.error ? (
              <p className="text-sm text-red-500">{data.checks.redis.error}</p>
            ) : (
              <>
                <StatRow label="Latency" value={`${data.checks.redis.latency_ms}ms`} />
                <StatRow label="Memory used" value={data.checks.redis.used_memory ?? "—"} />
              </>
            )}
          </div>

          {/* Process */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-purple-500" />
              <h2 className="font-semibold text-foreground">Node Process</h2>
              <span className="ml-auto"><StatusIcon ok={true} /></span>
            </div>
            <StatRow label="Uptime" value={data.checks.process.uptime_human} />
            <StatRow label="Heap used" value={`${data.checks.process.heap_used_mb} MB`} />
            <StatRow label="Heap total" value={`${data.checks.process.heap_total_mb} MB`} />
            <StatRow label="RSS" value={`${data.checks.process.rss_mb} MB`} />
            <StatRow label="Node version" value={data.checks.process.node_version} />
            <StatRow label="Platform" value={data.checks.process.platform} />
          </div>

          {/* Platform stats */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-amber-500" />
              <h2 className="font-semibold text-foreground">Platform Stats</h2>
              <span className="ml-auto"><StatusIcon ok={!data.checks.platform.error} /></span>
            </div>
            {data.checks.platform.error ? (
              <p className="text-sm text-red-500">{data.checks.platform.error}</p>
            ) : (
              <>
                <StatRow label="Total agencies" value={data.checks.platform.total_agencies} />
                <StatRow label="Total sites" value={data.checks.platform.total_sites} />
                <StatRow label="Audits (24h)" value={data.checks.platform.audits_24h} />
                <StatRow label="Scans (24h)" value={data.checks.platform.scans_24h} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
