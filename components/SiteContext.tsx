"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SiteId, SITES, SiteConfig } from "@/lib/sites";

interface SiteContextValue {
  siteId: SiteId;
  site: SiteConfig;
  setSiteId: (id: SiteId) => void;
}

const Ctx = createContext<SiteContextValue | null>(null);

const STORAGE_KEY = "kizaz_active_site";

export function SiteProvider({ children }: { children: ReactNode }) {
  const [siteId, setSiteIdState] = useState<SiteId>("dfd");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as SiteId | null;
    if (saved && SITES[saved]) setSiteIdState(saved);
  }, []);

  const setSiteId = (id: SiteId) => {
    setSiteIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  };

  return (
    <Ctx.Provider value={{ siteId, site: SITES[siteId], setSiteId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSite() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSite must be used inside <SiteProvider>");
  return v;
}
