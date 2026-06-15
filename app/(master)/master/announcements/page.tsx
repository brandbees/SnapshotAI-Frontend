"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";
import masterApi from "@/lib/masterApi";
import { Megaphone, Plus, RefreshCw, Pin, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

interface Announcement {
  id: string; title: string; body: string;
  type: string; pinned: boolean; visible: boolean;
  created_at: string; updated_at: string;
}

const TYPE_OPTS = [
  { key: "info",    label: "Info",    color: "#3b82f6" },
  { key: "warning", label: "Warning", color: "#f59e0b" },
  { key: "success", label: "Success", color: "#22c55e" },
  { key: "danger",  label: "Danger",  color: "#ef4444" },
];

function typeStyle(type: string) {
  return TYPE_OPTS.find(t => t.key === type) ?? TYPE_OPTS[0];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const EMPTY = { title: "", body: "", type: "info", pinned: false, visible: true };

export default function AnnouncementsPage() {
  const [items,   setItems]   = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form,    setForm]    = useState({ ...EMPTY });
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/announcements");
      setItems(data.announcements);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(item: Announcement) {
    setEditing(item.id);
    setForm({ title: item.title, body: item.body, type: item.type, pinned: item.pinned, visible: item.visible });
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await masterApi.patch(`/master/announcements/${editing}`, form);
        toast.success("Announcement updated.");
      } else {
        await masterApi.post("/master/announcements", form);
        toast.success("Announcement created.");
      }
      cancelForm();
      load();
    } catch { toast.error("Failed to save announcement."); }
    finally { setSaving(false); }
  }

  async function toggleVisible(item: Announcement) {
    try {
      await masterApi.patch(`/master/announcements/${item.id}`, { visible: !item.visible });
      load();
    } catch { toast.error("Failed to update."); }
  }

  async function togglePin(item: Announcement) {
    try {
      await masterApi.patch(`/master/announcements/${item.id}`, { pinned: !item.pinned });
      load();
    } catch { toast.error("Failed to update."); }
  }

  async function remove(id: string) {
    if (!await confirm({ title: "Delete announcement?", description: "This will permanently remove the announcement from all agency dashboards.", danger: true, confirmLabel: "Delete" })) return;
    setDeleting(id);
    try {
      await masterApi.delete(`/master/announcements/${id}`);
      toast.success("Announcement deleted.");
      load();
    } catch { toast.error("Failed to delete."); }
    finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#f59e0b,#f97316)" }} />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
              <Megaphone size={20} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Announcements</h1>
              <p className="text-sm text-muted-foreground">{items.length} announcements · shown in agency dashboards</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-gray-50 transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => { cancelForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "#f59e0b" }}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <p className="text-sm font-bold text-foreground">{editing ? "Edit announcement" : "New announcement"}</p>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Scheduled maintenance on Sunday"
              className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4}
              placeholder="Details…"
              className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 resize-y" />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-2">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none">
                {TYPE_OPTS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="rounded" />
              Pin to top
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.visible} onChange={e => setForm(f => ({ ...f, visible: e.target.checked }))} className="rounded" />
              Visible to agencies
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving || !form.title.trim() || !form.body.trim()}
              className="px-5 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
              style={{ background: "#f59e0b" }}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </button>
            <button onClick={cancelForm} className="px-4 py-2 text-sm rounded-xl border border-border text-muted-foreground hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">
            No announcements yet. Create one to show it in agency dashboards.
          </div>
        ) : items.map(item => {
          const t = typeStyle(item.type);
          return (
            <div key={item.id} className={`bg-white rounded-2xl border overflow-hidden ${!item.visible ? "opacity-60" : "border-border"}`}>
              <div className="h-1" style={{ background: t.color }} />
              <div className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ background: `${t.color}15`, color: t.color }}>{t.label}</span>
                    {item.pinned && <span className="text-[10px] font-bold text-amber-500">PINNED</span>}
                    {!item.visible && <span className="text-[10px] font-bold text-gray-400">HIDDEN</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-2">{item.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{timeAgo(item.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(item)} title={item.pinned ? "Unpin" : "Pin"}
                    className={`p-1.5 rounded-lg transition-colors ${item.pinned ? "text-amber-500 bg-amber-50" : "text-muted-foreground hover:bg-gray-100"}`}>
                    <Pin size={13} />
                  </button>
                  <button onClick={() => toggleVisible(item)} title={item.visible ? "Hide" : "Show"}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors">
                    {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(item.id)} disabled={deleting === item.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
