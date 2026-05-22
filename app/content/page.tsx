"use client";

import PageHeader from "@/components/PageHeader";
import ClearAllButton from "@/components/ClearAllButton";
import ToolCard, { ToolGrid } from "@/components/ToolCard";
import DfdArticleWorkflow from "@/components/DfdArticleWorkflow";
import { useSite } from "@/components/SiteContext";
import { useResults } from "@/components/ResultsContext";
import { ToolId } from "@/lib/prompts";

const CONTENT_TOOL_IDS: ToolId[] = [
  "topic-finder",
  "outline-builder",
  "article-drafter",
  "content-repurposer",
  "content-updater",
];

export default function ContentPage() {
  const { siteId } = useSite();
  const { clearToolResults, clearDfdWorkflowResults } = useResults();

  if (siteId === "dfd") {
    return (
      <div>
        <PageHeader
          title="Article Workflow"
          subtitle="Five-step pipeline: keyword → intent → keywords → brief → draft → meta."
          actions={<ClearAllButton onClick={clearDfdWorkflowResults} />}
        />
        <DfdArticleWorkflow />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Find topics, build outlines, draft articles, repurpose, and refresh."
        actions={
          <ClearAllButton onClick={() => clearToolResults(CONTENT_TOOL_IDS)} />
        }
      />
      <ToolGrid>
        <ToolCard
          tool="topic-finder"
          title="Topic Finder"
          description="Seed keyword → 10 topic ideas with intent labels."
          fields={[
            {
              name: "seed",
              label: "Seed keyword",
              type: "text",
              placeholder: "e.g. dog-friendly patios in Austin",
              required: true,
            },
          ]}
          submitLabel="Find Topics"
        />

        <ToolCard
          tool="outline-builder"
          title="Outline Builder"
          description="Topic → full SEO outline with H1/H2/H3, word counts, and meta."
          fields={[
            {
              name: "topic",
              label: "Topic",
              type: "text",
              placeholder: "e.g. Best Dog-Friendly Cafes in Denver",
              required: true,
            },
            {
              name: "keyword",
              label: "Target keyword (optional)",
              type: "text",
              placeholder: "e.g. dog friendly cafes denver",
            },
            {
              name: "wordCount",
              label: "Target word count (optional)",
              type: "text",
              placeholder: "e.g. 1500-2000",
            },
          ]}
          submitLabel="Build Outline"
        />

        <ToolCard
          tool="article-drafter"
          title="Article Drafter"
          description="Topic and/or outline → full article with [FACT CHECK] flags."
          fields={[
            {
              name: "topic",
              label: "Topic",
              type: "text",
              placeholder: "Article topic",
              required: true,
            },
            {
              name: "outline",
              label: "Outline / brief (optional)",
              type: "textarea",
              rows: 6,
              placeholder: "Paste outline or notes...",
            },
            {
              name: "wordCount",
              label: "Target word count",
              type: "text",
              placeholder: "1500",
            },
          ]}
          publishToWordPress={{ titleField: "topic" }}
          submitLabel="Draft Article"
        />

        <ToolCard
          tool="content-repurposer"
          title="Content Repurposer"
          description="Article → Facebook / Pinterest / Email / Twitter formats."
          fields={[
            {
              name: "article",
              label: "Article",
              type: "textarea",
              rows: 8,
              placeholder: "Paste full article markdown or text...",
              required: true,
            },
            {
              name: "formats",
              label: "Formats",
              type: "checkboxes",
              options: ["Facebook", "Pinterest", "Email", "Twitter"],
              required: true,
            },
          ]}
          submitLabel="Repurpose"
        />

        <ToolCard
          tool="content-updater"
          title="Content Updater"
          description="Old article + what changed → refreshed article."
          fields={[
            {
              name: "article",
              label: "Old article",
              type: "textarea",
              rows: 8,
              placeholder: "Paste existing article...",
              required: true,
            },
            {
              name: "changes",
              label: "What's changed / new info",
              type: "textarea",
              rows: 5,
              placeholder: "New stats, updated rules, new examples...",
              required: true,
            },
          ]}
          submitLabel="Refresh Article"
        />
      </ToolGrid>
    </div>
  );
}
