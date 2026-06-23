"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import masterApi from "@/lib/masterApi";
import {
  ArrowLeft, ChevronDown, ChevronUp, Save, RotateCcw,
  Lock, Globe, LayoutGrid, Eye, EyeOff, RefreshCw, Loader2,
} from "lucide-react";
import {
  GLOBAL_SECTIONS, CMS_PAGES, getOrderedSections,
  type SectionDef, type FieldDef,
} from "@/cms/registry";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbSection {
  section_key: string;
  enabled:     boolean;
  sort_order:  number;
  fields:      Record<string, string | null>;
}

interface MergedSection {
  key:       string;
  def:       SectionDef;
  enabled:   boolean;
  sort_order: number;
  fields:    Record<string, string>;  // DB value or ""
  dirty:     boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeSection(
  key: string,
  def: SectionDef,
  dbSection: DbSection | undefined,
  defaultOrder: number,
): MergedSection {
  const merged: Record<string, string> = {};
  for (const fk of Object.keys(def.fields)) {
    merged[fk] = dbSection?.fields[fk] ?? "";
  }
  return {
    key,
    def,
    enabled:    dbSection?.enabled    ?? true,
    sort_order: dbSection?.sort_order ?? defaultOrder,
    fields:     merged,
    dirty:      false,
  };
}

// ── Field input ───────────────────────────────────────────────────────────────

function FieldRow({
  fieldKey,
  def,
  value,
  onChange,
  onRevert,
}: {
  fieldKey:  string;
  def:       FieldDef;
  value:     string;
  onChange:  (v: string) => void;
  onRevert:  () => void;
}) {
  const isDirty = value !== "";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{def.label}</label>
        {isDirty && (
          <button
            onClick={onRevert}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={9} /> Revert to default
          </button>
        )}
      </div>
      {def.type === "textarea" ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={def.default}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
        />
      ) : (
        <input
          type={def.type === "url" ? "url" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={def.default}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      )}
      <p className="text-[10px] text-muted-foreground">
        Default: <span className="italic">{def.default || "—"}</span>
      </p>
    </div>
  );
}

// ── Section row ───────────────────────────────────────────────────────────────

