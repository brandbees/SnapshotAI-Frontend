"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, ChevronDown, Loader2, Globe, RotateCcw, Sparkles, Copy, Check,
         Zap, Play, FileText, Calendar, List, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { mapSite, type RawSite } from "@/lib/mappers";
import { useAuth } from "@/hooks/useAuth";
import type { Site, AgentMessage } from "@/types";

const SUGGESTIONS_GLOBAL = [
  { q: "Which site has the lowest overall score?",    icon: "📉" },
  { q: "Are any sites under malware threat?",         icon: "🛡️" },
  { q: "Which sites have plugins needing updates?",   icon: "🔌" },
  { q: "Is any site currently down?",                 icon: "📡" },
];

const SUGGESTIONS_SITE = [
  { q: "What's the most urgent thing to fix?",        icon: "🚨" },
  { q: "Why is my security score low?",               icon: "🔐" },
  { q: "Run an audit on this site",                   icon: "▶️" },
  { q: "Send me a report for this site",              icon: "📄" },
];

interface TokenState {
  tokens_used:  number;
  tokens_limit: number;
  tokens_extra: number;
}

interface ToolCall {
  name:   string;
  args:   Record<string, unknown>;
  result: Record<string, unknown>;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  run_audit:       { label: "Audit triggered",        icon: Play,        color: "#6366f1" },
  send_report:     { label: "Report queued",          icon: FileText,    color: "#0ea5e9" },
  update_schedule: { label: "Schedule updated",       icon: Calendar,    color: "#10b981" },
  list_sites:      { label: "Sites fetched",          icon: List,        color: "#8b5cf6" },
  get_scores:      { label: "Scores retrieved",       icon: Zap,         color: "#f59e0b" },
  get_malware_status: { label: "Malware status checked", icon: ShieldCheck, color: "#ef4444" },
};

