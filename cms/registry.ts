export type FieldType = "text" | "textarea" | "url";

export interface FieldDef {
  label:   string;
  type:    FieldType;
  default: string;
}

export interface SectionDef {
  label:   string;
  pinned?: boolean;   // true = always on, master cannot disable or reorder away
  fields:  Record<string, FieldDef>;
}

export interface PageDef {
  label:    string;
  slug:     string;
  sections: Record<string, SectionDef>;  // key order = default sort order
}

// ── Global (header + footer) ─────────────────────────────────────────────────
// Edited under /master/pages/global; rendered in the marketing layout on every page.

export const GLOBAL_SECTIONS: Record<string, SectionDef> = {
  header: {
    label:  "Header",
    pinned: true,
    fields: {
      logo_alt:    { label: "Logo Alt Text",  type: "text", default: "BBSnapshotAI" },
      nav_cta:     { label: "Nav CTA Label",  type: "text", default: "Get Started" },
      nav_cta_url: { label: "Nav CTA URL",    type: "url",  default: "/register"   },
    },
  },
  footer: {
    label:  "Footer",
    pinned: true,
    fields: {
      tagline:   { label: "Footer Tagline",  type: "textarea", default: "WordPress monitoring for agencies." },
      copyright: { label: "Copyright Line",  type: "text",     default: `© ${new Date().getFullYear()} BBSnapshotAI` },
    },
  },
};

// ── Pages ─────────────────────────────────────────────────────────────────────
// Add new pages here as designs are confirmed.
// DB seed rows are created by running migrate.js.

export const CMS_PAGES: Record<string, PageDef> = {
  home: {
    label: "Home",
    slug:  "/",
    sections: {
      meta: {
        label:  "SEO / Meta",
        pinned: true,
        fields: {
          title:       { label: "Meta Title",       type: "text",     default: "BBSnapshotAI — WordPress Monitoring" },
          description: { label: "Meta Description", type: "textarea", default: "Monitor every WordPress site from one dashboard." },
          og_image:    { label: "OG Image URL",     type: "url",      default: "/og/home.png" },
        },
      },
      hero: {
        label:  "Hero",
        pinned: true,
        fields: {
          title:       { label: "Heading",    type: "text",     default: "Track Every WordPress Site From One Dashboard" },
          subtitle:    { label: "Subheading", type: "textarea", default: "Uptime, security scans, and performance — all in one place." },
          cta:         { label: "CTA Label",  type: "text",     default: "Start Free Trial" },
          cta_url:     { label: "CTA URL",    type: "url",      default: "/register" },
        },
      },
      features: {
        label:  "Features Overview",
        fields: {
          title:    { label: "Section Heading", type: "text",     default: "Everything You Need" },
          subtitle: { label: "Subheading",      type: "textarea", default: "Built for agencies managing multiple WordPress sites." },
        },
      },
      social_proof: {
        label:  "Social Proof / Stats",
        fields: {
          stat_1: { label: "Stat 1", type: "text", default: "10,000+ Sites Monitored" },
          stat_2: { label: "Stat 2", type: "text", default: "500+ Agencies" },
          stat_3: { label: "Stat 3", type: "text", default: "99.9% Uptime" },
        },
      },
      testimonials: {
        label:  "Testimonials",
        fields: {
          title: { label: "Section Heading", type: "text", default: "What Agencies Say" },
        },
      },
      cta_banner: {
        label:  "Bottom CTA Banner",
        fields: {
          title:   { label: "Heading",   type: "text", default: "Ready to get started?" },
          cta:     { label: "CTA Label", type: "text", default: "Create Free Account" },
          cta_url: { label: "CTA URL",   type: "url",  default: "/register" },
        },
      },
    },
  },
  // pricing, features, about, etc. added here as pages are confirmed
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPageDef(pageKey: string): PageDef | undefined {
  return CMS_PAGES[pageKey];
}

export function getSectionDef(pageKey: string, sectionKey: string): SectionDef | undefined {
  if (pageKey === "_global") return GLOBAL_SECTIONS[sectionKey];
  return CMS_PAGES[pageKey]?.sections[sectionKey];
}

/** All section defs for a page in their default registry order */
export function getOrderedSections(pageKey: string): Array<{ key: string } & SectionDef> {
  const src = pageKey === "_global" ? GLOBAL_SECTIONS : (CMS_PAGES[pageKey]?.sections ?? {});
  return Object.entries(src).map(([key, def]) => ({ key, ...def }));
}