function SectionRow({
  section,
  index,
  total,
  isGlobal,
  expanded,
  onToggleExpand,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
  onFieldChange,
  onRevertField,
  onSaveContent,
  saving,
}: {
  section:        MergedSection;
  index:          number;
  total:          number;
  isGlobal:       boolean;
  expanded:       boolean;
  onToggleExpand: () => void;
  onToggleEnabled: () => void;
  onMoveUp:       () => void;
  onMoveDown:     () => void;
  onFieldChange:  (fk: string, v: string) => void;
  onRevertField:  (fk: string) => void;
  onSaveContent:  () => void;
  saving:         boolean;
}) {
  const isPinned = section.def.pinned || isGlobal;

  return (
    <div className={`rounded-xl border transition-colors ${expanded ? "border-amber-300 bg-amber-50/30" : "border-border bg-white"}`}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Reorder buttons */}
        {!isPinned && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              disabled={index === 0}
              onClick={onMoveUp}
              className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp size={12} className="text-muted-foreground" />
            </button>
            <button
              disabled={index === total - 1}
              onClick={onMoveDown}
              className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>
          </div>
        )}
        {isPinned && <Lock size={12} className="text-muted-foreground shrink-0" />}

        {/* Label + expand */}
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <span className={`text-sm font-medium ${section.enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
            {section.def.label}
          </span>
          {section.dirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">
              unsaved
            </span>
          )}
          <ChevronDown
            size={14}
            className={`ml-auto shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Enable / disable toggle (not for pinned) */}
        {!isPinned && (
          <button
            onClick={onToggleEnabled}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors shrink-0 ${
              section.enabled
                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-border bg-white text-muted-foreground hover:bg-gray-50"
            }`}
          >
            {section.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
            {section.enabled ? "On" : "Off"}
          </button>
        )}
      </div>

      {/* Expanded: field editor */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-200/60 pt-3">
          {Object.entries(section.def.fields).map(([fk, def]) => (
            <FieldRow
              key={fk}
              fieldKey={fk}
              def={def}
              value={section.fields[fk] ?? ""}
              onChange={v => onFieldChange(fk, v)}
              onRevert={() => onRevertField(fk)}
            />
          ))}

          <div className="flex justify-end pt-1">
            <button
              onClick={onSaveContent}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save section
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PageEditorPage() {
  const { page_key }   = useParams<{ page_key: string }>();
  const router         = useRouter();
  const isGlobal       = page_key === "global";

  const [sections,    setSections]    = useState<MergedSection[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [savingKey,   setSavingKey]   = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const pageLabel = isGlobal
    ? "Header & Footer"
    : (CMS_PAGES[page_key]?.label ?? page_key);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get(`/master/pages/${page_key}`);
      const dbSections: DbSection[] = data.sections ?? [];
      const dbMap = Object.fromEntries(dbSections.map(s => [s.section_key, s]));

      const regSections = getOrderedSections(isGlobal ? "_global" : page_key);
      const merged = regSections.map((sec, i) =>
        mergeSection(sec.key, sec, dbMap[sec.key], (i + 1) * 10)
      );

      // Sort by DB sort_order when available
      merged.sort((a, b) => a.sort_order - b.sort_order);
      setSections(merged);
    } catch {
      toast.error("Failed to load page content");
    } finally {
      setLoading(false);
    }
  }, [page_key, isGlobal]);

  useEffect(() => { load(); }, [load]);

  // ── Layout mutations (toggle + reorder) — auto-save ──────────────────────

  async function saveLayout(updated: MergedSection[]) {
    try {
      await masterApi.patch(`/master/pages/${page_key}/layout`,
        updated.map((s, i) => ({
          section_key: s.key,
          enabled:     s.enabled,
          sort_order:  (i + 1) * 10,
        }))
      );
    } catch {
      toast.error("Failed to save layout");
    }
  }

  function toggleEnabled(key: string) {
    if (sections.find(s => s.key === key)?.def.pinned) return;
    const updated = sections.map(s =>
      s.key === key ? { ...s, enabled: !s.enabled } : s
    );
    setSections(updated);
    saveLayout(updated);
  }

  function move(key: string, dir: -1 | 1) {
    const idx = sections.findIndex(s => s.key === key);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= sections.length) return;
    const updated = [...sections];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    setSections(updated);
    saveLayout(updated);
  }

  // ── Content mutations ─────────────────────────────────────────────────────

  function setField(sectionKey: string, fieldKey: string, value: string) {
    setSections(prev => prev.map(s =>
      s.key !== sectionKey ? s : {
        ...s,
        dirty:  true,
        fields: { ...s.fields, [fieldKey]: value },
      }
    ));
  }

  async function revertField(sectionKey: string, fieldKey: string) {
    try {
      await masterApi.delete(`/master/pages/${page_key}/content/${sectionKey}/${fieldKey}`);
      setSections(prev => prev.map(s =>
        s.key !== sectionKey ? s : { ...s, fields: { ...s.fields, [fieldKey]: "" } }
      ));
      toast.success("Field reverted to default");
    } catch {
      toast.error("Failed to revert field");
    }
  }

  async function saveContent(sectionKey: string) {
    const sec = sections.find(s => s.key === sectionKey);
    if (!sec) return;
    setSavingKey(sectionKey);
    try {
      await masterApi.patch(`/master/pages/${page_key}/content`, {
        section_key: sectionKey,
        fields:      sec.fields,
      });
      setSections(prev => prev.map(s =>
        s.key === sectionKey ? { ...s, dirty: false } : s
      ));
      toast.success(`${sec.def.label} saved`);
    } catch {
      toast.error("Failed to save content");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRevalidate() {
    setRevalidating(true);
    try {
      await masterApi.post(`/master/pages/${page_key}/revalidate`, {});
      toast.success("Page cache refreshed");
    } catch {
      toast.error("Revalidation failed — check NEXT_FRONTEND_URL env var");
    } finally {
      setRevalidating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/master/pages")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            {isGlobal ? (
              <Globe size={18} className="text-amber-500" />
            ) : (
              <LayoutGrid size={18} className="text-amber-500" />
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground leading-none">{pageLabel}</h1>
              {!isGlobal && CMS_PAGES[page_key] && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {CMS_PAGES[page_key].slug}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleRevalidate}
          disabled={revalidating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {revalidating
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />}
          Refresh cache
        </button>
      </div>

      {/* Hint */}
      {!isGlobal && (
        <p className="text-xs text-muted-foreground bg-gray-50 border border-border rounded-lg px-4 py-2.5">
          Pinned sections (<Lock size={10} className="inline" />) are always visible and cannot be reordered.
          Toggle optional sections on/off with the <strong>On/Off</strong> button.
          Up/down arrows reorder sections. Changes to layout are saved immediately.
          Content changes require clicking <strong>Save section</strong>.
        </p>
      )}

      {/* Section list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((sec, i) => (
            <SectionRow
              key={sec.key}
              section={sec}
              index={i}
              total={sections.length}
              isGlobal={isGlobal}
              expanded={expandedKey === sec.key}
              onToggleExpand={() => setExpandedKey(expandedKey === sec.key ? null : sec.key)}
              onToggleEnabled={() => toggleEnabled(sec.key)}
              onMoveUp={() => move(sec.key, -1)}
              onMoveDown={() => move(sec.key, 1)}
              onFieldChange={(fk, v) => setField(sec.key, fk, v)}
              onRevertField={fk => revertField(sec.key, fk)}
              onSaveContent={() => saveContent(sec.key)}
              saving={savingKey === sec.key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
