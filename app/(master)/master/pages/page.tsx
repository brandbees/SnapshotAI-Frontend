"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import masterApi from "@/lib/masterApi";
import { Layers, Globe, Clock, ChevronRight, LayoutGrid } from "lucide-react";
import { CMS_PAGES, GLOBAL_SECTIONS } from "@/cms/registry";

interface PageRow {
  page_key:      string;
  section_count: string;
  enabled_count: string;
  last_updated:  string | null;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never edited";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PagesListPage() {
  const router             = useRouter();
  const [rows, setRows]    = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get("/master/pages");
      setRows(data.pages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Merge DB stats with registry labels; add any registry pages not yet in DB
  const allPageKeys = Array.from(
    new Set([...Object.keys(CMS_PAGES), ...rows.map(r => r.page_key)])
  );

  const pageCards = allPageKeys.map(key => {
    const dbRow = rows.find(r => r.page_key === key);
    const def   = CMS_PAGES[key];
    return {
      key,
      label:         def?.label ?? key,
      slug:          def?.slug  ?? `/${key}`,
      section_count: dbRow ? Number(dbRow.section_count) : Object.keys(def?.sections ?? {}).length,
      enabled_count: dbRow ? Number(dbRow.enabled_count) : Object.keys(def?.sections ?? {}).length,
      last_updated:  dbRow?.last_updated ?? null,
    };
  });

  const globalSectionCount = Object.keys(GLOBAL_SECTIONS).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-200">
          <Layers size={18} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pages CMS</h1>
          <p className="text-sm text-muted-foreground">Edit text content and meta for each public page</p>
        </div>
      </div>

      {/* Global card */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Global</p>
        <button
          onClick={() => router.push("/master/pages/global")}
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-white hover:border-amber-300 hover:bg-amber-50/40 transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <Globe size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Header &amp; Footer</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Appears on every marketing page · {globalSectionCount} sections (always on)
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Per-page cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Pages</p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="h-20 rounded-xl border border-border bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {pageCards.map(page => (
              <button
                key={page.key}
                onClick={() => router.push(`/master/pages/${page.key}`)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-white hover:border-amber-300 hover:bg-amber-50/40 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <LayoutGrid size={18} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">{page.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{page.slug}</span>
                      <span className="mx-1.5">·</span>
                      {page.enabled_count}/{page.section_count} sections on
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={11} /> {timeAgo(page.last_updated)}
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
