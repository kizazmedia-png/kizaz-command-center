"use client";

import PageHeader from "@/components/PageHeader";
import ToolCard, { ToolGrid } from "@/components/ToolCard";

export default function OperationsPage() {
  return (
    <div>
      <PageHeader
        title="Operations"
        subtitle="Task lists, content audits, site health, weekly reports."
      />
      <ToolGrid>
        <ToolCard
          tool="task-list"
          title="Task List Generator"
          description="Focus + time available → must / should / nice-to-do."
          fields={[
            {
              name: "focus",
              label: "Focus / area",
              type: "text",
              placeholder: "e.g. Improve SEO performance this week",
              required: true,
            },
            {
              name: "time",
              label: "Time available",
              type: "text",
              placeholder: "e.g. 4 hours, full day, etc.",
              required: true,
            },
          ]}
          submitLabel="Generate Tasks"
        />

        <ToolCard
          tool="content-audit"
          title="Content Audit Helper"
          description="Page titles + last updated → keep / update / consolidate / delete."
          fields={[
            {
              name: "pages",
              label: "Pages (Title — last updated date)",
              type: "textarea",
              rows: 10,
              placeholder:
                "Top Dog Cafes in Denver — 2022-04\nDog Friendly Patios in Austin — 2024-09",
              required: true,
            },
          ]}
          submitLabel="Audit"
        />

        <ToolCard
          tool="site-health"
          title="Site Health Checklist"
          description="Site URL → monthly / quarterly / one-time checklist."
          fields={[
            {
              name: "url",
              label: "Site URL / context",
              type: "text",
              required: true,
            },
          ]}
          submitLabel="Build Checklist"
        />

        <ToolCard
          tool="weekly-report"
          title="Weekly Report Generator"
          description="Wins + problems + content → formatted weekly report."
          fields={[
            {
              name: "wins",
              label: "Wins this week",
              type: "textarea",
              rows: 4,
              required: true,
            },
            {
              name: "problems",
              label: "Problems / blockers",
              type: "textarea",
              rows: 4,
              required: true,
            },
            {
              name: "content",
              label: "Content produced",
              type: "textarea",
              rows: 4,
              required: true,
            },
          ]}
          submitLabel="Generate Report"
        />
      </ToolGrid>
    </div>
  );
}