function ToolCallCard({ call }: { call: ToolCall }) {
  const meta = TOOL_META[call.name] ?? { label: call.name, icon: Zap, color: "#6366f1" };
  const Icon = meta.icon;
  const msg  = typeof call.result?.message === "string" ? call.result.message : null;
  const err  = typeof call.result?.error   === "string" ? call.result.error   : null;

  return (
    <div className="flex items-start gap-2.5 mt-2 px-3 py-2.5 rounded-xl border text-xs"
      style={{ background: `${meta.color}08`, borderColor: `${meta.color}30` }}>
      <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${meta.color}18` }}>
        <Icon size={11} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        {msg && <p className="text-muted-foreground mt-0.5 leading-snug">{msg}</p>}
        {err && <p className="text-destructive mt-0.5">{err}</p>}
      </div>
      {call.result?.success === true && <Check size={12} className="text-green-500 shrink-0 mt-0.5" />}
    </div>
  );
}

function TokenBar({ state }: { state: TokenState }) {
  const pct  = state.tokens_limit > 0 ? Math.min(100, (state.tokens_used / state.tokens_limit) * 100) : 0;
  const warn = pct >= 80;
  const fmt  = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border bg-muted/20 text-[11px] shrink-0">
      <Zap size={11} className="text-muted-foreground shrink-0" />
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: warn ? "#ef4444" : "var(--accent)" }} />
      </div>
      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
        {fmt(state.tokens_used)} / {fmt(state.tokens_limit)}
      </span>
      {state.tokens_extra > 0 && (
        <span className="text-green-600 font-medium">+{fmt(state.tokens_extra)} extra</span>
      )}
    </div>
  );
}

export default function AgentPage() {
  const { agency } = useAuth();
  const isFreePlan  = agency?.plan === 'free';
  const canUseAgent = !!agency && !isFreePlan;

  const [sites, setSites]               = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [messages, setMessages]         = useState<AgentMessage[]>([]);
  const [toolCallsMap, setToolCallsMap] = useState<Record<number, ToolCall[]>>({});
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [tokenState, setTokenState]     = useState<TokenState | null>(null);

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

  useEffect(() => {
    api.get<TokenState>("/agent/tokens")
      .then(({ data }) => setTokenState(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const msgIndex = messages.length + 1; // index of the upcoming assistant message
    setMessages(prev => [...prev, { role: "user", content: trimmed, created_at: new Date().toISOString() }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post<{
        reply: string;
        tool_calls?: ToolCall[];
        tokens_used?: number;
        tokens_limit?: number;
        tokens_extra?: number;
      }>("/agent/chat", {
        message: trimmed,
        site_id: selectedSiteId || undefined,
        history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
      });

      setMessages(prev => [...prev, { role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);

      if (data.tool_calls?.length) {
        setToolCallsMap(prev => ({ ...prev, [msgIndex]: data.tool_calls! }));
      }

      if (data.tokens_used != null) {
        setTokenState({ tokens_used: data.tokens_used, tokens_limit: data.tokens_limit ?? 0, tokens_extra: data.tokens_extra ?? 0 });
      }
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string; tokens_used?: number; tokens_limit?: number } } })?.response;
      const msg  = resp?.data?.error;
      if (resp?.data?.tokens_used != null) {
        setTokenState({ tokens_used: resp.data.tokens_used, tokens_limit: resp.data.tokens_limit ?? 0, tokens_extra: 0 });
        setError("Token limit reached. Purchase more tokens to continue.");
      } else {
        setError(msg ?? "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, messages, selectedSiteId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const handleSiteChange = (id: string) => {
    setSelectedSiteId(id);
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

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const suggestions  = selectedSiteId ? SUGGESTIONS_SITE : SUGGESTIONS_GLOBAL;
  const isEmpty      = messages.length === 0;

  return (
    <div className="-m-6 flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3.5 bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-light)" }}>
            <Bot size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-none">AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Powered by real audit &amp; scan data</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tokenState && canUseAgent && <TokenBar state={tokenState} />}

          {messages.length > 0 && (
            <>
              <button
                onClick={copyTranscript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors border border-border"
              >
                {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy transcript"}
              </button>
              <button
                onClick={() => { setMessages([]); setToolCallsMap({}); setError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors border border-border"
              >
                <RotateCcw size={11} /> New chat
              </button>
            </>
          )}
          <div className="relative">
            <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={selectedSiteId}
              onChange={e => handleSiteChange(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs border border-border rounded-lg bg-white appearance-none text-foreground min-w-[150px]"
              style={{ outline: "none" }}
            >
              <option value="">All sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.url}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

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
              Ask questions about your sites, get audit insights, run audits, send reports,
              and more — all in plain English. Available on paid plans.
            </p>
            <div className="bg-white border border-border rounded-2xl p-5 mb-6 text-left space-y-3">
              {[
                "\"What's the most urgent issue on my site?\"",
                "\"Which plugins need updating?\"",
                "\"Run an audit and send me a report\"",
                "\"Why is my security score low?\"",
              ].map(q => (
                <div key={q} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Sparkles size={12} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <span className="italic">{q}</span>
                </div>
              ))}
            </div>
            <Link
              href="/settings?tab=billing"
              className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Zap size={15} /> Upgrade to unlock AI Assistant
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              AI summaries on your audit reports are always included — free for all plans.
            </p>
          </div>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      {!isFreePlan && <div className="flex-1 overflow-y-auto min-h-0 bg-[#f8fafc]">
        <div className="max-w-3xl mx-auto px-6 py-8">

          {isEmpty ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm" style={{ background: "var(--accent-light)" }}>
                <Sparkles size={28} style={{ color: "var(--accent)" }} />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {selectedSite ? `Ask me about ${selectedSite.name || selectedSite.url}` : "What do you want to know?"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 mb-8 max-w-sm">
                I have live access to audit scores, security signals, malware scans, and plugin data — and I can take actions like running audits and sending reports.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {suggestions.map(({ q, icon }) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="group flex items-start gap-3 text-left px-4 py-3.5 rounded-xl border border-border bg-white hover:border-[color:var(--accent)] hover:shadow-sm transition-all text-sm text-foreground"
                  >
                    <span className="text-base leading-none mt-0.5 shrink-0">{icon}</span>
                    <span className="leading-snug">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "var(--accent-light)" }}>
                      <Bot size={13} style={{ color: "var(--accent)" }} />
                    </div>
                  )}
                  <div className="max-w-[78%] flex flex-col gap-1">
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "text-white rounded-tr-none shadow-sm"
                          : "bg-white border border-border text-foreground rounded-tl-none shadow-sm"
                      }`}
                      style={msg.role === "user" ? { background: "var(--accent)" } : undefined}
                    >
                      {msg.content}
                    </div>
                    {/* Tool call cards — shown below the assistant message */}
                    {msg.role === "assistant" && toolCallsMap[i] && toolCallsMap[i].map((tc, j) => (
                      <ToolCallCard key={j} call={tc} />
                    ))}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "var(--accent-light)" }}>
                    <Bot size={13} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="px-4 py-3.5 rounded-2xl rounded-tl-none bg-white border border-border shadow-sm">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "var(--accent)" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "var(--accent)" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "var(--accent)" }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center max-w-sm">
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
      </div>}

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      {!isFreePlan && <div className="shrink-0 bg-white border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end bg-white border border-border rounded-2xl px-4 py-3 transition-shadow">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !canUseAgent
                  ? "Upgrade to Agency Plus to use the AI Assistant…"
                  : selectedSite
                  ? `Ask about ${selectedSite.name || selectedSite.url}…`
                  : "Ask anything about your sites, or say 'run audit on…'"
              }
              rows={1}
              disabled={!canUseAgent}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground py-0.5 max-h-32 border-0 ring-0 disabled:cursor-not-allowed"
              style={{ outline: "none", boxShadow: "none", overflowY: "auto" }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading || !canUseAgent}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-35 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "var(--accent)" }}
              aria-label="Send"
            >
              {loading ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Enter to send · Shift+Enter for new line · I can run audits, send reports, and update schedules
          </p>
        </div>
      </div>}

    </div>
  );
}
