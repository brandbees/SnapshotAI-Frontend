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

export const metadata = {
  title: "Snapshot AI by BrandBees — WordPress Monitoring for Agencies",
  description:
    "Automatically audit every client WordPress site. Score performance, catch malware, track SEO, and deliver beautiful AI-powered reports. Built for digital agencies.",
};

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <StatsSection />
      <ProblemSection />
      <FeaturesSection />
      <SpotlightSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <NewsletterSection />
      <LandingFooter />
      <OfferPopup />
      <ScrollToTop />
    </main>
  );
}
