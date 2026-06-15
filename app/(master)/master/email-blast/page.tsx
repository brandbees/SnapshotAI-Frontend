"use client";

import { useState } from "react";
import { toast } from "sonner";
import masterApi from "@/lib/masterApi";
import { Mail, Send, Users, Eye, CheckCircle, AlertCircle } from "lucide-react";

const AUDIENCES = [
  { key: "all",     label: "All agencies",        desc: "Every registered agency" },
  { key: "trial",   label: "Active trials",        desc: "Currently on trial (not expired)" },
  { key: "expired", label: "Expired trials",       desc: "Trial ended, still on free plan" },
  { key: "paid",    label: "Paid customers",       desc: "Any paid plan" },
  { key: "free",    label: "Free / no trial",      desc: "Free plan, trial never started or expired" },
];

interface Recipient { id: string; name: string; email: string; }
interface SendResult { sent: number; failed: number; total: number; }

export default function EmailBlastPage() {
  const [audience,  setAudience]  = useState("all");
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [preview,   setPreview]   = useState<Recipient[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending,   setSending]   = useState(false);
  const [result,    setResult]    = useState<SendResult | null>(null);
  const [error,     setError]     = useState("");

  async function loadPreview() {
    setPreviewing(true);
    setPreview(null);
    try {
      const { data } = await masterApi.get("/master/email-blast/preview", { params: { audience } });
      setPreview(data.recipients);
    } catch { setError("Failed to load preview"); }
    finally { setPreviewing(false); }
  }

  async function sendBlast() {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required"); return;
    }
    if (!preview) { setError("Load preview first to confirm recipients"); return; }
    setSending(true);
    setError("");
    setResult(null);
    try {
      const { data } = await masterApi.post("/master/email-blast/send", { subject, body, audience });
      setResult(data);
      setSubject("");
      setBody("");
      setPreview(null);
      toast.success(`Email blast sent to ${data.sent} recipients.`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Send failed";
      setError(msg);
      toast.error(msg);
    } finally { setSending(false); }
  }

  const selectedAudience = AUDIENCES.find(a => a.key === audience)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
            <Mail size={20} style={{ color: "#6366f1" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Email Blast</h1>
            <p className="text-sm text-muted-foreground">Send a message to a group of agencies</p>
          </div>
        </div>
      </div>

      {/* Success */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
          <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Email blast sent!</p>
            <p className="text-sm text-green-700 mt-1">
              {result.sent} sent · {result.failed} failed · {result.total} total recipients
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-2">
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-5">
          {/* Audience */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-sm font-bold text-foreground mb-3">Audience</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUDIENCES.map(a => (
                <button key={a.key} onClick={() => { setAudience(a.key); setPreview(null); }}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    audience === a.key
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-border bg-white hover:bg-gray-50"
                  }`}>
                  <p className={`text-sm font-semibold ${audience === a.key ? "text-indigo-700" : "text-foreground"}`}>{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Compose */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <p className="text-sm font-bold text-foreground">Compose</p>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Important update from BrandBees SnapshotAI"
                className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={10}
                placeholder="Write your message here. Each blank line becomes a paragraph."
                className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-y" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={loadPreview} disabled={previewing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-gray-50 disabled:opacity-50 transition-colors">
                <Eye size={14} className={previewing ? "animate-pulse" : ""} />
                {previewing ? "Loading…" : `Preview recipients`}
              </button>
              <button onClick={sendBlast} disabled={sending || !preview || !subject.trim() || !body.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-colors"
                style={{ background: "#6366f1" }}>
                <Send size={14} />
                {sending ? "Sending…" : `Send to ${preview?.length ?? "?"} recipients`}
              </button>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden self-start">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              {preview ? `${preview.length} recipients` : `${selectedAudience.label}`}
            </p>
          </div>
          {!preview ? (
            <div className="p-5 text-sm text-muted-foreground">
              Click &ldquo;Preview recipients&rdquo; to see who will receive this email.
            </div>
          ) : preview.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No agencies in this group.</div>
          ) : (
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {preview.map(r => (
                <div key={r.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
