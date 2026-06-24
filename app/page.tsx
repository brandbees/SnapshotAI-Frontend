import type { Metadata } from "next";
import { LandingNav }          from "@/components/landing/LandingNav";
import { HeroSection }         from "@/components/landing/HeroSection";
import { StatsSection }        from "@/components/landing/StatsSection";
import { ProblemSection }      from "@/components/landing/ProblemSection";
import { FeaturesSection }     from "@/components/landing/FeaturesSection";
import { SpotlightSection }    from "@/components/landing/SpotlightSection";
import { HowItWorksSection }   from "@/components/landing/HowItWorksSection";
import { PricingSection }      from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection }          from "@/components/landing/FAQSection";
import { CTASection }          from "@/components/landing/CTASection";
import { NewsletterSection }   from "@/components/landing/NewsletterSection";
import { LandingFooter }       from "@/components/landing/LandingFooter";
import { OfferPopup }          from "@/components/landing/OfferPopup";
import { ScrollToTop }         from "@/components/landing/ScrollToTop";
import { getPageContent, getGlobalContent, field, type CmsSection } from "@/lib/cms";

const DEFAULT_TITLE = "Snapshot AI by BrandBees — WordPress Monitoring for Agencies";
const DEFAULT_DESC  = "Automatically audit every client WordPress site. Score performance, catch malware, track SEO, and deliver beautiful AI-powered reports. Built for digital agencies.";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPageContent("home");
  return {
    title:       field(content.sections, "meta", "title",       DEFAULT_TITLE),
    description: field(content.sections, "meta", "description", DEFAULT_DESC),
  };
}

/** Pull DB-stored field overrides for one section (components handle their own defaults). */
function sf(sections: CmsSection[], key: string): Record<string, string> {
  return sections.find((s) => s.section_key === key)?.fields ?? {};
}

export default async function LandingPage() {
  const [pageContent, globalContent] = await Promise.all([
    getPageContent("home"),
    getGlobalContent(),
  ]);

  const sections = pageContent.sections;

  const popupEnabled = "popup" in globalContent;
  const popupData    = globalContent.popup    ?? {};
  const headerCms    = globalContent.header   ?? {};
  const footerCms    = globalContent.footer   ?? {};
  const branding     = globalContent.branding ?? {};

  const bp  = branding.primary_color ?? "#0ea5e9"; // brand primary
  const ba  = branding.accent_color  ?? "#6366f1"; // brand accent
  const dark = branding.dark_mode === "true";

  // Tailwind v4 generates utilities via CSS vars (--color-sky-500 etc). Override in :root for
  // branding, and in .dark for dark mode — every affected utility updates automatically.
  const brandCss = `
:root {
  --color-sky-50:     color-mix(in oklch, ${bp}, white 95%);
  --color-sky-100:    color-mix(in oklch, ${bp}, white 90%);
  --color-sky-200:    color-mix(in oklch, ${bp}, white 80%);
  --color-sky-300:    color-mix(in oklch, ${bp}, white 60%);
  --color-sky-400:    color-mix(in oklch, ${bp}, white 35%);
  --color-sky-500:    ${bp};
  --color-sky-600:    color-mix(in oklch, ${bp}, black 15%);
  --color-sky-700:    color-mix(in oklch, ${bp}, black 28%);
  --color-sky-800:    color-mix(in oklch, ${bp}, black 42%);
  --color-sky-900:    color-mix(in oklch, ${bp}, black 56%);
  --color-blue-500:   color-mix(in oklch, ${bp}, #4f46e5 40%);
  --color-blue-600:   color-mix(in oklch, ${bp}, #4338ca 50%);
  --color-indigo-100: color-mix(in oklch, ${ba}, white 90%);
  --color-indigo-200: color-mix(in oklch, ${ba}, white 80%);
  --color-indigo-400: color-mix(in oklch, ${ba}, white 35%);
  --color-indigo-500: ${ba};
  --color-indigo-600: color-mix(in oklch, ${ba}, black 10%);
  --color-indigo-700: color-mix(in oklch, ${ba}, black 22%);
}
.dark {
  color-scheme: dark;
  --color-gray-50:   #131c2e;
  --color-gray-100:  #1e293b;
  --color-gray-200:  #293548;
  --color-gray-300:  #334155;
  --color-gray-400:  #475569;
  --color-gray-500:  #64748b;
  --color-gray-600:  #94a3b8;
  --color-gray-700:  #cbd5e1;
  --color-gray-800:  #e2e8f0;
  --color-gray-900:  #f1f5f9;
  --color-gray-950:  #f8fafc;
  --color-slate-50:  #131c2e;
  --color-slate-100: #1e293b;
}
.dark .bg-white            { background-color: #0f172a }
.dark .bg-gray-900         { background-color: #0f172a }
.dark .hover\\:bg-white:hover       { background-color: #1e293b }
.dark .hover\\:bg-gray-800:hover    { background-color: #131c2e }
`.trim();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandCss }} />
      <main className="overflow-x-hidden">
      <LandingNav          cms={headerCms} initialDark={dark} />
      <HeroSection         cms={sf(sections, "hero")} />
      <StatsSection        cms={sf(sections, "social_proof")} />
      <ProblemSection />
      <FeaturesSection     cms={sf(sections, "features")} />
      <SpotlightSection />
      <HowItWorksSection   cms={sf(sections, "how_it_works")} />
      <PricingSection />
      <TestimonialsSection cms={sf(sections, "testimonials")} />
      <FAQSection />
      <CTASection          cms={sf(sections, "cta_banner")} />
      <NewsletterSection />
      <LandingFooter       cms={footerCms} />
      <OfferPopup enabled={popupEnabled} data={popupData} />
      <ScrollToTop />
    </main>
    </>
  );
}
