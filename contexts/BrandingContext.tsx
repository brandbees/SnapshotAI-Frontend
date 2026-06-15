"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "@/lib/api";
import { isLoggedIn, getBranding, saveBranding } from "@/lib/auth";

interface Branding {
  logoUrl: string | null;
  brandName: string | null;
  accentColor: string | null;
  faviconUrl: string | null;
}

interface BrandingContextValue extends Branding {
  setBranding: (patch: Partial<Branding>) => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: null,
  brandName: null,
  accentColor: null,
  faviconUrl: null,
  setBranding: () => {},
});

function applyFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Always initialize with nulls so SSR and first client render match (no hydration mismatch).
  // localStorage values are applied in useEffect, which is client-only.
  const [branding, setBrandingState] = useState<Branding>({
    logoUrl: null,
    brandName: null,
    accentColor: null,
    faviconUrl: null,
  });

  useEffect(() => {
    // Immediately seed from localStorage to minimize flash (runs right after hydration)
    const stored = getBranding();
    if (stored) {
      setBrandingState({
        logoUrl:     stored.logo_url     ?? null,
        brandName:   stored.brand_name   ?? null,
        accentColor: stored.accent_color ?? null,
        faviconUrl:  stored.favicon_url  ?? null,
      });
      // accent_color is already set by the inline <script> in layout.tsx, but set again for safety
      if (stored.accent_color) {
        document.documentElement.style.setProperty("--accent", stored.accent_color);
      }
      if (stored.favicon_url) applyFavicon(stored.favicon_url);
    }

    if (!isLoggedIn()) return;
    api.get<{ logo_url?: string | null; brand_name?: string | null; accent_color?: string | null; favicon_url?: string | null }>(
      "/settings"
    )
      .then(({ data }) => {
        const patch: Branding = {
          logoUrl:     data.logo_url     ?? null,
          brandName:   data.brand_name   ?? null,
          accentColor: data.accent_color ?? null,
          faviconUrl:  data.favicon_url  ?? null,
        };
        setBrandingState(patch);
        saveBranding({
          accent_color: patch.accentColor,
          logo_url:     patch.logoUrl,
          favicon_url:  patch.faviconUrl,
          brand_name:   patch.brandName,
        });
        if (patch.accentColor) {
          document.documentElement.style.setProperty("--accent", patch.accentColor);
        }
        if (patch.brandName) {
          document.title = patch.brandName;
        }
        if (patch.faviconUrl) {
          applyFavicon(patch.faviconUrl);
        }
      })
      .catch(() => {});
  }, []);

  function setBranding(patch: Partial<Branding>) {
    setBrandingState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.accentColor) {
        document.documentElement.style.setProperty("--accent", patch.accentColor);
      }
      if (patch.brandName !== undefined) {
        document.title = patch.brandName || "SnapshotAI";
      }
      if (patch.faviconUrl) {
        applyFavicon(patch.faviconUrl);
      }
      return next;
    });
  }

  return (
    <BrandingContext.Provider value={{ ...branding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
