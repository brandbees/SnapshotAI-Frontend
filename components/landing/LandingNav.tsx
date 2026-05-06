"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, X, Zap } from "lucide-react";

const NAV_LINKS = [
  { label: "Features",     href: "#features"    },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing",      href: "#pricing"      },
  { label: "Testimonials", href: "#testimonials" },
];

export function LandingNav() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search,     setSearch]     = useState("");

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
          ? "bg-white/97 backdrop-blur-md border-b border-gray-200 shadow-sm"
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

          {/* Search — desktop */}
          <div className="hidden lg:flex flex-1 max-w-[200px] items-center gap-2 h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus-within:border-sky-400 focus-within:bg-white transition-all duration-200">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              style={{width: '100%'}}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 text-sm bg-transparent text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>

          {/* Auth — desktop */}
          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 transition-all hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-1"
            >
              Start Free →
            </Link>
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
              href="/register"
              className="text-center px-4 py-2.5 text-sm font-semibold bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
            >
              Start Free →
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
