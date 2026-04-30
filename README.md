# Kizaz Command Center

AI-powered dashboard for **Dog Friendly Destos** and **Kizaz Media** built on Next.js 14 (App Router), Tailwind CSS, NextAuth (Google), Anthropic Claude, BigQuery, GSC, and GA4.

## Setup

```bash
npm install
cp .env.local .env.local   # then fill in real values
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/dashboard`.

## Environment variables

```
ANTHROPIC_API_KEY=
BIGQUERY_PROJECT_ID=kizaz-media-dashboard-494600
BIGQUERY_DATASET_ID=kizaz_dashboard
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional, per-site Search Console + GA4 wiring (overrides defaults in lib/dataConfig.ts)
GSC_DFD_SITE_URL=sc-domain:dogfriendlydestos.com
GSC_KIZAZ_SITE_URL=sc-domain:kizazmedia.com
GA4_DFD_PROPERTY_ID=
GA4_KIZAZ_PROPERTY_ID=
```

For BigQuery the route uses Application Default Credentials. Either run `gcloud auth application-default login` locally or set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`. On Vercel, attach a service account credential and expose `GOOGLE_APPLICATION_CREDENTIALS_JSON` if you adapt the BigQuery route accordingly.

## Modules

| Route | Module | Tools |
|---|---|---|
| `/dashboard` | Overview | site switcher + module cards |
| `/content` | Content | Topic Finder, Outline Builder, Article Drafter, Content Repurposer, Content Updater |
| `/seo` | SEO | Title/Meta Rewriter, Internal Link Suggester, CTA Recommender, Cannibalization Checker, Schema Generator |
| `/social` | Email & Social | Newsletter Generator, Caption Writer, Content Calendar, Hook Writer |
| `/monetization` | Monetization | Affiliate Placement, Lead Magnet Ideas, High Intent Pages, Listing Upsell (DFD only) |
| `/operations` | Operations | Task List, Content Audit, Site Health, Weekly Report |
| `/data` | Data | GSC, GA4, BigQuery snapshots |

All AI calls go through `/api/ai` (server-side only, Anthropic SDK). The active site is stored in localStorage and passed to every prompt as system context.
