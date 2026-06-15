"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import masterApi from "@/lib/masterApi";

interface PlatformInfo {
  name:     string;
  tagline:  string;
  logoUrl:  string;
}

interface MasterPlatformContextValue {
  platform: PlatformInfo;
  refresh:  () => Promise<void>;
}

const DEFAULT: PlatformInfo = {
  name:    "BrandBees",
  tagline: "Master Panel",
  logoUrl: "",
};

const MasterPlatformContext = createContext<MasterPlatformContextValue>({
  platform: DEFAULT,
  refresh:  async () => {},
});

export function MasterPlatformProvider({ children }: { children: React.ReactNode }) {
  const [platform, setPlatform] = useState<PlatformInfo>(DEFAULT);

  const refresh = useCallback(async () => {
    try {
      const { data } = await masterApi.get<{ settings: { key: string; value: string }[] }>(
        "/master/settings"
      );
      const get = (key: string) => data.settings.find(s => s.key === key)?.value ?? "";
      setPlatform({
        name:    get("platform_name")    || "BrandBees",
        tagline: get("platform_tagline") || "Master Panel",
        logoUrl: get("platform_logo_url"),
      });
    } catch { /* not logged in yet or network error */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <MasterPlatformContext.Provider value={{ platform, refresh }}>
      {children}
    </MasterPlatformContext.Provider>
  );
}

export function useMasterPlatform() {
  return useContext(MasterPlatformContext);
}
