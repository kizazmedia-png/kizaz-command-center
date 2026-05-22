"use client";

import PageHeader from "@/components/PageHeader";
import ClearAllButton from "@/components/ClearAllButton";
import ToolCard, { ToolGrid } from "@/components/ToolCard";
import { useSite } from "@/components/SiteContext";
import { useResults } from "@/components/ResultsContext";
import { ToolId } from "@/lib/prompts";

const MONETIZATION_TOOL_IDS: ToolId[] = [
  "affiliate-placement",
  "lead-magnet",
  "high-intent-pages",
  "listing-upsell",
];

export default function MonetizationPage() {
  const { siteId } = useSite();
  const isDfd = siteId === "dfd";
  const { clearToolResults } = useResults();

  return (
    <div>
      <PageHeader
        title="Monetization"
        subtitle="Affiliate placements, lead magnets, intent ranking, listing upsells."
        actions={
          <ClearAllButton onClick={() => clearToolResults(MONETIZATION_TOOL_IDS)} />
        }
      />
      <ToolGrid>
        <ToolCard
          tool="affiliate-placement"
          title="Affiliate Placement Suggester"
          description="Article + niche → 5 placements + 3 program suggestions."
          fields={[
            {
              name: "article",
              label: "Article",
              type: "textarea",
              rows: 8,
              required: true,
            },
            { name: "niche", label: "Niche", type: "text", required: true },
          ]}
          submitLabel="Suggest Placements"
        />

        <ToolCard
          tool="lead-magnet"
          title="Lead Magnet Ideas"
          description="Audience + niche → 8 ideas with format and CTA."
          fields={[
            {
              name: "audience",
              label: "Audience",
              type: "text",
              placeholder: "e.g. first-time dog owners",
              required: true,
            },
            { name: "niche", label: "Niche", type: "text", required: true },
          ]}
          submitLabel="Generate Ideas"
        />

        <ToolCard
          tool="high-intent-pages"
          title="High Intent Page Identifier"
          description="Page list → ranked by commercial intent."
          fields={[
            {
              name: "pages",
              label: "Page list (URL — title)",
              type: "textarea",
              rows: 8,
              placeholder:
                "https://site.com/best-x — Best X (2026)\nhttps://site.com/x-vs-y — X vs Y",
              required: true,
            },
          ]}
          submitLabel="Rank Pages"
        />

        <ToolCard
          tool="listing-upsell"
          title="Listing Upsell Generator"
          description="DFD only — write an upsell email to a business owner."
          hidden={!isDfd}
          fields={[
            {
              name: "business",
              label: "Business name",
              type: "text",
              required: true,
            },
            {
              name: "tier",
              label: "Current tier",
              type: "select",
              required: true,
              options: ["Free", "$29/mo", "$49/mo", "$99/mo"],
            },
            {
              name: "targetTier",
              label: "Target tier (optional)",
              type: "select",
              options: ["$29/mo", "$49/mo", "$99/mo"],
            },
          ]}
          submitLabel="Write Email"
        />
      </ToolGrid>
    </div>
  );
}
