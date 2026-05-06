import Link from "next/link";
import { Zap, MapPin, Mail, Phone } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Features",        href: "#features"     },
    { label: "How It Works",    href: "#how-it-works"  },
    { label: "Pricing",         href: "#pricing"       },
    { label: "Changelog",       href: "#"              },
    { label: "WordPress Plugin",href: "#"              },
  ],
  Company: [
    { label: "About BrandBees", href: "https://brandbees.net" },
    { label: "Blog",            href: "#"             },
    { label: "Careers",         href: "#"             },
    { label: "Partner Program", href: "#"             },
  ],
  Support: [
    { label: "Documentation",   href: "#"             },
    { label: "Help Center",     href: "#"             },
    { label: "Contact Us",      href: "mailto:hello@brandbees.net" },
    { label: "System Status",   href: "#"             },
  ],
  Legal: [
    { label: "Privacy Policy",  href: "#"             },
    { label: "Terms of Service",href: "#"             },
    { label: "Cookie Policy",   href: "#"             },
    { label: "GDPR",            href: "#"             },
  ],
};

const SOCIALS = [
  { label: "𝕏",  title: "Twitter / X",  bg: "#000000" },
  { label: "in", title: "LinkedIn",      bg: "#0077B5" },
  { label: "f",  title: "Facebook",      bg: "#1877F2" },
  { label: "yt", title: "YouTube",       bg: "#FF0000" },
];

export function LandingFooter() {
  return (
    <footer className="bg-slate-900">
      {/* Main footer body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">

          {/* Brand column — spans 2 cols */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md">
                <Zap size={16} className="text-white" fill="white" />
              </div>
              <div className="leading-none">
                <span className="font-black text-[16px] text-white tracking-tight">
                  Snapshot<span className="text-sky-400">AI</span>
                </span>
                <span className="block text-[9px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">
                  by BrandBees
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-[220px]">
              AI-powered WordPress site monitoring and reporting for modern digital agencies.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2 mb-6">
              {SOCIALS.map((s) => (
                <a
                  key={s.title}
                  href="#"
                  title={s.title}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black transition-all hover:scale-110 hover:opacity-90"
                  style={{ background: s.bg }}
                >
                  {s.label}
                </a>
              ))}
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <a href="mailto:hello@brandbees.net" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors group">
                <Mail size={12} className="shrink-0 group-hover:text-sky-400 transition-colors" />
                hello@brandbees.net
              </a>
              <a href="https://brandbees.net" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors group">
                <MapPin size={12} className="shrink-0 group-hover:text-sky-400 transition-colors" />
                brandbees.net
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                {group}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()}{" "}
            <a href="https://brandbees.net" className="hover:text-slate-400 transition-colors">
              BrandBees
            </a>
            {" "}Snapshot AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-slate-600">
              Powered by{" "}
              <a
                href="https://brandbees.net"
                target="_blank"
                rel="noreferrer"
                className="text-sky-500 hover:text-sky-400 font-medium transition-colors"
              >
                BrandBees
              </a>
            </p>
            <span className="text-slate-700 text-xs">·</span>
            <p className="text-xs text-slate-600">Built for agencies.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
