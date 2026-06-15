"use client";

import { useState, useEffect } from "react";
import { X, Megaphone, AlertTriangle, CheckCircle, Info } from "lucide-react";
import api from "@/lib/api";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  pinned: boolean;
  created_at: string;
}

const DISMISSED_KEY = "bb_banner_dismissed_ids";

function getDismissedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function addDismissed(id: string) {
  try {
    const s = getDismissedIds();
    s.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]));
  } catch { /* ignore */ }
}

const TYPE_STYLE: Record<string, { bg: string; border: string; text: string; icon: typeof Info }> = {
  info:    { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800",  icon: Info          },
  warning: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800", icon: AlertTriangle },
  success: { bg: "bg-green-50",  border: "border-green-200", text: "text-green-800", icon: CheckCircle   },
  danger:  { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   icon: AlertTriangle },
};

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/announcements");
        const items: Announcement[] = data.announcements ?? [];
        if (!items.length) return;

        const dismissed = getDismissedIds();
        // Prefer pinned, then most recent
        const candidate =
          items.find(a => a.pinned && !dismissed.has(a.id)) ??
          items.find(a => !dismissed.has(a.id)) ??
          null;
        setAnnouncement(candidate);
      } catch { /* silent */ }
    }
    load();
  }, []);

  if (!announcement || dismissed) return null;

  const style = TYPE_STYLE[announcement.type] ?? TYPE_STYLE.info;
  const Icon  = style.icon;

  function dismiss() {
    addDismissed(announcement!.id);
    setDismissed(true);
  }

  return (
    <div className={`flex items-start gap-3 px-5 py-2.5 border-b text-sm ${style.bg} ${style.border} ${style.text}`}>
      <Icon size={15} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{announcement.title}:</span>{" "}
        <span className="opacity-90">{announcement.body}</span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="p-1 rounded hover:opacity-60 transition-opacity shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
}
