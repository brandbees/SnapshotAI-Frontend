"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import masterApi from "@/lib/masterApi";
import {
  Layers, Globe, Clock, ChevronRight, LayoutGrid,
  RefreshCw, Sparkles, FileStack,
} from "lucide-react";
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
  const router                    = useRouter();
  const [rows,    setRows]        = useState<PageRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [spinning, setSpinning]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setSpinning(true);
    } else {
      setLoading(true);
    }
    try {
      const { data } = await masterApi.get("/master/pages");
      setRows(data.pages ?? []);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      total:         dbRow ? Number(dbRow.section_count) : Object.keys(def?.sections ?? {}).length,
      active:        dbRow ? Number(dbRow.enabled_count) : Object.keys(def?.sections ?? {}).length,
      last_updated:  dbRow?.last_updated ?? null,
    };
  });

  const totalActive  = pageCards.reduce((a, p) => a + p.active, 0);
  const totalSections = pageCards.reduce((a, p) => a + p.total, 0);
  const globalCount  = Object.keys(GLOBAL_SECTIONS).length;

  return (
    <div className="space-y-8">

      {/* ── Hero banner ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white p-8">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-100/40" />
        <div className="pointer-events-none absolute -right-4 -bottom-8 h-32 w-32 rounded-full bg-orange-100/30" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm">
                <Layers size={16} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Pages CMS</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Control the content, section layout, and SEO metadata for every public marketing page — no code needed.
            </p>
          </div>

          <button
            onClick={() => load(true /* isRefresh */)}
            disabled={spinning}
            className="p-2 rounded-lg border border-amber-200 bg-white/80 text-amber-500 hover:bg-white transition-colors"
          >
            <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats strip */}
        <div className="relative flex items-center gap-8 mt-6 pt-6 border-t border-amber-100/70">
          <div>
            <p className="text-2xl font-bold text-foreground">{pageCards.length + 1}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total pages</p>
          </div>
          <div className="w-px h-8 bg-amber-100" />
          <div>
            <p className="text-2xl font-bold text-foreground">{totalActive + globalCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active sections</p>
          </div>
          <div className="w-px h-8 bg-amber-100" />
          <div>
            <p className="text-2xl font-bold text-foreground">{totalSections + globalCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total sections</p>
          </div>
        </div>
      </div>

      {/* ── Global ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Global</p>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={() => router.push("/master/pages/global")}
          className="group w-full flex items-center gap-5 px-6 py-5 rounded-2xl border border-border bg-white hover:border-amber-300 hover:shadow-md transition-all text-left"
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
            <Globe size={20} className="text-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-foreground">Header &amp; Footer</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Shared across every marketing page — nav links, CTAs, copyright
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{globalCount} sections</p>
              <p className="text-xs text-muted-foreground">always on</p>
            </div>
            <div className="w-8 h-8 rounded-lg border border-border bg-gray-50 flex items-center justify-center group-hover:border-amber-300 group-hover:bg-amber-50 transition-colors">
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </div>
          </div>
        </button>
      </div>

      {/* ── Per-page grid ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Pages</p>
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground">{pageCards.length} page{pageCards.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="h-48 rounded-2xl border border-border bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageCards.map(page => {
              const allOn   = page.active === page.total;
              const pct     = page.total > 0 ? Math.round((page.active / page.total) * 100) : 0;

              return (
                <button
                  key={page.key}
                  onClick={() => router.push(`/master/pages/${page.key}`)}
                  className="group relative flex flex-col text-left p-6 rounded-2xl border border-border bg-white hover:border-amber-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Background accent */}
                  <div className="pointer-events-none absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-3xl" />

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 group-hover:bg-amber-50 border border-border group-hover:border-amber-200 flex items-center justify-center transition-colors shrink-0">
                      <LayoutGrid size={18} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <span className={[
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full",
                      allOn
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100",
                    ].join(" ")}>
                      {page.active}/{page.total} active
                    </span>
                  </div>

                  {/* Name + slug */}
                  <p className="text-lg font-bold text-foreground leading-tight">{page.label}</p>
                  <span className="inline-block mt-1 text-[11px] font-mono text-muted-foreground bg-gray-50 border border-border px-1.5 py-0.5 rounded-md">
                    {page.slug}
                  </span>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${allOn ? "bg-green-400" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{pct}% sections enabled</p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(page.last_updated)}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit page <ChevronRight size={11} />
                    </span>
                  </div>
                </button>
              );
            })}

            {/* "Coming soon" placeholder */}
            <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-border text-center min-h-[192px]">
              <div className="w-11 h-11 rounded-xl bg-gray-50 border border-dashed border-border flex items-center justify-center">
                <FileStack size={18} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">More pages coming</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Add to registry.ts as designs are confirmed</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tip ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-blue-50/60 border border-blue-100 text-sm text-blue-700">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-blue-500" />
        <p>
          To add a new page, define it in <code className="font-mono text-xs bg-blue-100 px-1 py-0.5 rounded">cms/registry.ts</code>, seed it in <code className="font-mono text-xs bg-blue-100 px-1 py-0.5 rounded">migrate.js</code>, then run the migration.
        </p>
      </div>

    </div>
  );
}
