import { SiteId } from "./sites";

export interface DataSiteConfig {
  gscSiteUrl: string; // sc-domain:example.com or https://example.com/
  ga4Property: string; // full property path, e.g. "properties/123456789"
}

export const DATA_CONFIG: Record<SiteId, DataSiteConfig> = {
  dfd: {
    gscSiteUrl: process.env.GSC_PROPERTY_DFD || "",
    ga4Property: process.env.GA4_PROPERTY_DFD || "",
  },
  kizaz: {
    gscSiteUrl: process.env.GSC_PROPERTY_KIZAZ || "",
    ga4Property: process.env.GA4_PROPERTY_KIZAZ || "",
  },
};
