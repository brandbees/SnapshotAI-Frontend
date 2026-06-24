import { API_BASE_URL } from "./constants";

export interface CmsSection {
  section_key: string;
  fields:      Record<string, string>;
}

export interface PageContent {
  page_key: string;
  sections: CmsSection[];
}

export type GlobalContent = Record<string, Record<string, string>>;

// API_BASE_URL already ends with /api (e.g. http://localhost:3001/api)
// Strip trailing slash so we can append paths cleanly.
const BASE = API_BASE_URL.replace(/\/+$/, "");

/**
 * Fetch all enabled sections + field values for a page.
 * Called from Next.js Server Components with ISR revalidation.
 * Falls back to empty sections if the API is unreachable.
 */
export async function getPageContent(pageKey: string): Promise<PageContent> {
  try {
    const res = await fetch(`${BASE}/content/${pageKey}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as PageContent;
  } catch (err) {
    console.error(`[CMS] getPageContent("${pageKey}") failed:`, err);
    return { page_key: pageKey, sections: [] };
  }
}

/**
 * Fetch global content (header, footer, popup, …).
 * Returns a flat map of section_key → field overrides.
 * Falls back to empty object so hardcoded defaults kick in.
 */
export async function getGlobalContent(): Promise<GlobalContent> {
  try {
    const res = await fetch(`${BASE}/content/global`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as GlobalContent;
  } catch (err) {
    console.error("[CMS] getGlobalContent() failed:", err);
    return {};
  }
}

/**
 * Look up a field value from the fetched sections.
 * Returns registryDefault when the DB has no override.
 */
export function field(
  sections: CmsSection[],
  sectionKey: string,
  fieldKey: string,
  registryDefault: string
): string {
  const sec = sections.find((s) => s.section_key === sectionKey);
  return sec?.fields[fieldKey] ?? registryDefault;
}

/**
 * Build a flat key→value map for a single section.
 * Merges DB overrides on top of registry defaults.
 */
export function sectionFields(
  sections: CmsSection[],
  sectionKey: string,
  defaults: Record<string, string>
): Record<string, string> {
  const sec = sections.find((s) => s.section_key === sectionKey);
  return { ...defaults, ...(sec?.fields ?? {}) };
}
