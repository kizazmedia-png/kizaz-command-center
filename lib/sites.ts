export type SiteId = "dfd" | "kizaz";

export interface SiteConfig {
  id: SiteId;
  name: string;
  shortName: string;
  description: string;
  audience: string;
  tone: string;
  domains: string[];
  brands?: string[];
}

export const SITES: Record<SiteId, SiteConfig> = {
  dfd: {
    id: "dfd",
    name: "Dog Friendly Destos",
    shortName: "DFD",
    description:
      "A directory of dog-friendly restaurants, bars, patios, and venues. Helps dog owners discover places that welcome their pets, and helps businesses get found by dog-loving customers.",
    audience:
      "Dog owners planning outings, travelers with pets, and local business owners looking to attract dog-friendly customers.",
    tone: "Warm, friendly, helpful, dog-loving. Practical and trustworthy. Use language a real dog owner would.",
    domains: ["dogfriendlydestos.com"],
  },
  kizaz: {
    id: "kizaz",
    name: "Kizaz Media",
    shortName: "Kizaz",
    description:
      "Digital media company operating multiple content brands. Focused on educational, lifestyle, and home-improvement content with strong SEO and audience-driven monetization.",
    audience:
      "General lifestyle readers across history (HistorAI), home/family (Joy in the Home), and DIY/home-improvement (DIY Spotlight).",
    tone: "Authoritative but approachable. Clear, well-researched, scannable. Should feel like an expert friend.",
    domains: ["historai.com", "joyinthehome.com", "diyspotlight.com"],
    brands: ["HistorAI", "Joy in the Home", "DIY Spotlight"],
  },
};

export function getSiteContextString(siteId: SiteId): string {
  const site = SITES[siteId];
  const brandsLine = site.brands
    ? `\nBrands: ${site.brands.join(", ")}.`
    : "";
  return `You are assisting with content and growth for ${site.name}.
Description: ${site.description}
Audience: ${site.audience}
Tone & Voice: ${site.tone}
Primary domain(s): ${site.domains.join(", ")}.${brandsLine}

Always tailor outputs to this site's audience and tone. Output clean, well-structured Markdown with proper headings, lists, and tables where helpful.`;
}
