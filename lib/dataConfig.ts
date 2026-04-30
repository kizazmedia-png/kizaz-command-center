import { SiteId } from "./sites";

export interface DataSiteConfig {
  gscSiteUrl: string; // sc-domain:example.com or https://example.com/
  ga4PropertyId: string; // numeric property id
}

// Placeholders — fill in real GSC site URLs and GA4 property IDs once configured.
export const DATA_CONFIG: Record<SiteId, DataSiteConfig> = {
  dfd: {
    gscSiteUrl: process.env.GSC_DFD_SITE_URL || "sc-domain:dogfriendlydestos.com",
    ga4PropertyId: process.env.GA4_DFD_PROPERTY_ID || "",
  },
  kizaz: {
    gscSiteUrl: process.env.GSC_KIZAZ_SITE_URL || "sc-domain:kizazmedia.com",
    ga4PropertyId: process.env.GA4_KIZAZ_PROPERTY_ID || "",
  },
};
