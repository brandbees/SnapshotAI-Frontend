"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, ChevronDown, Loader2, Globe, RotateCcw, Sparkles, Copy, Check,
         Zap, Play, FileText, Calendar, List, ShieldCheck, ExternalLink, Database, X,
         AlertTriangle, CheckCircle2, Trash2, Wrench, Undo2,
         Terminal, Lock, KeyRound, ChevronUp, Wifi, WifiOff, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { mapSite, type RawSite } from "@/lib/mappers";
import { useAuth } from "@/hooks/useAuth";
import type { Site, AgentMessage } from "@/types";
import { IconChip } from "@/components/ui/IconChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const SUGGESTIONS_GLOBAL = [
  { q: "Which site has the lowest overall score?",    icon: "📉" },
  { q: "Are any sites under malware threat?",         icon: "🛡️" },
  { q: "Which sites have plugins needing updates?",   icon: "🔌" },
  { q: "Is any site currently down?",                 icon: "📡" },
];

const SUGGESTIONS_SITE = [
  { q: "What's the most urgent thing to fix?",              icon: "🚨" },
  { q: "Is XML-RPC enabled? Is WP_DEBUG on?",               icon: "🔐" },
  { q: "What are my largest autoloaded options?",           icon: "🗄️" },
  { q: "Show me the last 100 lines of my error log",        icon: "📋" },
  { q: "What are my biggest media files?",                  icon: "🖼️" },
  { q: "Check my file and folder permissions",              icon: "🔒" },
  { q: "How many cron events do I have scheduled?",         icon: "⏰" },
  { q: "Show my WooCommerce orders and revenue",            icon: "🛒" },
  { q: "Do I have orphaned post meta rows?",                icon: "🗑️" },
  { q: "What plugins have known vulnerabilities?",          icon: "⚠️" },
  { q: "Do I have too many post revisions?",                icon: "📝" },
  { q: "Run an audit on this site",                         icon: "▶️" },
];

interface TokenState {
  tokens_used:      number;
  tokens_limit:     number;   // base + total purchased (e.g. 270k)
  tokens_extra:     number;   // total extra purchased (e.g. 250k)
  extra_remaining?: number;   // extra still available (e.g. 43k)
  monthly_limit?:   number;   // plan base limit (e.g. 20k)
}

interface ToolCall {
  name:   string;
  args:   Record<string, unknown>;
  result: Record<string, unknown>;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  run_audit:                { label: "Audit triggered",           icon: Play,        color: "#1f5fb8" },
  send_report:              { label: "Report queued",             icon: FileText,    color: "#0ea5e9" },
  update_schedule:          { label: "Schedule updated",          icon: Calendar,    color: "#10b981" },
  list_sites:               { label: "Sites fetched",             icon: List,        color: "#8b5cf6" },
  get_scores:               { label: "Scores retrieved",          icon: Zap,         color: "#f59e0b" },
  get_malware_status:       { label: "Malware status checked",    icon: ShieldCheck, color: "#ef4444" },
  analyze_malware_findings: { label: "AI malware analysis",       icon: Sparkles,    color: "#7c3aed" },
  analyze_plugin_usage:     { label: "Plugin usage analyzed",      icon: Sparkles,    color: "#7c3aed" },
  get_live_site_data:       { label: "Live data fetched",         icon: Database,    color: "#0891b2" },
  preview_write_operation:  { label: "Write preview ready",       icon: Wrench,      color: "#7c3aed" },
  ssh_read_file:            { label: "File read via SSH",          icon: Terminal,    color: "#0f766e" },
  ssh_list_directory:       { label: "Directory listed via SSH",   icon: Terminal,    color: "#0f766e" },
  ssh_find_pattern:         { label: "Pattern search via SSH",     icon: Terminal,    color: "#0f766e" },
  ssh_read_log:             { label: "Log read via SSH",           icon: Terminal,    color: "#0f766e" },
  ssh_check_permissions:    { label: "Permissions checked via SSH",icon: Terminal,    color: "#0f766e" },
  ssh_execute_command:      { label: "Command executed via SSH",   icon: Terminal,    color: "#0d6f5e" },
  ssh_write_file:           { label: "File written via SSH",       icon: Terminal,    color: "#0d6f5e" },
  ssh_delete_file:          { label: "File deleted via SSH",       icon: Terminal,    color: "#b91c1c" },
  ssh_backup_file:          { label: "Backup created via SSH",     icon: Terminal,    color: "#0d6f5e" },
};

interface WritePreview {
  write_preview:  boolean;
  operation:      string;
  site_id:        string;
  site_name:      string;
  risk_level:     "low" | "medium" | "high";
  risk_label:     string;
  risk_color:     string;
  description:    string;
  counts:         Record<string, unknown>;
  target_options: string[] | null;
  can_undo:       boolean;
  // Extra params for new operations
  plugin_path?:   string | null;
  user_id?:       number | null;
  constant?:      string | null;
  value?:         unknown;
}

const OP_LABELS: Record<string, string> = {
  delete_expired_transients: "Delete Expired Transients",
  fix_file_permissions:      "Fix File Permissions",
  delete_post_revisions:     "Delete Post Revisions",
  optimize_db_tables:        "Optimize DB Tables",
  delete_orphaned_options:   "Delete Orphaned Options",
  clear_all_transients:      "Clear All Transients",
};

