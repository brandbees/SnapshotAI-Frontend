"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

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
  const [branding, setBrandingState] = useState<Branding>({
    logoUrl: null,
    brandName: null,
    accentColor: null,
    faviconUrl: null,
  });

  useEffect(() => {
    if (!isLoggedIn()) return;
    api.get<{ logo_url?: string | null; brand_name?: string | null; accent_color?: string | null; favicon_url?: string | null }>(
      "/settings"
    )
      .then(({ data }) => {
        const patch: Branding = {
          logoUrl: data.logo_url ?? null,
          brandName: data.brand_name ?? null,
          accentColor: data.accent_color ?? null,
          faviconUrl: data.favicon_url ?? null,
        };
        setBrandingState(patch);
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
