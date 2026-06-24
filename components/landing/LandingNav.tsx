"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap, Sun, Moon } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

function applyBrandVars(bp: string, ba: string) {
  const r = document.documentElement.style;
  const mix = (base: string, into: string, pct: number) =>
    `color-mix(in oklch, ${base}, ${into} ${pct}%)`;
  r.setProperty("--color-sky-50",     mix(bp, "white", 95));
  r.setProperty("--color-sky-100",    mix(bp, "white", 90));
  r.setProperty("--color-sky-200",    mix(bp, "white", 80));
  r.setProperty("--color-sky-300",    mix(bp, "white", 60));
  r.setProperty("--color-sky-400",    mix(bp, "white", 35));
  r.setProperty("--color-sky-500",    bp);
  r.setProperty("--color-sky-600",    mix(bp, "black", 15));
  r.setProperty("--color-sky-700",    mix(bp, "black", 28));
  r.setProperty("--color-blue-500",   mix(bp, "#4f46e5", 40));
  r.setProperty("--color-blue-600",   mix(bp, "#4338ca", 50));
  r.setProperty("--color-indigo-100", mix(ba, "white", 90));
  r.setProperty("--color-indigo-200", mix(ba, "white", 80));
  r.setProperty("--color-indigo-400", mix(ba, "white", 35));
  r.setProperty("--color-indigo-500", ba);
  r.setProperty("--color-indigo-600", mix(ba, "black", 10));
  r.setProperty("--color-indigo-700", mix(ba, "black", 22));
}

const DEFAULT_NAV_LINKS = [
  { label: "Features",     href: "#features"    },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing",      href: "#pricing"      },
  { label: "Testimonials", href: "#testimonials" },
];

export function LandingNav({ cms = {}, initialDark = false }: { cms?: Record<string, string>; initialDark?: boolean }) {
  const navCta    = cms.nav_cta     || "Get Started";
  const navCtaUrl = cms.nav_cta_url || "/register";

  const NAV_LINKS = (() => {
    if (cms.nav_links) {
      try {
        const parsed = JSON.parse(cms.nav_links);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as { label: string; href: string }[];
      } catch {}
    }
    return DEFAULT_NAV_LINKS;
  })();
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [isDark,     setIsDark]     = useState(false);

  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);

  useEffect(() => {
    // Fetch fresh branding on every client load so color changes are instant
    // without waiting for Next.js ISR revalidation.
    const base = API_BASE_URL.replace(/\/+$/, "");
    fetch(`${base}/content/global?_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const bp = data?.branding?.primary_color;
        const ba = data?.branding?.accent_color;
        if (bp && ba) applyBrandVars(bp, ba);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("landingDark");
    const active = saved !== null ? saved === "true" : initialDark;
    setIsDark(active);
    document.documentElement.classList.toggle("dark", active);
  }, [initialDark]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("landingDark", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? isDark ? "bg-slate-900/97 backdrop-blur-md border-b border-slate-800 shadow-sm"
                   : "bg-white/97 backdrop-blur-md border-b border-gray-200 shadow-sm"
          : isDark ? "bg-slate-900/80 backdrop-blur-sm border-b border-slate-800"
                   : "bg-white/80 backdrop-blur-sm border-b border-gray-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <div className="leading-none">
              <span className="font-black text-[15px] tracking-tight text-gray-900">
                Snapshot<span className="text-sky-500">AI</span>
              </span>
              <span className="block text-[9px] text-gray-400 font-medium tracking-widest uppercase mt-0.5">
                by BrandBees
              </span>
            </div>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Dark mode toggle — desktop */}
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="hidden md:flex ml-auto p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Auth — desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 transition-all hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-1"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href={navCtaUrl}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 transition-all hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-1"
                >
                  {navCta}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="md:hidden ml-auto p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lg">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
            >
              {l.label}
            </button>
          ))}
          <div className="pt-3 border-t border-gray-100 mt-3 flex flex-col gap-2">
            <Link
              href="/login"
              className="text-center px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href={navCtaUrl}
              className="text-center px-4 py-2.5 text-sm font-semibold bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
            >
              {navCta}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
