"use client";

import PageHeader from "@/components/PageHeader";
import ClearAllButton from "@/components/ClearAllButton";
import ToolCard, { ToolGrid } from "@/components/ToolCard";
import { useResults } from "@/components/ResultsContext";
import { ToolId } from "@/lib/prompts";

const SEO_TOOL_IDS: ToolId[] = [
  "title-meta-rewriter",
  "internal-link-suggester",
  "cta-recommender",
  "cannibalization-checker",
  "schema-generator",
];

export default function SeoPage() {
  const { clearToolResults } = useResults();
  return (
    <div>
      <PageHeader
        title="SEO"
        subtitle="Titles, internal links, CTAs, cannibalization, schema."
        actions={
          <ClearAllButton onClick={() => clearToolResults(SEO_TOOL_IDS)} />
        }
      />
      <ToolGrid>
        <ToolCard
          tool="title-meta-rewriter"
          title="Title & Meta Rewriter"
          description="Generate 3 variations of title and meta description."
          fields={[
            { name: "title", label: "Current title", type: "text", required: true },
            {
              name: "meta",
              label: "Current meta description",
              type: "textarea",
              rows: 2,
              required: true,
            },
            {
              name: "keyword",
              label: "Target keyword",
              type: "text",
              required: true,
            },
          ]}
          submitLabel="Rewrite"
        />

        <ToolCard
          tool="internal-link-suggester"
          title="Internal Link Suggester"
          description="Article + page list → 5–10 linking opportunities."
          fields={[
            {
              name: "article",
              label: "Article",
              type: "textarea",
              rows: 7,
              required: true,
            },
            {
              name: "pages",
              label: "Available pages (one per line)",
              type: "textarea",
              rows: 6,
              placeholder:
                "https://site.com/page-1 — Page 1 Title\nhttps://site.com/page-2 — Page 2 Title",
              required: true,
            },
          ]}
          wordPressLoaders={[
            {
              field: "pages",
              label: "Load Pages from WordPress",
              format: (p) => `${p.link} — ${p.title}`,
            },
          ]}
          submitLabel="Suggest Links"
        />

        <ToolCard
          tool="cta-recommender"
          title="CTA Recommender"
          description="Topic + goal → 5 CTA variations."
          fields={[
            { name: "topic", label: "Topic / page context", type: "text", required: true },
            {
              name: "goal",
              label: "Goal",
              type: "select",
              required: true,
              options: [
                "Newsletter signup",
                "Affiliate click",
                "Listing upgrade",
                "Lead magnet download",
                "Product purchase",
                "Social follow",
                "Engagement / comment",
              ],
            },
          ]}
          submitLabel="Recommend CTAs"
        />

        <ToolCard
          tool="cannibalization-checker"
          title="Cannibalization Checker"
          description="Page list → grouped cannibalization issues with fixes."
          fields={[
            {
              name: "pages",
              label: "Page list (URL — title — primary keyword)",
              type: "textarea",
              rows: 8,
              placeholder:
                "https://site.com/dog-cafes — Best Dog Cafes — dog cafes\nhttps://site.com/dog-friendly-cafes — Top Dog-Friendly Cafes — dog friendly cafes",
              required: true,
              helper:
                "Append a primary keyword after the title where you can — the checker uses it to spot overlap.",
            },
          ]}
          wordPressLoaders={[
            {
              field: "pages",
              label: "Load Pages from WordPress",
              format: (p) => `${p.link} — ${p.title} — `,
            },
          ]}
          submitLabel="Check"
        />

        <ToolCard
          tool="schema-generator"
          title="Schema Generator"
          description="Page type + topic → JSON-LD schema."
          fields={[
            {
              name: "pageType",
              label: "Page type",
              type: "select",
              required: true,
              options: [
                "Article",
                "BlogPosting",
                "LocalBusiness",
                "Product",
                "Recipe",
                "HowTo",
                "FAQPage",
                "Review",
                "Organization",
              ],
            },
            {
              name: "topic",
              label: "Topic / page details",
              type: "textarea",
              rows: 4,
              required: true,
            },
          ]}
          submitLabel="Generate Schema"
        />
      </ToolGrid>
    </div>
  );
}
