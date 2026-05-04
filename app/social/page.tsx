"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ToolCard, { ToolGrid } from "@/components/ToolCard";

export default function SocialPage() {
  return (
    <div>
      <PageHeader
        title="Email & Social"
        subtitle="Newsletters, captions, calendars, and hooks."
      />

      <Link
        href="/social/post-builder"
        className="block mb-6 p-5 bg-accent/5 border border-accent/30 rounded-xl hover:bg-accent/10 transition"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-accent uppercase tracking-wide">
              New
            </div>
            <h2 className="text-lg font-semibold text-ink mt-1">
              Social Post Builder
            </h2>
            <p className="text-sm text-text mt-1">
              Photograph a fact from a book or calendar → Claude drafts caption,
              description, and hashtags → upload your image → ready for Canva.
            </p>
          </div>
          <span className="text-accent text-2xl">→</span>
        </div>
      </Link>

      <ToolGrid>
        <ToolCard
          tool="newsletter-generator"
          title="Newsletter Generator"
          description="Topic + key points → full email with 3 subject lines."
          fields={[
            { name: "topic", label: "Topic", type: "text", required: true },
            {
              name: "points",
              label: "Key points to cover",
              type: "textarea",
              rows: 5,
              placeholder: "- Point 1\n- Point 2\n- Point 3",
              required: true,
            },
          ]}
          submitLabel="Write Newsletter"
        />

        <ToolCard
          tool="caption-writer"
          title="Caption Writer"
          description="Topic + platform → 3 captions with hashtags."
          fields={[
            { name: "topic", label: "Topic", type: "text", required: true },
            {
              name: "platform",
              label: "Platform",
              type: "select",
              required: true,
              options: ["Instagram", "Facebook", "Twitter / X", "LinkedIn", "TikTok", "Pinterest"],
            },
          ]}
          submitLabel="Write Captions"
        />

        <ToolCard
          tool="content-calendar"
          title="Content Calendar"
          description="Month + theme + posts/week → full month table."
          fields={[
            {
              name: "month",
              label: "Month",
              type: "text",
              placeholder: "e.g. May 2026",
              required: true,
            },
            {
              name: "theme",
              label: "Theme",
              type: "text",
              placeholder: "e.g. Spring travel with dogs",
              required: true,
            },
            {
              name: "postsPerWeek",
              label: "Posts per week",
              type: "select",
              required: true,
              options: ["2", "3", "4", "5", "7"],
            },
          ]}
          submitLabel="Build Calendar"
        />

        <ToolCard
          tool="hook-writer"
          title="Hook Writer"
          description="Topic → 5 hooks with psychological trigger labels."
          fields={[
            { name: "topic", label: "Topic", type: "text", required: true },
          ]}
          submitLabel="Write Hooks"
        />
      </ToolGrid>
    </div>
  );
}
