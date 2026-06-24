export type FieldType = "text" | "textarea" | "url" | "color" | "toggle" | "repeater";

export interface RepeaterSubField {
  label: string;
  type:  "text" | "textarea" | "url";
}

export interface FieldDef {
  label:       string;
  type:        FieldType;
  default:     string;
  itemSchema?: Record<string, RepeaterSubField>; // only for type: "repeater"
}

export interface SectionDef {
  label:   string;
  pinned?: boolean;
  fields:  Record<string, FieldDef>;
}

export interface SectionLibraryEntry extends SectionDef {
  category: string;
}

export interface PageDef {
  label:    string;
  slug:     string;
  sections: Record<string, SectionDef>;
}

// ── Section library ───────────────────────────────────────────────────────────
// All available section types. Master can add any of these to any page.
// DB stores which sections are on each page; this catalog provides field defs.

export const SECTION_LIBRARY: Record<string, SectionLibraryEntry> = {
  // SEO
  meta: {
    label: "SEO / Meta", category: "SEO", pinned: true,
    fields: {
      title:       { label: "Meta Title",       type: "text",     default: "BBSnapshotAI — WordPress Monitoring" },
      description: { label: "Meta Description", type: "textarea", default: "Monitor every WordPress site from one dashboard." },
      og_image:    { label: "OG Image URL",     type: "url",      default: "/og/home.png" },
    },
  },

  // Marketing
  hero: {
    label: "Hero", category: "Marketing",
    fields: {
      eyebrow:          { label: "Eyebrow Badge",      type: "text",     default: "AI-Powered WordPress Monitoring for Agencies" },
      heading_line1:    { label: "Heading Line 1",     type: "text",     default: "Monitor every" },
      heading_highlight:{ label: "Heading Highlight",  type: "text",     default: "Client site" },
      heading_line3:    { label: "Heading Line 3",     type: "text",     default: "like a pro." },
      subtitle:         { label: "Subtitle",           type: "textarea", default: "Automatically score performance, catch malware, track SEO, and deliver stunning AI-powered reports — so you can focus on growing your agency." },
      cta_label:        { label: "Primary CTA Label",  type: "text",     default: "Start Free — No Card Needed" },
      cta_url:          { label: "Primary CTA URL",    type: "url",      default: "/register" },
      cta2_label:       { label: "Secondary CTA Label",type: "text",     default: "Watch 2-min Demo" },
      social_proof:     { label: "Social Proof Text",  type: "text",     default: "Trusted by 240+ digital agencies" },
    },
  },
  features: {
    label: "Features Overview", category: "Marketing",
    fields: {
      eyebrow:  { label: "Eyebrow",         type: "text",     default: "Everything you need" },
      heading:  { label: "Section Heading", type: "text",     default: "One platform. Full coverage." },
      subtitle: { label: "Subtitle",        type: "textarea", default: "Stop juggling tools. SnapshotAI covers every dimension of WordPress site management so you can focus on growing your agency." },
    },
  },
  how_it_works: {
    label: "How It Works", category: "Marketing",
    fields: {
      eyebrow:   { label: "Eyebrow",          type: "text",     default: "Simple setup" },
      heading:   { label: "Section Heading",  type: "text",     default: "Up and running in 3 steps." },
      subtitle:  { label: "Subtitle",         type: "textarea", default: "From zero to a full client site audit in under 5 minutes. No developer required." },
      step_1:    { label: "Step 1 Title",     type: "text",     default: "Install the Plugin" },
      step_2:    { label: "Step 2 Title",     type: "text",     default: "Run Your First Audit" },
      step_3:    { label: "Step 3 Title",     type: "text",     default: "Deliver the Report" },
      cta_label: { label: "CTA Label",        type: "text",     default: "Get started in 5 minutes" },
      cta_url:   { label: "CTA URL",          type: "url",      default: "/register" },
    },
  },
  cta_banner: {
    label: "CTA Banner", category: "Marketing",
    fields: {
      eyebrow:    { label: "Eyebrow",           type: "text",     default: "Start today — it's free" },
      heading:    { label: "Heading",           type: "textarea", default: "Ready to make site monitoring a competitive advantage?" },
      subtitle:   { label: "Subtitle",          type: "textarea", default: "Join 240+ agencies using Snapshot AI to automate audits, impress clients, and protect every WordPress site they manage." },
      cta_label:  { label: "Primary CTA Label", type: "text",     default: "Start Free — No Card Needed" },
      cta_url:    { label: "Primary CTA URL",   type: "url",      default: "/register" },
      cta2_label: { label: "Secondary CTA",     type: "text",     default: "Compare Plans" },
      cta2_url:   { label: "Secondary CTA URL", type: "url",      default: "#pricing" },
    },
  },

  // Social proof
  social_proof: {
    label: "Stats / Social Proof", category: "Social proof",
    fields: {
      stat_1_end:    { label: "Stat 1 — Number",  type: "text", default: "2400"  },
      stat_1_suffix: { label: "Stat 1 — Suffix",  type: "text", default: "+"     },
      stat_1_label:  { label: "Stat 1 — Label",   type: "text", default: "Sites Monitored"        },
      stat_1_sub:    { label: "Stat 1 — Sub",      type: "text", default: "Across agencies worldwide" },
      stat_2_end:    { label: "Stat 2 — Number",  type: "text", default: "14000" },
      stat_2_suffix: { label: "Stat 2 — Suffix",  type: "text", default: "+"     },
      stat_2_label:  { label: "Stat 2 — Label",   type: "text", default: "Reports Generated"      },
      stat_2_sub:    { label: "Stat 2 — Sub",      type: "text", default: "Beautiful AI-powered PDFs" },
      stat_3_end:    { label: "Stat 3 — Number",  type: "text", default: "99"    },
      stat_3_suffix: { label: "Stat 3 — Suffix",  type: "text", default: ".7%"   },
      stat_3_label:  { label: "Stat 3 — Label",   type: "text", default: "Uptime Accuracy"         },
      stat_3_sub:    { label: "Stat 3 — Sub",      type: "text", default: "Real-time alert reliability" },
      stat_4_end:    { label: "Stat 4 — Number",  type: "text", default: "240"   },
      stat_4_suffix: { label: "Stat 4 — Suffix",  type: "text", default: "+"     },
      stat_4_label:  { label: "Stat 4 — Label",   type: "text", default: "Agencies Trust Us"       },
      stat_4_sub:    { label: "Stat 4 — Sub",      type: "text", default: "And growing every day"  },
    },
  },
  testimonials: {
    label: "Testimonials", category: "Social proof",
    fields: {
      eyebrow:  { label: "Eyebrow",          type: "text",     default: "What agencies say" },
      heading:  { label: "Section Heading",  type: "text",     default: "Agencies love BrandBeesAI." },
      subtitle: { label: "Subtitle",         type: "textarea", default: "Real teams. Real results. See what our customers have to say." },
      items: {
        label:   "Testimonials",
        type:    "repeater",
        default: JSON.stringify([
          { quote: "BrandBeesAI completely changed how we handle client reporting. What took us hours now happens automatically, and our clients are blown away by the professional PDF reports.", name: "Sarah Mitchell",  role: "Founder, PixelCraft Agency"   },
          { quote: "The malware detection caught a serious infection on one of our client's e-commerce sites before it caused any damage. That single alert paid for a full year of the subscription.", name: "James Thornton", role: "Lead Developer, ThornDigital" },
          { quote: "Managing 40+ WordPress sites used to be chaos. Now we have a single dashboard that shows everything at a glance. The AI score breakdowns are genuinely insightful.", name: "Priya Nair",      role: "Director, Nair Web Studio"    },
        ]),
        itemSchema: {
          quote: { label: "Quote",      type: "textarea" },
          name:  { label: "Name",       type: "text"     },
          role:  { label: "Role/Title", type: "text"     },
        },
      },
    },
  },

  // Content
  faq: {
    label: "FAQ", category: "Content",
    fields: {
      title:    { label: "Section Heading", type: "text",     default: "Frequently Asked Questions" },
      subtitle: { label: "Subheading",      type: "textarea", default: "" },
    },
  },
  pricing: {
    label: "Pricing", category: "Content",
    fields: {
      title:    { label: "Section Heading", type: "text",     default: "Simple, Transparent Pricing" },
      subtitle: { label: "Subheading",      type: "textarea", default: "" },
    },
  },
  contact: {
    label: "Contact", category: "Content",
    fields: {
      title:   { label: "Section Heading", type: "text",     default: "Get In Touch" },
      email:   { label: "Contact Email",   type: "text",     default: "" },
      address: { label: "Address",         type: "textarea", default: "" },
    },
  },
};

