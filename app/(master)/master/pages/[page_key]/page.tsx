"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import masterApi from "@/lib/masterApi";
import {
  ArrowLeft, Lock, Globe, LayoutGrid,
  RefreshCw, Loader2, Save, Undo2, ChevronUp, ChevronDown,
  Circle, Plus, Trash2, X, Eye, EyeOff,
} from "lucide-react";
import {
  CMS_PAGES, GLOBAL_SECTIONS, SECTION_LIBRARY,
  getAvailableSections, groupByCategory,
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
  key:        string;
  def:        SectionDef;
  enabled:    boolean;
  sort_order: number;
  fields:     Record<string, string>;
  dirty:      boolean;
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={e => { e.stopPropagation(); onChange(); }}
      disabled={disabled}
      className={[
        "relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0",
        checked  ? "bg-green-500" : "bg-gray-200",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span className={[
        "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
        checked ? "translate-x-4" : "translate-x-0",
      ].join(" ")} />
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeSection(
  key: string, def: SectionDef, db: DbSection | undefined, defaultOrder: number,
): MergedSection {
  const fields: Record<string, string> = {};
  for (const fk of Object.keys(def.fields)) fields[fk] = db?.fields[fk] ?? "";
  return { key, def, enabled: db?.enabled ?? true, sort_order: db?.sort_order ?? defaultOrder, fields, dirty: false };
}

function filledCount(fields: Record<string, string>) {
  return Object.values(fields).filter(v => v !== "").length;
}

// ── Repeater field ────────────────────────────────────────────────────────────

function RepeaterField({ def, value, onChange }: {
  def:      FieldDef;
  value:    string;
  onChange: (v: string) => void;
}) {
  const schema = def.itemSchema ?? {};

  const defaultItems = useMemo(() => {
    try { return JSON.parse(def.default) as Record<string, string>[]; }
    catch { return [] as Record<string, string>[]; }
  }, [def.default]);

  const items = useMemo<Record<string, string>[]>(() => {
    if (!value) return defaultItems;
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p : defaultItems;
    }
    catch { return defaultItems; }
  }, [value, defaultItems]);

  const commit = (next: Record<string, string>[]) => onChange(JSON.stringify(next));

  const setItemField = (i: number, fk: string, v: string) =>
    commit(items.map((item, idx) => idx === i ? { ...item, [fk]: v } : item));

  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const addItem = () => {
    const blank: Record<string, string> = {};
    for (const fk of Object.keys(schema)) blank[fk] = "";
    commit([...items, blank]);
  };

  const removeItem = (i: number) => commit(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
          {/* Item header */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
              Item {i + 1}
            </span>
            <button disabled={i === 0} onClick={() => moveItem(i, -1)}
              className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors">
              <ChevronUp size={11} />
            </button>
            <button disabled={i === items.length - 1} onClick={() => moveItem(i, 1)}
              className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors">
              <ChevronDown size={11} />
            </button>
            <button onClick={() => removeItem(i)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={11} />
            </button>
          </div>
          {/* Sub-fields */}
          <div className="p-3 space-y-3">
            {Object.entries(schema).map(([fk, subDef]) => (
              <div key={fk}>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  {subDef.label}
                </label>
                {subDef.type === "textarea" ? (
                  <textarea
                    rows={2}
                    value={item[fk] ?? ""}
                    onChange={e => setItemField(i, fk, e.target.value)}
                    className="w-full rounded-lg border border-border bg-gray-50/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:bg-white resize-none transition-all"
                  />
                ) : (
                  <input
                    type={subDef.type === "url" ? "url" : "text"}
                    value={item[fk] ?? ""}
                    onChange={e => setItemField(i, fk, e.target.value)}
                    className="w-full rounded-lg border border-border bg-gray-50/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:bg-white transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-amber-300 hover:bg-amber-50/30 text-xs font-medium text-muted-foreground hover:text-amber-600 transition-all"
      >
        <Plus size={12} />
        Add item
      </button>
    </div>
  );
}

// ── Field input ───────────────────────────────────────────────────────────────

function FieldInput({ def, value, onChange, onRevert }: {
  def:      FieldDef;
  value:    string;
  onChange: (v: string) => void;
  onRevert: () => void;
}) {
  const hasValue   = value !== "";
  const isRepeater = def.type === "repeater";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          {def.label}
          {def.type === "url"     && <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">URL</span>}
          {def.type === "color"   && <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">COLOR</span>}
          {def.type === "repeater"&& <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">REPEATER</span>}
        </label>
        {hasValue && !isRepeater && (
          <button onClick={onRevert} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 transition-colors">
            <Undo2 size={10} /> Reset
          </button>
        )}
      </div>

      {def.type === "repeater" && (
        <RepeaterField def={def} value={value} onChange={onChange} />
      )}

      {def.type === "color" && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || def.default}
            onChange={e => onChange(e.target.value)}
            className="w-12 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent shrink-0"
          />
          <input
            type="text"
            value={value || def.default}
            onChange={e => onChange(e.target.value)}
            placeholder={def.default}
            className="flex-1 rounded-xl border border-border bg-gray-50/50 px-4 py-3 text-sm font-mono text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:bg-white transition-all"
          />
          <div
            className="w-10 h-10 rounded-lg border border-border shrink-0"
            style={{ background: value || def.default }}
          />
        </div>
      )}

      {def.type === "toggle" && (
        <div className="flex items-center gap-3 py-1">
          <Toggle
            checked={value === "true" || (!value && def.default === "true")}
            onChange={() => onChange(value === "true" ? "false" : "true")}
          />
          <span className="text-sm text-muted-foreground">
            {value === "true" || (!value && def.default === "true") ? "Enabled" : "Disabled"}
          </span>
        </div>
      )}

      {(def.type === "text" || def.type === "url") && (
        <input
          type={def.type === "url" ? "url" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={def.default}
          className="w-full rounded-xl border border-border bg-gray-50/50 px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:bg-white transition-all"
        />
      )}

      {def.type === "textarea" && (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={def.default}
          className="w-full rounded-xl border border-border bg-gray-50/50 px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 focus:bg-white resize-none transition-all"
        />
      )}

      {!isRepeater && def.type !== "toggle" && def.type !== "color" && (
        <p className="text-[11px] text-gray-400 mt-1.5 pl-1">
          Default: <em className="not-italic">{def.default || "—"}</em>
        </p>
      )}
    </div>
  );
}

// ── Add-section picker ────────────────────────────────────────────────────────

function AddSectionPicker({ existingKeys, onAdd, onClose }: {
  existingKeys: Set<string>;
  onAdd:        (key: string) => Promise<void>;
  onClose:      () => void;
}) {
  const available = getAvailableSections(existingKeys);
  const grouped   = groupByCategory(available);
  const [adding,  setAdding] = useState<string | null>(null);

  return (
    <div className="absolute top-full mt-2 right-0 z-30 w-72 rounded-2xl border border-amber-200 bg-white shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Add a section</p>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={13} />
        </button>
      </div>

      {available.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">All sections already on this page.</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/60 mb-1.5">{cat}</p>
            <div className="space-y-1">
              {items.map(sec => (
                <button
                  key={sec.key}
                  disabled={adding !== null}
                  onClick={async () => { setAdding(sec.key); await onAdd(sec.key); setAdding(null); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-gray-50/50 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">{sec.label}</p>
                    <p className="text-[10px] text-muted-foreground">{Object.keys(sec.fields).length} fields</p>
                  </div>
                  {adding === sec.key
                    ? <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />
                    : <Plus size={12} className="text-gray-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Field panel ───────────────────────────────────────────────────────────────

function FieldPanel({
  section, isGlobal, index, total,
  onFieldChange, onRevertField, onSave, saving,
  onToggle, onMoveUp, onMoveDown, onRemove,
}: {
  section:       MergedSection;
  isGlobal:      boolean;
  index:         number;
  total:         number;
  onFieldChange: (fk: string, v: string) => void;
  onRevertField: (fk: string) => void;
  onSave:        () => void;
  saving:        boolean;
  onToggle:      () => void;
  onMoveUp:      () => void;
  onMoveDown:    () => void;
  onRemove:      () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const entries   = Object.entries(section.def.fields) as [string, FieldDef][];
  const filled    = filledCount(section.fields);
  const fieldCount= entries.length;
  const isPinned  = section.def.pinned || isGlobal;

  return (
    <div className="flex flex-col h-full">

      {/* Panel header */}
      <div className="flex items-start justify-between pb-4 mb-5 border-b border-border shrink-0">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <h2 className="text-lg font-bold text-foreground">{section.def.label}</h2>
            {!isPinned && (
              <div className="flex items-center gap-2">
                <Toggle checked={section.enabled} onChange={onToggle} />
                <span className="text-xs text-muted-foreground">
                  {section.enabled ? "Visible on page" : "Hidden"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
            {filled > 0 && (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                {filled} customised
              </span>
            )}
            {isPinned && (
              <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <Lock size={9} /> always on
              </span>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Progress dots */}
          <div className="flex items-center gap-1 mr-1">
            {entries.slice(0, 12).map(([fk]) => (
              <div key={fk} className={["w-1.5 h-1.5 rounded-full", section.fields[fk] ? "bg-amber-400" : "bg-gray-200"].join(" ")} />
            ))}
          </div>

          {/* Reorder + remove (non-pinned, non-global) */}
          {!isPinned && (
            <>
              <button disabled={index === 0} onClick={onMoveUp}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground transition-colors">
                <ChevronUp size={14} />
              </button>
              <button disabled={index === total - 1} onClick={onMoveDown}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground transition-colors">
                <ChevronDown size={14} />
              </button>
              {confirmRemove ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => setConfirmRemove(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg border border-border transition-colors">
                    Cancel
                  </button>
                  <button onClick={onRemove}
                    className="text-[10px] text-white bg-red-500 hover:bg-red-600 px-2 py-1.5 rounded-lg font-semibold transition-colors">
                    Remove
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(true)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}

          {/* Save */}
          <button
            onClick={onSave}
            disabled={saving || !section.dirty}
            className={["flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ml-2 transition-all",
              section.dirty && !saving
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                : "bg-gray-100 text-muted-foreground cursor-not-allowed",
            ].join(" ")}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto space-y-7 pr-1">
        {entries.map(([fk, def]) => (
          <FieldInput
            key={fk}
            def={def}
            value={section.fields[fk] ?? ""}
            onChange={v => onFieldChange(fk, v)}
            onRevert={() => onRevertField(fk)}
          />
        ))}
      </div>

    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PageEditorPage() {
  const { page_key } = useParams<{ page_key: string }>();
  const router       = useRouter();
  const isGlobal     = page_key === "global";

  const [sections,     setSections]     = useState<MergedSection[]>([]);
  const [activeKey,    setActiveKey]    = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [savingKey,    setSavingKey]    = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);

  const pageLabel = isGlobal ? "Global" : (CMS_PAGES[page_key]?.label ?? page_key);
  const pageSlug  = !isGlobal && CMS_PAGES[page_key]?.slug;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await masterApi.get(`/master/pages/${page_key}`);
      const dbSections: DbSection[] = data.sections ?? [];

      const getDef = (sk: string): SectionDef | undefined =>
        isGlobal
          ? GLOBAL_SECTIONS[sk]
          : CMS_PAGES[page_key]?.sections[sk] ?? SECTION_LIBRARY[sk];

      const inDb = new Set(dbSections.map(s => s.section_key));

      const merged: MergedSection[] = dbSections
        .map((db, i) => {
          const def = getDef(db.section_key);
          return def ? mergeSection(db.section_key, def, db, (i + 1) * 10) : null;
        })
        .filter(Boolean) as MergedSection[];

      const regEntries = isGlobal
        ? Object.entries(GLOBAL_SECTIONS)
        : Object.entries(CMS_PAGES[page_key]?.sections ?? {});
      for (const [key, def] of regEntries) {
        if (!inDb.has(key)) merged.push(mergeSection(key, def, undefined, (merged.length + 1) * 10));
      }

      setSections(merged);
      setActiveKey(prev => (prev && merged.find(s => s.key === prev)) ? prev : (merged[0]?.key ?? null));
    } catch { toast.error("Failed to load"); }
    finally   { setLoading(false); }
  }, [page_key, isGlobal]);

  useEffect(() => { load(); }, [load]);

  const activeSection = sections.find(s => s.key === activeKey) ?? null;
  const activeIndex   = sections.findIndex(s => s.key === activeKey);
  const existingKeys  = new Set(sections.map(s => s.key));

  // ── Layout ────────────────────────────────────────────────────────────────

  async function saveLayout(updated: MergedSection[]) {
    try {
      await masterApi.patch(`/master/pages/${page_key}/layout`,
        updated.map((s, i) => ({ section_key: s.key, enabled: s.enabled, sort_order: (i + 1) * 10 }))
      );
    } catch { toast.error("Failed to save layout"); }
  }

  function toggleEnabled(key: string) {
    if (sections.find(s => s.key === key)?.def.pinned) return;
    const next = sections.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s);
    setSections(next); saveLayout(next);
  }

  function move(key: string, dir: -1 | 1) {
    const i = sections.findIndex(s => s.key === key), j = i + dir;
    if (i < 0 || j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next); saveLayout(next);
  }

  // ── Add / Remove ──────────────────────────────────────────────────────────

  async function addSection(sectionKey: string) {
    try {
      await masterApi.post(`/master/pages/${page_key}/sections`, { section_key: sectionKey });
      await load();
      setShowPicker(false);
      toast.success("Section added");
    } catch { toast.error("Failed to add section"); }
  }

  async function removeSection(key: string) {
    const label = sections.find(s => s.key === key)?.def.label ?? key;
    try {
      await masterApi.delete(`/master/pages/${page_key}/sections/${key}`);
      setSections(prev => prev.filter(s => s.key !== key));
      setActiveKey(prev => prev === key ? (sections.find(s => s.key !== key)?.key ?? null) : prev);
      toast.success(`${label} removed`);
    } catch { toast.error("Failed to remove section"); }
  }

  // ── Content ───────────────────────────────────────────────────────────────

  function setField(sk: string, fk: string, v: string) {
    setSections(p => p.map(s => s.key !== sk ? s : { ...s, dirty: true, fields: { ...s.fields, [fk]: v } }));
  }

  async function revertField(sk: string, fk: string) {
    try {
      await masterApi.delete(`/master/pages/${page_key}/content/${sk}/${fk}`);
      setSections(p => p.map(s => s.key !== sk ? s : { ...s, fields: { ...s.fields, [fk]: "" } }));
      toast.success("Field reset to default");
    } catch { toast.error("Failed to revert"); }
  }

  async function saveContent(sk: string) {
    const sec = sections.find(s => s.key === sk);
    if (!sec) return;
    setSavingKey(sk);
    try {
      await masterApi.patch(`/master/pages/${page_key}/content`, { section_key: sk, fields: sec.fields });
      setSections(p => p.map(s => s.key === sk ? { ...s, dirty: false } : s));
      toast.success(`${sec.def.label} saved`);
    } catch { toast.error("Failed to save"); }
    finally   { setSavingKey(null); }
  }

  async function handleRevalidate() {
    setRevalidating(true);
    try {
      await masterApi.post(`/master/pages/${page_key}/revalidate`, {});
      toast.success("Page cache refreshed");
    } catch { toast.error("Revalidation failed"); }
    finally   { setRevalidating(false); }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 5.5rem)" }}>
        <div className="h-9 w-56 rounded-xl bg-gray-100 animate-pulse" />
        <div className="flex gap-2">
          {[0,1,2,3].map(i => <div key={i} className="h-9 w-24 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="flex-1 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5.5rem)" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push("/master/pages")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <div className={["w-7 h-7 rounded-lg flex items-center justify-center", isGlobal ? "bg-amber-500" : "bg-gray-800"].join(" ")}>
              {isGlobal ? <Globe size={14} className="text-white" /> : <LayoutGrid size={13} className="text-white" />}
            </div>
            <h1 className="text-base font-bold text-foreground">{pageLabel}</h1>
            {pageSlug && (
              <span className="text-xs font-mono text-muted-foreground bg-gray-100 border border-border px-2 py-0.5 rounded-md">
                {pageSlug}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {sections.filter(s => s.enabled).length}/{sections.length} sections on
            {sections.some(s => s.dirty) && <span className="text-amber-500 font-medium ml-1.5">· unsaved</span>}
          </span>
          <button
            onClick={handleRevalidate}
            disabled={revalidating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:border-gray-300 hover:shadow-sm disabled:opacity-50 transition-all"
          >
            {revalidating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Refresh cache
          </button>
        </div>
      </div>

      {/* ── Horizontal tabs ── */}
      <div className="shrink-0 relative mb-1">
        <div className="flex items-end gap-0.5 overflow-x-auto border-b border-border pb-0">

          {sections.map(sec => {
            const isActive = activeKey === sec.key;
            const isPinned = sec.def.pinned || isGlobal;
            return (
              <button
                key={sec.key}
                onClick={() => { setShowPicker(false); setActiveKey(sec.key); }}
                className={[
                  "group flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all rounded-t-xl border border-b-0 relative",
                  isActive
                    ? "bg-white border-border text-foreground shadow-sm z-10 -mb-px"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/70",
                  !sec.enabled && !isActive ? "opacity-50" : "",
                ].join(" ")}
              >
                {isPinned
                  ? <Lock size={10} className={isActive ? "text-amber-500" : "text-gray-400"} />
                  : !sec.enabled
                    ? <EyeOff size={10} className="text-gray-400" />
                    : <Eye size={10} className={isActive ? "text-green-500" : "text-gray-300 group-hover:text-gray-400"} />
                }
                {sec.def.label}
                {sec.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5 shrink-0" />}
              </button>
            );
          })}

          {/* Add section (page editors only) */}
          {!isGlobal && (
            <button
              onClick={() => setShowPicker(v => !v)}
              className={[
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-t-xl border border-b-0 mb-0 ml-1 transition-all",
                showPicker
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "border-dashed border-border text-muted-foreground hover:text-amber-600 hover:bg-amber-50/50 hover:border-amber-200",
              ].join(" ")}
            >
              <Plus size={11} />
              Add section
            </button>
          )}
        </div>

        {/* Picker dropdown */}
        {showPicker && !isGlobal && (
          <AddSectionPicker
            existingKeys={existingKeys}
            onAdd={addSection}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      {/* ── Content panel ── */}
      <div className="flex-1 rounded-b-2xl rounded-tr-2xl border border-border border-t-0 bg-white px-8 py-6 min-h-0 overflow-hidden">
        {activeSection ? (
          <FieldPanel
            section={activeSection}
            isGlobal={isGlobal}
            index={activeIndex}
            total={sections.length}
            onFieldChange={(fk, v) => setField(activeSection.key, fk, v)}
            onRevertField={fk => revertField(activeSection.key, fk)}
            onSave={() => saveContent(activeSection.key)}
            saving={savingKey === activeSection.key}
            onToggle={() => toggleEnabled(activeSection.key)}
            onMoveUp={() => move(activeSection.key, -1)}
            onMoveDown={() => move(activeSection.key, 1)}
            onRemove={() => removeSection(activeSection.key)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <Circle size={28} className="text-gray-200" />
            <p className="text-sm text-muted-foreground">Select a section from the tabs above</p>
          </div>
        )}
      </div>
    </div>
  );
}