function WriteBatch({ writeCalls, siteId, onSuccess, isMulti }: {
  writeCalls: ToolCall[];
  siteId: string;
  onSuccess?: (operation: string, resultMsg: string, counts: Record<string, unknown>) => void;
  isMulti: boolean;
}) {
  const [bulkTrigger, setBulkTrigger] = useState(0);
  const [bulkFired, setBulkFired]     = useState(false);

  const confirmAll = () => {
    setBulkTrigger(t => t + 1);
    setBulkFired(true);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5" style={{ color: "#d97706" }}>
          <AlertTriangle size={11} />
          <span className="text-[11px] font-semibold tracking-wide uppercase">
            Action{isMulti ? "s require" : " requires"} confirmation
          </span>
        </div>
        {isMulti && !bulkFired && (
          <button
            onClick={confirmAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-white text-[11px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #d97706, #b45309)", boxShadow: "0 1px 6px rgba(180,83,9,0.35)" }}
          >
            <CheckCircle2 size={11} />
            Confirm All ({writeCalls.length})
          </button>
        )}
      </div>
      {writeCalls.map((tc, j) => (
        <WriteConfirmCard key={j} call={tc} siteId={siteId} onSuccess={onSuccess} bulkTrigger={bulkTrigger} />
      ))}
    </div>
  );
}

function WriteConfirmCard({ call, siteId, onSuccess, bulkTrigger }: {
  call: ToolCall;
  siteId: string;
  onSuccess?: (operation: string, resultMsg: string, counts: Record<string, unknown>) => void;
  bulkTrigger?: number;
}) {
  const preview = call.result as unknown as WritePreview;
  const [phase, setPhase]         = useState<"idle" | "running" | "done" | "undo_running" | "undone" | "error">("idle");
  const [resultMsg, setResultMsg] = useState<string>("");
  const [snapshotId, setSnapshotId] = useState<string>("");
  const [canUndo, setCanUndo]     = useState<boolean>(false);
  const [dismissed, setDismissed] = useState(false);

  // Hoisted so useEffect can reference it before the early-return guard
  const confirm = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("running");
    try {
      const { data } = await api.post<{ success: boolean; snapshot_id: string; can_undo: boolean; message: string }>("/agent/write", {
        site_id:        siteId,
        operation:      preview.operation,
        target_options: preview.target_options  ?? undefined,
        plugin_path:    preview.plugin_path     ?? undefined,
        user_id:        preview.user_id         ?? undefined,
        constant:       preview.constant        ?? undefined,
        value:          preview.value           ?? undefined,
      });
      setSnapshotId(data.snapshot_id);
      setCanUndo(data.can_undo);
      const msg = data.message ?? "Operation completed.";
      setResultMsg(msg);
      setPhase("done");
      onSuccess?.(preview.operation, msg, (preview.counts ?? {}) as Record<string, unknown>);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setResultMsg(msg ?? "Operation failed. Please try again.");
      setPhase("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, siteId, preview.operation]);

  // Bulk-trigger: when parent increments bulkTrigger, fire confirm if still idle
  useEffect(() => {
    if (bulkTrigger && bulkTrigger > 0) confirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkTrigger]);

  if (dismissed) return null;

  const riskIcon = preview.risk_level === "low"
    ? <CheckCircle2 size={13} className="text-green-600 shrink-0" />
    : preview.risk_level === "medium"
    ? <AlertTriangle size={13} className="text-yellow-500 shrink-0" />
    : <AlertTriangle size={13} className="text-red-500 shrink-0" />;

  const undo = async () => {
    setPhase("undo_running");
    try {
      const { data } = await api.post<{ message: string }>("/agent/write/undo", { snapshot_id: snapshotId });
      setResultMsg(data.message ?? "Undo completed.");
      setPhase("undone");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setResultMsg(msg ?? "Undo failed.");
      setPhase("error");
    }
  };

  const borderColor = preview.risk_level === "low" ? "#16a34a" : preview.risk_level === "medium" ? "#d97706" : "#dc2626";
  const bgColor     = preview.risk_level === "low" ? "#f0fdf4" : preview.risk_level === "medium" ? "#fffbeb" : "#fef2f2";

  return (
    <div className="mt-2 rounded-xl border overflow-hidden text-xs" style={{ borderColor, background: bgColor }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor }}>
        <div className="flex items-center gap-2">
          <Wrench size={12} style={{ color: preview.risk_color }} />
          <span className="font-semibold" style={{ color: preview.risk_color }}>
            {OP_LABELS[preview.operation] ?? preview.operation}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {riskIcon}
          <span className="font-medium" style={{ color: preview.risk_color }}>{preview.risk_label}</span>
          {phase === "idle" && (
            <button onClick={() => setDismissed(true)} className="ml-1 p-0.5 rounded hover:bg-black/10 text-muted-foreground">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5 space-y-2.5">
        <p className="text-foreground leading-snug">{preview.description}</p>

        {/* Result / undo */}
        {phase === "done" && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-green-700">
              <Check size={11} />
              <span>{resultMsg}</span>
            </div>
            {canUndo && (
              <button onClick={undo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors">
                <Undo2 size={10} /> Undo
              </button>
            )}
          </div>
        )}

        {(phase === "undo_running" || phase === "undone") && (
          <div className="flex items-center gap-1.5 text-foreground">
            {phase === "undo_running"
              ? <><Loader2 size={11} className="animate-spin" /> Undoing…</>
              : <><Check size={11} className="text-green-600" /> {resultMsg}</>
            }
          </div>
        )}

        {phase === "error" && (
          <p className="text-destructive">{resultMsg}</p>
        )}

        {/* Irreversible warning — shown before user confirms */}
        {phase === "idle" && !preview.can_undo && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertTriangle size={11} />
            <span>This action is irreversible — it cannot be undone.</span>
          </div>
        )}

        {/* Confirm / cancel buttons */}
        {phase === "idle" && (
          <div className="flex items-center gap-2 pt-0.5">
            <button onClick={confirm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
              style={{ background: preview.risk_color }}>
              <Trash2 size={11} /> Confirm
            </button>
            <button onClick={() => setDismissed(true)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {phase === "running" && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 size={11} className="animate-spin" style={{ color: preview.risk_color }} />
            <span>Running…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SSH panel ─────────────────────────────────────────────────────────────────

interface SshStatus {
  active:       boolean;
  saved?:       boolean;
  host?:        string;
  username?:    string;
  connected_at?: string;
}

function SshPanel({ siteId, onStatusChange, refreshTrigger }: { siteId: string; onStatusChange: (active: boolean) => void; refreshTrigger?: number }) {
  const [status, setStatus]              = useState<SshStatus | null>(null);
  const [expanded, setExpanded]          = useState(false);
  const [authMode, setAuthMode]          = useState<"password" | "key">("password");
  const [host, setHost]                  = useState("");
  const [port, setPort]                  = useState("22");
  const [username, setUsername]          = useState("");
  const [password, setPassword]          = useState("");
  const [privateKey, setPrivateKey]      = useState("");
  const [showPw, setShowPw]              = useState(false);
  const [connecting, setConnecting]      = useState(false);
  const [connError, setConnError]        = useState<string | null>(null);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Fetch session status when site changes or after modal-based connect
  useEffect(() => {
    if (!siteId) { setStatus(null); return; }
    api.get<SshStatus>(`/agent/ssh/status/${siteId}`)
      .then(({ data }) => { setStatus(data); onStatusChange(data.active); })
      .catch(() => { setStatus({ active: false }); onStatusChange(false); });
  }, [siteId, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    setConnecting(true);
    setConnError(null);
    try {
      await api.post("/agent/ssh/connect", {
        site_id:    siteId,
        host:       host.trim(),
        port:       Number(port) || 22,
        username:   username.trim(),
        password:   authMode === "password" ? password : undefined,
        privateKey: authMode === "key"      ? privateKey.trim() : undefined,
      });
      const { data } = await api.get<SshStatus>(`/agent/ssh/status/${siteId}`);
      setStatus(data);
      onStatusChange(data.active);
      setExpanded(false);
      // Clear credentials from state — they're in Redis now
      setPassword(""); setPrivateKey("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setConnError(msg ?? "Connection failed. Check credentials and try again.");
    } finally {
      setConnecting(false);
    }
  };

  const promptDisconnect = () => {
    if (status?.saved) {
      setShowConfirmDisconnect(true);
    } else {
      performDisconnect();
    }
  };

  const performDisconnect = async () => {
    setDisconnecting(true);
    try {
      if (status?.saved) {
        try {
          await api.delete(`/sites/${siteId}/ssh/credentials`);
        } catch { /* best-effort */ }
      }
      try {
        await api.delete(`/agent/ssh/disconnect/${siteId}`);
      } catch { /* best-effort */ }
      setStatus({ active: false });
      onStatusChange(false);
      setExpanded(false);
    } finally {
      setDisconnecting(false);
      setShowConfirmDisconnect(false);
    }
  };

  if (!siteId) return null;

  return (
    <>
      {status?.active ? (
        <div className="flex items-center justify-between px-6 py-2 bg-teal-50 border-b border-teal-100 text-[11px]">
          <div className="flex items-center gap-2 text-teal-700">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
            <Terminal size={11} className="shrink-0" />
            <span className="font-medium">SSH connected</span>
            {status.username && status.host && (
              <span className="text-teal-600">{status.username}@{status.host}</span>
            )}
            <span className="text-teal-500">{status.saved ? "· saved credentials · full access" : "· full access"}</span>
          </div>
          <button onClick={promptDisconnect}
            className="flex items-center gap-1 text-teal-600 hover:text-red-600 transition-colors font-medium">
            <WifiOff size={10} /> Disconnect
          </button>
        </div>
      ) : (
        <div className="border-b border-border bg-white">
          {/* Collapsed row */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-6 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Terminal size={11} />
              <span>Connect SSH for live file analysis</span>
            </div>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {expanded && (
            <div className="px-6 pb-4 pt-1 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] text-muted-foreground mb-1">Host</label>
                  <input value={host} onChange={e => setHost(e.target.value)}
                    placeholder="192.168.1.1 or example.com"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-[color:var(--accent)]" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Port</label>
                  <input value={port} onChange={e => setPort(e.target.value)}
                    placeholder="22"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-[color:var(--accent)]" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="ubuntu, root, www-data…"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-[color:var(--accent)]" />
              </div>

              {/* Auth mode toggle */}
              <div className="flex items-center gap-1 text-[10px]">
                <button onClick={() => setAuthMode("password")}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${authMode === "password" ? "border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--accent-light)]" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <span className="flex items-center gap-1"><Lock size={9} /> Password</span>
                </button>
                <button onClick={() => setAuthMode("key")}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${authMode === "key" ? "border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--accent-light)]" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <span className="flex items-center gap-1"><KeyRound size={9} /> Private Key</span>
                </button>
              </div>

              {authMode === "password" ? (
                <div className="relative">
                  <label className="block text-[10px] text-muted-foreground mb-1">Password</label>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="SSH password"
                    className="w-full text-xs px-3 py-1.5 pr-8 rounded-lg border border-border bg-white focus:outline-none focus:border-[color:var(--accent)]" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2 top-6 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Private Key (PEM)</label>
                  <textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    rows={4}
                    className="w-full text-[10px] font-mono px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-[color:var(--accent)] resize-none" />
                </div>
              )}

              {connError && <p className="text-[11px] text-destructive">{connError}</p>}

              <div className="flex items-center gap-2">
                <button onClick={connect}
                  disabled={connecting || !host.trim() || !username.trim() || (authMode === "password" ? !password : !privateKey.trim())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)" }}>
                  {connecting ? <Loader2 size={11} className="animate-spin" /> : <Wifi size={11} />}
                  {connecting ? "Connecting…" : "Connect"}
                </button>
                <button onClick={() => setExpanded(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <p className="text-[10px] text-muted-foreground ml-1">
                  Credentials are stored in memory only and expire after 30 min.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDisconnect}
        title="Disconnect SSH?"
        message="This removes the saved SSH credentials for this site. You'll need to re-enter them next time."
        confirmText="Disconnect"
        cancelText="Keep Connected"
        isDangerous={true}
        isLoading={disconnecting}
        onConfirm={performDisconnect}
        onCancel={() => setShowConfirmDisconnect(false)}
      />
    </>
  );
}

// Strip artifacts that Llama models sometimes emit as literal text:
//  - <function=... /> / <function>...</function> syntax
//  - Raw JSON lines that are tool call arguments (e.g. {"query":"...","site_id":"..."})
function sanitizeMessage(text: string): string {
  return text
    .replace(/<function[^>]*>[\s\S]*?<\/function>/g, '')
    .replace(/<function[^>]*\/>/g, '')
    .replace(/\[TOOL_CALL\][^\n]*/g, '')
    .replace(/^\s*\{"query":"[^"]*","site_id":"[^"]*"\}\s*$/gm, '')
    .trim();
}

// Parse inline markdown: **bold** and *italic* within a plain string → React nodes.
function renderInline(text: string, key?: number): React.ReactNode {
  // Split on **...** or *...* (non-greedy). Preserve the delimiter to know which tag to use.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  if (parts.length === 1) return text;
  return (
    <span key={key}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </span>
  );
}

// Render agent text: converts "- item" / "1. item" lines to styled lists,
// prose lines become block spans. Inline **bold** and *italic* are rendered too.
function renderAgentText(text: string): React.ReactNode {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  type Mode = 'prose' | 'ul' | 'ol';
  let mode: Mode = 'prose';
  let buffer: string[] = [];
  let k = 0;

  const commit = () => {
    if (!buffer.length) return;
    if (mode === 'ul') {
      out.push(
        <ul key={k++} style={{ listStyleType: 'disc', paddingLeft: '1.25em', margin: '2px 0 6px' }}>
          {buffer.map((t, i) => <li key={i} style={{ marginBottom: 1 }}>{renderInline(t)}</li>)}
        </ul>
      );
    } else if (mode === 'ol') {
      out.push(
        <ol key={k++} style={{ listStyleType: 'decimal', paddingLeft: '1.25em', margin: '2px 0 6px' }}>
          {buffer.map((t, i) => <li key={i} style={{ marginBottom: 1 }}>{renderInline(t)}</li>)}
        </ol>
      );
    } else {
      const t = buffer.join('\n').trim();
      if (t) out.push(<span key={k++} style={{ display: 'block', marginBottom: 4 }}>{renderInline(t)}</span>);
    }
    buffer = [];
  };

  for (const line of lines) {
    const ul = line.match(/^[-•]\s+(.*)/);
    const ol = line.match(/^\d+[.)]\s+(.*)/);
    // Blank lines inside a list block are ignored so LLM blank-line-separated
    // numbered items don't reset the counter by spawning separate <ol> elements.
    if (!ul && !ol && line.trim() === '' && (mode === 'ul' || mode === 'ol')) continue;
    const next: Mode = ul ? 'ul' : ol ? 'ol' : 'prose';
    if (next !== mode) { commit(); mode = next; }
    if (ul) buffer.push(ul[1]);
    else if (ol) buffer.push(ol[1]);
    else buffer.push(line);
  }
  commit();

  return out.length ? <>{out}</> : <>{text}</>;
}

// Consolidated tool call pills — deduplicates repeated calls (e.g. "Live data fetched ×3")
function ToolCallsSummary({ calls }: { calls: ToolCall[] }) {
  const grouped = calls.reduce<{ name: string; count: number; meta: typeof TOOL_META[string]; hasError: boolean }[]>((acc, tc) => {
    const meta = TOOL_META[tc.name] ?? { label: tc.name, icon: Zap, color: "#1f5fb8" };
    const existing = acc.find(g => g.name === tc.name);
    const hasError = typeof tc.result?.error === "string";
    if (existing) { existing.count++; if (hasError) existing.hasError = true; }
    else acc.push({ name: tc.name, count: 1, meta, hasError });
    return acc;
  }, []);

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {grouped.map((g, i) => {
        const Icon = g.meta.icon;
        const color = g.hasError ? "#dc2626" : g.meta.color;
        return (
          <span key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
            style={{ background: `${color}10`, color, border: `1px solid ${color}25` }}>
            <Icon size={9} />
            {g.meta.label}{g.count > 1 ? <span className="opacity-60">×{g.count}</span> : null}
            {!g.hasError && <Check size={8} className="opacity-50" />}
          </span>
        );
      })}
    </div>
  );
}

function TokenBar({ state }: { state: TokenState }) {
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

  // Compute actual remaining using server-supplied extra_remaining + base headroom.
  // tokens_used is a monthly counter (resets each month) — it does NOT represent
  // total lifetime consumption. extra_remaining comes from the server and already
  // accounts for all months of extra usage, so combining them gives the true picture.
  const monthlyBase    = state.monthly_limit ?? state.tokens_limit;
  const baseHeadroom   = Math.max(0, monthlyBase - state.tokens_used);
  const extraHeadroom  = Math.max(0, state.extra_remaining ?? 0);
  const actualRemaining = baseHeadroom + extraHeadroom;
  const effectiveUsed  = Math.max(0, state.tokens_limit - actualRemaining);

  const pct  = state.tokens_limit > 0 ? Math.min(100, (effectiveUsed / state.tokens_limit) * 100) : 0;
  const warn = pct >= 80;

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border bg-muted/20 text-[11px] shrink-0">
      <Zap size={11} className="text-muted-foreground shrink-0" />
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: warn ? "#ef4444" : "var(--accent)" }} />
      </div>
      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
        {fmt(effectiveUsed)} / {fmt(state.tokens_limit)}
      </span>
      {state.tokens_extra > 0 && (
        <span className={extraHeadroom <= 0 ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
          +{fmt(state.tokens_extra)} extra
        </span>
      )}
    </div>
  );
}

// ── Site selector dropdown — custom-styled (native <select> options can't be styled) ──

const SITE_AVATAR_COLORS = ["#1f5fb8", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
function siteAvatarColor(id: string): string {
  return SITE_AVATAR_COLORS[id.charCodeAt(0) % SITE_AVATAR_COLORS.length];
}

function SiteSelectorDropdown({ sites, selectedSiteId, onChange }: {
  sites: Site[]; selectedSiteId: string; onChange: (id: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = sites.find(s => s.id === selectedSiteId);
  const filtered = search.trim()
    ? sites.filter(s => (s.name || s.url).toLowerCase().includes(search.trim().toLowerCase()))
    : sites;

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 pl-2.5 pr-2 sm:pr-2.5 py-1.5 text-xs font-medium rounded-lg bg-white shadow-elevated-xs hover:shadow-elevated-sm transition-all duration-base text-foreground w-[130px] sm:min-w-[160px]"
      >
        {selected ? (
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: siteAvatarColor(selected.id) }}>
            {(selected.name || selected.url).charAt(0).toUpperCase()}
          </span>
        ) : (
          <Globe size={13} className="text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 truncate text-left">{selected ? (selected.name || selected.url) : "All sites"}</span>
        <ChevronDown size={11} className={`text-muted-foreground shrink-0 transition-transform duration-fast ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-elevated-lg overflow-hidden z-30">
          {sites.length > 6 && (
            <div className="p-2 border-b border-border/60">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sites…"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted/50 outline-none focus:bg-white focus:shadow-elevated-xs transition-all duration-fast"
              />
            </div>
          )}
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              onClick={() => pick("")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                !selectedSiteId ? "bg-[var(--accent-light)] text-[var(--accent-hover)] font-semibold" : "text-foreground hover:bg-muted/60"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Globe size={12} className="text-muted-foreground" />
              </span>
              All sites
              {!selectedSiteId && <Check size={13} className="ml-auto text-[var(--accent)]" />}
            </button>
            {filtered.map(s => {
              const isSelected = s.id === selectedSiteId;
              const label = s.name || s.url;
              return (
                <button
                  key={s.id}
                  onClick={() => pick(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                    isSelected ? "bg-[var(--accent-light)] text-[var(--accent-hover)] font-semibold" : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: siteAvatarColor(s.id) }}>
                    {label.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{label}</span>
                  {isSelected && <Check size={13} className="shrink-0 text-[var(--accent)]" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No sites match &quot;{search}&quot;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Locked SSH bar — shown for non-SSH-eligible plans ────────────────────────

function LockedSshBar() {
  return (
    <div className="flex items-center justify-between px-6 py-2 bg-gray-50 border-b border-border text-[11px]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock size={11} className="shrink-0" />
        <span className="font-medium">SSH Access</span>
        <span className="text-gray-400">· Upgrade to Agency plan to unlock full server control</span>
      </div>
      <Link href="/settings?tab=billing"
        className="text-[11px] font-semibold hover:underline"
        style={{ color: "var(--accent)" }}>
        Upgrade
      </Link>
    </div>
  );
}

// ── SSH Connect Modal — shown when needs_ssh: true and plan is SSH-eligible ──

function SshConnectModal({ siteId, onConnected, onClose }: {
  siteId:      string;
  onConnected: () => void;
  onClose:     () => void;
}) {
  const [authMode, setAuthMode]     = useState<"password" | "key">("password");
  const [host, setHost]             = useState("");
  const [port, setPort]             = useState("22");
  const [username, setUsername]     = useState("");
  const [password, setPassword]     = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError]   = useState<string | null>(null);
  const [infoOpen, setInfoOpen]     = useState(false);

  const connect = async () => {
    setConnecting(true);
    setConnError(null);
    try {
      await api.post("/agent/ssh/connect", {
        site_id:    siteId,
        host:       host.trim(),
        port:       Number(port) || 22,
        username:   username.trim(),
        password:   authMode === "password" ? password : undefined,
        privateKey: authMode === "key"      ? privateKey.trim() : undefined,
      });
      setPassword(""); setPrivateKey("");
      onConnected();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setConnError(msg ?? "Connection failed. Check credentials and try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-50">
              <Terminal size={13} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-none">SSH Required</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Connect your server to continue</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground transition-colors">
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Collapsible info box */}
          <div className="rounded-lg border border-amber-100 bg-amber-50 overflow-hidden">
            <button
              onClick={() => setInfoOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-amber-800 hover:bg-amber-100/60 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={10} /> What SSH enables &amp; how it works
              </span>
              {infoOpen ? <ChevronUp size={11} className="text-amber-600" /> : <ChevronDown size={11} className="text-amber-600" />}
            </button>
            {infoOpen && (
              <div className="px-3 pb-3 text-[11px] text-amber-700 space-y-1.5 border-t border-amber-100">
                <p className="pt-2 text-amber-600">Grants the agent full read/write access to your server:</p>
                <ul className="space-y-0.5 ml-1">
                  <li>· Delete, edit, or create any file on the server</li>
                  <li>· Run WP-CLI, shell commands, manage packages</li>
                  <li>· Read logs, check configs, modify .htaccess</li>
                </ul>
                <p className="text-amber-600 pt-1">Files are auto-backed up before any modification. Credentials are kept in memory only (30 min) and never stored in the database.</p>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] text-muted-foreground mb-1">Host</label>
              <input value={host} onChange={e => setHost(e.target.value)} placeholder="192.168.1.1 or example.com"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Port</label>
              <input value={port} onChange={e => setPort(e.target.value)} placeholder="22"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-teal-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ubuntu, root, www-data…"
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-teal-500" />
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            {(["password", "key"] as const).map(mode => (
              <button key={mode} onClick={() => setAuthMode(mode)}
                className={`px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${authMode === mode ? "border-teal-500 text-teal-600 bg-teal-50" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {mode === "password" ? <><Lock size={9} /> Password</> : <><KeyRound size={9} /> Private Key</>}
              </button>
            ))}
          </div>

          {authMode === "password" ? (
            <div className="relative">
              <label className="block text-[10px] text-muted-foreground mb-1">Password</label>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="SSH password"
                className="w-full text-xs px-3 py-1.5 pr-8 rounded-lg border border-border bg-white focus:outline-none focus:border-teal-500" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2 top-6 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Private Key (PEM)</label>
              <textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" rows={3}
                className="w-full text-[10px] font-mono px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:border-teal-500 resize-none" />
            </div>
          )}

          {connError && <p className="text-[11px] text-destructive">{connError}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={connect}
              disabled={connecting || !host.trim() || !username.trim() || (authMode === "password" ? !password : !privateKey.trim())}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 bg-teal-600">
              {connecting ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
              {connecting ? "Connecting…" : "Connect SSH"}
            </button>
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-muted-foreground border border-border hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SSH Upgrade Modal — shown when needs_ssh: true but plan is not eligible ──

function SshUpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-50">
            <Lock size={24} className="text-teal-600" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">SSH Access Required</h2>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            Advanced operations beyond the 27 predefined actions require SSH access, available on Agency and Agency Plus plans.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left text-[11px] space-y-2">
            <p className="font-semibold text-foreground">Upgrade to unlock:</p>
            <div className="space-y-1.5 text-muted-foreground">
              {[
                "Delete malware files directly from the server",
                "Run any WP-CLI command",
                "Edit server files (wp-config.php, .htaccess)",
                "Execute any shell command via AI Agent",
                "Install and manage plugins via CLI",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <Terminal size={9} className="mt-0.5 shrink-0 text-teal-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/settings?tab=billing"
            className="block w-full py-2.5 rounded-xl text-white text-sm font-semibold text-center mb-2 transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}>
            Upgrade to Agency Plan
          </Link>
          <button onClick={onClose}
            className="w-full py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentInner() {
  const { agency } = useAuth();
  const searchParams = useSearchParams();
  const isFreePlan   = agency?.plan === 'free';
  const isIndividual = agency?.account_type === "individual";
  const canUseAgent  = !!agency && !isFreePlan;
  const canUseSsh    = agency?.plan === 'agency' || agency?.plan === 'agency_plus';

  const [sites, setSites]               = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [messages, setMessages]         = useState<AgentMessage[]>([]);
  const [toolCallsMap, setToolCallsMap] = useState<Record<number, ToolCall[]>>({});
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [workingStatus, setWorkingStatus] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [tokenState, setTokenState]     = useState<TokenState | null>(null);
  const [showSiteModal, setShowSiteModal]         = useState(false);
  const [showSshModal, setShowSshModal]           = useState(false);
  const [showSshUpgradeModal, setShowSshUpgradeModal] = useState(false);
  const [pendingMessage, setPendingMessage]       = useState("");
  const [sshActive, setSshActive]                 = useState(false);
  const [sshPanelRefresh, setSshPanelRefresh]     = useState(0);
  // Track whether URL params have been applied so we only do it once
  const urlParamsApplied = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get<{ sites: RawSite[] } | RawSite[]>("/sites")
      .then(({ data }) => {
        const raw: RawSite[] = Array.isArray(data) ? data : (data as { sites: RawSite[] }).sites ?? [];
        setSites(raw.map(mapSite));
      })
      .catch(() => {});
  }, []);

  // Apply URL params (site_id + prompt) once sites are loaded — used by Fix button on malware page
  useEffect(() => {
    if (urlParamsApplied.current || sites.length === 0) return;
    const paramSiteId = searchParams.get("site_id");
    const paramPrompt = searchParams.get("prompt");
    if (paramSiteId) {
      const match = sites.find(s => s.id === paramSiteId);
      if (match) {
        setSelectedSiteId(paramSiteId);
        urlParamsApplied.current = true;
      }
    }
    if (paramPrompt) {
      setInput(paramPrompt);
      urlParamsApplied.current = true;
    }
  }, [sites, searchParams]);

  useEffect(() => {
    api.get<TokenState>("/agent/tokens")
      .then(({ data }) => setTokenState(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendWithSite = useCallback(async (text: string, siteId: string, addUserMsg: boolean) => {
    const msgIndex = messages.length + (addUserMsg ? 1 : 0);
    if (addUserMsg) {
      setMessages(prev => [...prev, { role: "user", content: text, created_at: new Date().toISOString() }]);
    }
    setLoading(true);
    setError(null);

    // Live progress feed — poll backend for the current working step while the request runs
    const progressId = crypto.randomUUID();
    setWorkingStatus(null);
    const progressTimer = setInterval(() => {
      api.get<{ label: string | null }>(`/agent/progress/${progressId}`)
        .then(({ data }) => { if (data.label) setWorkingStatus(data.label); })
        .catch(() => {});
    }, 1200);

    try {
      const { data } = await api.post<{
        reply: string;
        tool_calls?: ToolCall[];
        tokens_used?: number;
        tokens_limit?: number;
        tokens_extra?: number;
        extra_remaining?: number;
        monthly_limit?: number;
        needs_site_selection?: boolean;
        needs_ssh?: boolean;
        can_ssh?:   boolean;
      }>("/agent/chat", {
        message: text,
        site_id: siteId || undefined,
        history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
        progress_id: progressId,
      });

      if (data.needs_site_selection) {
        setPendingMessage(text);
        setShowSiteModal(true);
        setLoading(false);
        return;
      }

      if (data.needs_ssh) {
        setPendingMessage(text);
        if (data.reply) {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);
        }
        if (data.can_ssh) {
          setShowSshModal(true);
        } else {
          setShowSshUpgradeModal(true);
        }
        setLoading(false);
        return;
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);

      if (data.tool_calls?.length) {
        setToolCallsMap(prev => ({ ...prev, [msgIndex]: data.tool_calls! }));
      }

      if (data.tokens_used != null) {
        setTokenState({ tokens_used: data.tokens_used, tokens_limit: data.tokens_limit ?? 0, tokens_extra: data.tokens_extra ?? 0, extra_remaining: data.extra_remaining, monthly_limit: data.monthly_limit });
      }
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { error?: string; message?: string; tokens_used?: number; tokens_limit?: number; tokens_extra?: number; extra_remaining?: number; monthly_limit?: number } } })?.response;
      const errCode = resp?.data?.error;
      const errMsg  = resp?.data?.message;
      if (resp?.data?.tokens_used != null) {
        // Re-fetch from DB so the bar matches billing page (avoids showing stale limit-reached state)
        api.get<TokenState>("/agent/tokens").then(({ data }) => setTokenState(data)).catch(() => {
          setTokenState({ tokens_used: resp!.data!.tokens_used!, tokens_limit: resp!.data!.tokens_limit ?? 0, tokens_extra: resp!.data!.tokens_extra ?? 0, extra_remaining: resp!.data!.extra_remaining, monthly_limit: resp!.data!.monthly_limit });
        });
        setError("Token limit reached. Purchase more tokens to continue.");
      } else if (errCode === 'rate_limit' || resp?.status === 429) {
        setError(errMsg ?? "AI service is temporarily rate-limited. Please try again in a few minutes.");
      } else {
        setError(errMsg ?? errCode ?? "Something went wrong. Please try again.");
      }
    } finally {
      clearInterval(progressTimer);
      setWorkingStatus(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages]);

  // Site lookup
  const selectedSite = sites.find(s => s.id === selectedSiteId);

  // PSI Optimization State

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    // Reset textarea height back to single line after send
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // All messages go to Agent (including PSI optimization requests)
    await sendWithSite(trimmed, selectedSiteId, true);
  }, [loading, selectedSiteId, sendWithSite]);

  // After a write operation confirms, auto-send a follow-up so the AI can report before/after
  const handleWriteSuccess = useCallback((operation: string, resultMsg: string, counts: Record<string, unknown>) => {
    // Build a hidden system-level prompt; no user bubble added (addUserMsg = false)
    const sizeOps: Record<string, { query: string; beforeKey: string; label: string }> = {
      optimize_db_tables:        { query: "db_table_sizes",  beforeKey: "total_mb",  label: "total database size" },
      delete_post_revisions:     { query: "revision_bloat",  beforeKey: "revisions", label: "post revision count" },
      delete_expired_transients: { query: "large_transients", beforeKey: "expired",  label: "expired transient count" },
      delete_orphaned_postmeta:  { query: "db_table_sizes",  beforeKey: "tables",    label: "database table count" },
    };
    const sizeOp = sizeOps[operation];
    let followUp: string;
    if (sizeOp && counts[sizeOp.beforeKey] != null) {
      followUp = `[SYSTEM — write operation complete] Operation "${operation}" just executed. ` +
        `Result: ${resultMsg}. Before: ${sizeOp.label} was ${counts[sizeOp.beforeKey]}. ` +
        `Now call get_live_site_data with query="${sizeOp.query}" to get the current (after) value, ` +
        `then give the user a concise before → after comparison. Keep it short.`;
    } else {
      followUp = `[SYSTEM — write operation complete] Operation "${operation}" just executed successfully. ` +
        `Result: ${resultMsg}. Give the user a brief confirmation of what was accomplished. Keep it to 1-2 sentences.`;
    }
    sendWithSite(followUp, selectedSiteId, false);
  }, [selectedSiteId, sendWithSite]);

  const handleSiteModalSelect = useCallback(async (siteId: string) => {
    setShowSiteModal(false);
    setSelectedSiteId(siteId);
    const msg = pendingMessage;
    setPendingMessage("");
    if (msg) {
      await sendWithSite(msg, siteId, false);
    }
  }, [pendingMessage, sendWithSite]);

  const handleSshConnected = useCallback(async () => {
    setShowSshModal(false);
    setSshActive(true);
    setSshPanelRefresh(v => v + 1);
    const msg = pendingMessage;
    setPendingMessage("");
    if (msg) {
      await sendWithSite(msg, selectedSiteId, false);
    }
  }, [pendingMessage, selectedSiteId, sendWithSite]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const handleSiteChange = (id: string) => {
    // Disconnect SSH from previous site (best-effort, fire-and-forget)
    if (selectedSiteId && sshActive) {
      api.delete(`/agent/ssh/disconnect/${selectedSiteId}`).catch(() => {});
    }
    setSelectedSiteId(id);
    setSshActive(false);
    setMessages([]);
    setToolCallsMap({});
    setError(null);
  };

  const copyTranscript = () => {
    const context = selectedSite ? `Site: ${selectedSite.name || selectedSite.url}` : "All sites";
    const lines = [
      `AI Assistant transcript — ${context}`,
      `Date: ${new Date().toLocaleString()}`,
      "",
      ...messages.map(m => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`),
    ];
    navigator.clipboard.writeText(lines.join("\n\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isTokenLimitError = error === "Token limit reached. Purchase more tokens to continue.";
  const suggestions  = selectedSiteId ? SUGGESTIONS_SITE : SUGGESTIONS_GLOBAL;
  const isEmpty      = messages.length === 0;

  return (
    <div className="-m-6 flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3.5 bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <IconChip size="sm">
            <Sparkles size={15} />
          </IconChip>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground leading-none">AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">Powered by real audit &amp; scan data</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {tokenState && canUseAgent && <div className="hidden sm:flex"><TokenBar state={tokenState} /></div>}

          {messages.length > 0 && (
            <>
              <button
                onClick={copyTranscript}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors border border-border"
              >
                {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy transcript"}</span>
              </button>
              <button
                onClick={() => {
                  if (selectedSiteId && sshActive) {
                    api.delete(`/agent/ssh/disconnect/${selectedSiteId}`).catch(() => {});
                    setSshActive(false);
                  }
                  setMessages([]); setToolCallsMap({}); setError(null);
                }}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors border border-border"
              >
                <RotateCcw size={11} /><span className="hidden sm:inline"> New chat</span>
              </button>
            </>
          )}
          <SiteSelectorDropdown sites={sites} selectedSiteId={selectedSiteId} onChange={handleSiteChange} />
        </div>
      </div>

      {/* ── SSH panel (site-specific, below top bar) ────────────────────────── */}
      {!isFreePlan && selectedSiteId && (
        canUseSsh
          ? <SshPanel siteId={selectedSiteId} onStatusChange={setSshActive} refreshTrigger={sshPanelRefresh} />
          : <LockedSshBar />
      )}

      {/* ── Free plan upgrade wall ───────────────────────────────────────────── */}
      {isFreePlan && (
        <div className="flex-1 flex items-center justify-center bg-[#f8fafc] p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm"
              style={{ background: "var(--accent-light)" }}>
              <Sparkles size={28} style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">AI Assistant</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {isIndividual
                ? "AI Assistant is available on upgraded plans. Get plain-English explanations of your audit results, find out exactly what to fix, and take action — no technical knowledge needed."
                : "AI Assistant is available on upgraded plans. Ask questions about your sites, get audit insights, run audits, send reports, and more — all in plain English."}
            </p>
            <div className="bg-white rounded-2xl shadow-elevated-sm p-5 mb-6 text-left space-y-3">
              {(isIndividual ? [
                "\"What's wrong with my site right now?\"",
                "\"Is my WordPress version up to date?\"",
                "\"Why is my security score low and how do I fix it?\"",
                "\"Run a full audit and explain the results\"",
              ] : [
                "\"What's the most urgent issue on my site?\"",
                "\"Which plugins need updating?\"",
                "\"Run an audit and send me a report\"",
                "\"Why is my security score low?\"",
              ]).map(q => (
                <div key={q} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Sparkles size={12} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <span className="italic">{q}</span>
                </div>
              ))}
            </div>
            <Link
              href="/settings?tab=billing&from=%2Fagent"
              className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Zap size={15} /> Upgrade to unlock AI Assistant
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              {isIndividual
                ? "Basic AI summaries on your audit reports are always free."
                : "AI summaries on your audit reports are always included — free for all plans."}
            </p>
          </div>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      {!isFreePlan && (
        <div className="flex-1 overflow-y-auto min-h-0 relative"
          style={{ background: "radial-gradient(ellipse 100% 55% at 50% 0%, var(--accent-light) 0%, #f7f9fc 45%, var(--background) 100%)" }}>

          {/* Subtle top glow */}
          <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgb(var(--accent-rgb) / 0.08), transparent)" }} />

          <div className="relative max-w-3xl mx-auto px-6 py-10">

            {isEmpty ? (
              <div className="flex flex-col items-center text-center">
                {/* Glowing hero icon */}
                <div className="relative mb-8 mt-4">
                  {/* Outer glow rings */}
                  <div className="absolute inset-0 rounded-full scale-[2.2] opacity-[0.12]"
                    style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }} />
                  <div className="absolute inset-0 rounded-full scale-[1.6] opacity-[0.18]"
                    style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }} />
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative shadow-2xl bg-gradient-brand"
                    style={{ boxShadow: "0 20px 60px rgb(var(--accent-rgb) / 0.4), 0 4px 16px rgba(0,0,0,0.15)" }}>
                    <Sparkles size={38} className="text-white drop-shadow-sm" />
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-md"
                    style={{ background: "var(--accent-deep)" }}>
                    <Zap size={12} className="text-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
                  {selectedSite ? `Let's look at ${selectedSite.name || selectedSite.url}` : "How can I help today?"}
                </h2>
                <p className="text-sm leading-relaxed mb-10 max-w-xs text-muted-foreground">
                  Live access to your audit scores, security signals, malware scans, and plugin data.
                </p>

                {/* Suggestion grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestions.map(({ q, icon }) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="group flex items-start gap-3 text-left px-4 py-4 rounded-2xl text-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                      style={{
                        background: "rgba(255,255,255,0.75)",
                        border: "1px solid rgb(var(--accent-rgb) / 0.18)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 8px rgb(var(--accent-rgb) / 0.08), 0 1px 2px rgba(0,0,0,0.04)",
                        color: "var(--foreground)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background = "rgba(255,255,255,0.95)";
                        el.style.borderColor = "rgb(var(--accent-rgb) / 0.45)";
                        el.style.boxShadow = "0 8px 24px rgb(var(--accent-rgb) / 0.15), 0 2px 6px rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background = "rgba(255,255,255,0.75)";
                        el.style.borderColor = "rgb(var(--accent-rgb) / 0.18)";
                        el.style.boxShadow = "0 2px 8px rgb(var(--accent-rgb) / 0.08), 0 1px 2px rgba(0,0,0,0.04)";
                      }}
                    >
                      <span className="text-lg leading-none shrink-0 mt-0.5">{icon}</span>
                      <span className="leading-snug font-medium">{q}</span>
                    </button>
                  ))}
                </div>

                <p className="text-[11px] mt-10 tracking-wide text-muted-foreground">
                  SNAPSHOT AI · Actions require your confirmation
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 bg-gradient-brand"
                        style={{ boxShadow: "0 2px 8px rgb(var(--accent-rgb) / 0.4)" }}>
                        <Sparkles size={13} className="text-white" />
                      </div>
                    )}
                    <div className="max-w-[76%] flex flex-col gap-2">
                      {/* Write confirmation cards shown FIRST so user acts before reading result */}
                      {msg.role === "assistant" && toolCallsMap[i] && (() => {
                        const calls = toolCallsMap[i];
                        const writeCalls = calls.filter(tc => tc.name === "preview_write_operation" && (tc.result as unknown as WritePreview).write_preview);
                        if (!writeCalls.length) return null;
                        const isMulti = writeCalls.length > 1;
                        return (
                          <WriteBatch writeCalls={writeCalls} siteId={selectedSiteId} onSuccess={handleWriteSuccess} isMulti={isMulti} />
                        );
                      })()}

                      {/* Regular tool call pills shown BEFORE the text bubble so the answer is always visible at the bottom */}
                      {msg.role === "assistant" && toolCallsMap[i] && (() => {
                        const regularCalls = toolCallsMap[i].filter(tc => tc.name !== "preview_write_operation");
                        return regularCalls.length > 0 ? <ToolCallsSummary calls={regularCalls} /> : null;
                      })()}

                      <div
                        className={`text-sm leading-relaxed ${
                          msg.role === "user" ? "text-white whitespace-pre-wrap" : "text-foreground"
                        }`}
                        style={msg.role === "user"
                          ? {
                              padding: "10px 16px",
                              background: "var(--accent)",
                              borderRadius: "18px 18px 4px 18px",
                              boxShadow: "0 2px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)",
                              fontWeight: 450,
                            }
                          : {
                              padding: "12px 16px",
                              background: "rgba(255,255,255,0.7)",
                              borderRadius: "4px 18px 18px 18px",
                              backdropFilter: "blur(16px)",
                              WebkitBackdropFilter: "blur(16px)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.8)",
                            }}
                      >
                        {msg.role === "assistant" ? renderAgentText(sanitizeMessage(msg.content)) : msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 bg-gradient-brand"
                      style={{ boxShadow: "0 4px 12px rgb(var(--accent-rgb) / 0.35)" }}>
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3.5"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: "4px 18px 18px 18px",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.8)",
                      }}>
                      <span className="flex items-center gap-1.5">
                        {[0, 160, 320].map(delay => (
                          <span key={delay} className="w-2 h-2 rounded-full animate-bounce"
                            style={{ background: "var(--accent)", opacity: 0.7, animationDelay: `${delay}ms`, animationDuration: "1.1s" }} />
                        ))}
                      </span>
                      {workingStatus && (
                        <span className="text-xs font-medium text-muted-foreground animate-pulse" key={workingStatus}>
                          {workingStatus}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center">
                    <div className="text-xs bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-center max-w-sm">
                      <p className="text-destructive font-medium">{error}</p>
                      {isTokenLimitError && (
                        <a href="/settings?tab=billing"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-accent hover:underline">
                          <ExternalLink size={11} /> Buy more tokens
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SSH Connect modal ────────────────────────────────────────────────── */}
      {showSshModal && selectedSiteId && (
        <SshConnectModal
          siteId={selectedSiteId}
          onConnected={handleSshConnected}
          onClose={() => setShowSshModal(false)}
        />
      )}

      {/* ── SSH Upgrade modal ─────────────────────────────────────────────────── */}
      {showSshUpgradeModal && (
        <SshUpgradeModal onClose={() => setShowSshUpgradeModal(false)} />
      )}

      {/* ── Choose Site modal ────────────────────────────────────────────────── */}
      {showSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowSiteModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-light)" }}>
                  <Database size={13} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground leading-none">Choose a site</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Which site are you asking about?</p>
                </div>
              </div>
              <button onClick={() => setShowSiteModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto space-y-1">
              {sites.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No sites connected yet.</p>
              )}
              {sites.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSiteModalSelect(s.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">
                    {(s.name || s.url).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name || s.url}</p>
                    {s.name && <p className="text-[11px] text-muted-foreground truncate">{s.url}</p>}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.plugin_connected ? "bg-green-500" : "bg-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      {!isFreePlan && (
        <div className="shrink-0 px-4 sm:px-6 pt-4"
          style={{
            background: "linear-gradient(to top, var(--background) 0%, #ffffff 100%)",
            borderTop: "1px solid var(--border)",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
          }}>
          <div className="max-w-3xl mx-auto">
            {/* Gradient-bordered input container */}
            <div className="p-px rounded-2xl shadow-elevated-md"
              style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.25), var(--border) 40%, rgb(var(--accent-rgb) / 0.15))" }}>
              <div className="flex gap-3 items-end rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    // Auto-expand: reset to auto then grow to scrollHeight, capped at ~5 lines
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 140) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    !canUseAgent
                      ? "Upgrade to unlock AI Assistant…"
                      : selectedSite
                      ? `Ask about ${selectedSite.name || selectedSite.url}…`
                      : "Ask anything about your sites…"
                  }
                  rows={1}
                  disabled={!canUseAgent}
                  className="no-focus-ring flex-1 resize-none bg-transparent text-sm text-foreground py-1 border-0 ring-0 disabled:cursor-not-allowed"
                  style={{ outline: "none", boxShadow: "none", overflowY: "auto", caretColor: "var(--accent)", minHeight: "28px", maxHeight: "140px" }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading || !canUseAgent}
                  className="flex items-center justify-center shrink-0 transition-all disabled:cursor-not-allowed"
                  style={{
                    width: 36, height: 36,
                    borderRadius: 12,
                    background: input.trim() && !loading && canUseAgent
                      ? "var(--gradient-brand)"
                      : "var(--accent)",
                    opacity: (!input.trim() || loading || !canUseAgent) ? 0.35 : 1,
                    boxShadow: input.trim() && canUseAgent ? "0 2px 8px rgb(var(--accent-rgb) / 0.4)" : "none",
                    transition: "all 0.2s ease",
                  }}
                  aria-label="Send"
                >
                  {loading
                    ? <Loader2 size={15} className="text-white animate-spin" />
                    : <Send size={14} className="text-white" style={{ transform: "translateX(1px)" }} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center mt-2.5 tracking-wide text-muted-foreground">
              ENTER TO SEND · SHIFT+ENTER FOR NEW LINE
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense>
      <AgentInner />
    </Suspense>
  );
}