// ── Global (header + footer + popup) ─────────────────────────────────────────

export const GLOBAL_SECTIONS: Record<string, SectionDef> = {
  header: {
    label: "Header", pinned: true,
    fields: {
      logo_alt: { label: "Logo Alt Text", type: "text", default: "BBSnapshotAI" },
      nav_links: {
        label:   "Navigation Links",
        type:    "repeater",
        default: JSON.stringify([
          { label: "Features",     href: "#features"     },
          { label: "How It Works", href: "#how-it-works" },
          { label: "Pricing",      href: "#pricing"      },
          { label: "Testimonials", href: "#testimonials" },
        ]),
        itemSchema: {
          label: { label: "Link Label", type: "text" },
          href:  { label: "Link URL",   type: "url"  },
        },
      },
      nav_cta:     { label: "CTA Button Label", type: "text", default: "Get Started" },
      nav_cta_url: { label: "CTA Button URL",   type: "url",  default: "/register"  },
    },
  },
  footer: {
    label: "Footer", pinned: true,
    fields: {
      tagline:   { label: "Footer Tagline", type: "textarea", default: "WordPress monitoring for agencies." },
      copyright: { label: "Copyright Line", type: "text",     default: `© ${new Date().getFullYear()} BBSnapshotAI` },
    },
  },
  branding: {
    label: "Branding & Theme", pinned: true,
    fields: {
      primary_color: { label: "Primary Color",  type: "color",  default: "#0ea5e9" },
      accent_color:  { label: "Accent Color",   type: "color",  default: "#6366f1" },
      dark_mode:     { label: "Dark Mode",       type: "toggle", default: "false"   },
    },
  },
  popup: {
    label: "Promo Popup",
    fields: {
      delay_seconds: { label: "Delay before showing (seconds)", type: "text",     default: "5" },
      show_max:      { label: "Max times to show per user",     type: "text",     default: "3" },
      badge:         { label: "Badge Text",                     type: "text",     default: "Limited Time Offer" },
      badge_sub:     { label: "Badge Subtext",                  type: "text",     default: "Launch special · Ends soon" },
      heading:       { label: "Heading",                        type: "text",     default: "Get 30% off your first 3 months" },
      body:          { label: "Body Text",                      type: "textarea", default: "Sign up today and lock in 30% off any paid plan for 3 months. Join 240+ agencies already monitoring smarter." },
      promo_code:    { label: "Promo Code",                     type: "text",     default: "LAUNCH30" },
      cta:           { label: "CTA Button Text",                type: "text",     default: "Claim Offer — Start Free →" },
      cta_url:       { label: "CTA URL",                        type: "url",      default: "/register" },
      dismiss_text:  { label: "Dismiss Link Text",              type: "text",     default: "No thanks, I'll pay full price" },
    },
  },
};

