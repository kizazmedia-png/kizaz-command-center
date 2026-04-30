"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useSite } from "@/components/SiteContext";

const MODULES = [
  {
    href: "/content",
    title: "Content",
    desc: "Topic ideas, outlines, drafts, repurposing, and updates.",
    tools: 5,
  },
  {
    href: "/seo",
    title: "SEO",
    desc: "Title/meta rewrites, internal links, CTAs, cannibalization, schema.",
    tools: 5,
  },
  {
    href: "/social",
    title: "Email & Social",
    desc: "Newsletters, captions, calendars, and hooks.",
    tools: 4,
  },
  {
    href: "/monetization",
    title: "Monetization",
    desc: "Affiliate placements, lead magnets, intent ranking, listing upsells.",
    tools: 4,
  },
  {
    href: "/operations",
    title: "Operations",
    desc: "Task lists, content audits, site health, weekly reports.",
    tools: 4,
  },
  {
    href: "/data",
    title: "Data",
    desc: "Search Console, GA4, BigQuery historical snapshots.",
    tools: 3,
  },
];

export default function DashboardPage() {
  const { site } = useSite();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Active site: ${site.name}`}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-base font-semibold text-ink">{site.name}</h2>
        <p className="text-sm text-text mt-1">{site.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {site.domains.map((d) => (
            <span
              key={d}
              className="text-xs px-2 py-1 rounded-md bg-gray-100 text-text"
            >
              {d}
            </span>
          ))}
          {site.brands?.map((b) => (
            <span
              key={b}
              className="text-xs px-2 py-1 rounded-md bg-accent/10 text-accent"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-text mb-3">
        Modules
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-accent hover:shadow-md transition"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-ink group-hover:text-accent">
                {m.title}
              </h3>
              <span className="text-xs text-text">{m.tools} tools</span>
            </div>
            <p className="text-sm text-text mt-2">{m.desc}</p>
            <span className="mt-4 inline-block text-sm font-medium text-accent">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