// ── Pages ─────────────────────────────────────────────────────────────────────

export const CMS_PAGES: Record<string, PageDef> = {
  home: {
    label: "Home",
    slug:  "/",
    sections: {
      meta:         SECTION_LIBRARY.meta,
      hero:         SECTION_LIBRARY.hero,
      features:     SECTION_LIBRARY.features,
      social_proof: SECTION_LIBRARY.social_proof,
      testimonials: SECTION_LIBRARY.testimonials,
      cta_banner:   SECTION_LIBRARY.cta_banner,
    },
  },
  // pricing, features, about, etc. added as pages are confirmed
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPageDef(pageKey: string): PageDef | undefined {
  return CMS_PAGES[pageKey];
}

/** Look up a section def — checks page registry first, then global, then library */
export function getSectionDef(pageKey: string, sectionKey: string): SectionDef | undefined {
  if (pageKey === "_global") return GLOBAL_SECTIONS[sectionKey];
  return CMS_PAGES[pageKey]?.sections[sectionKey] ?? SECTION_LIBRARY[sectionKey];
}

export function getOrderedSections(pageKey: string): Array<{ key: string } & SectionDef> {
  const src = pageKey === "_global" ? GLOBAL_SECTIONS : (CMS_PAGES[pageKey]?.sections ?? {});
  return Object.entries(src).map(([key, def]) => ({ key, ...def }));
}

/** Sections in the library not already on a given page */
export function getAvailableSections(existingKeys: Set<string>): Array<{ key: string } & SectionLibraryEntry> {
  return Object.entries(SECTION_LIBRARY)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, def]) => ({ key, ...def }));
}

/** Group sections by category */
export function groupByCategory<T extends { category: string }>(
  sections: Array<{ key: string } & T>
): Record<string, Array<{ key: string } & T>> {
  return sections.reduce((acc, sec) => {
    (acc[sec.category] ??= []).push(sec);
    return acc;
  }, {} as Record<string, Array<{ key: string } & T>>);
}
