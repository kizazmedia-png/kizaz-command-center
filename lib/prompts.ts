import { SiteId, getSiteContextString } from "./sites";

export type ToolId =
  // Content
  | "topic-finder"
  | "outline-builder"
  | "article-drafter"
  | "content-repurposer"
  | "content-updater"
  // DFD article workflow (6-step pipeline)
  | "dfd-intent"
  | "dfd-keywords"
  | "dfd-brief"
  | "dfd-draft"
  | "dfd-citations"
  | "dfd-meta"
  // SEO
  | "title-meta-rewriter"
  | "internal-link-suggester"
  | "cta-recommender"
  | "cannibalization-checker"
  | "schema-generator"
  // Social
  | "newsletter-generator"
  | "caption-writer"
  | "content-calendar"
  | "hook-writer"
  // Monetization
  | "affiliate-placement"
  | "lead-magnet"
  | "high-intent-pages"
  | "listing-upsell"
  // Operations
  | "task-list"
  | "content-audit"
  | "site-health"
  | "weekly-report";

const DFD_BRAND_VOICE = `You are a content writer for Dog Friendly Destos, a directory of dog-friendly restaurants, bars, patios, and venues. Write in an upbeat, vibrant tone used by today's pet owners. Content should feel friendly, enthusiastic, and practical — written by a dog lover for dog lovers.`;

export interface PromptResult {
  system: string;
  user: string;
}

export function buildPrompt(
  tool: ToolId,
  inputs: Record<string, any>,
  siteId: SiteId
): PromptResult {
  const siteContext = getSiteContextString(siteId);
  const baseSystem = `${siteContext}

When generating outputs:
- Output clean Markdown (headings, lists, tables) appropriate for direct copy/paste.
- Be specific and concrete; avoid generic filler.
- When facts could be wrong (statistics, claims, names, dates, prices), flag them with [FACT CHECK] inline.`;

  switch (tool) {
    case "topic-finder":
      return {
        system: baseSystem,
        user: `Given the seed keyword: "${inputs.seed || ""}"

Generate exactly 10 topic ideas suitable for blog articles. For each idea, provide:
- A working title
- A one-sentence angle / what's unique about it
- An intent label: [Informational], [Navigational], [Commercial], or [Transactional]

Format as a numbered Markdown list. Make titles compelling and click-worthy without being clickbait.`,
      };

    case "outline-builder":
      return {
        system: baseSystem,
        user: `Build a full SEO-optimized outline for an article on this topic:

Topic: ${inputs.topic || ""}
Target keyword (optional): ${inputs.keyword || "(none provided)"}
Target word count (optional): ${inputs.wordCount || "1500-2000"}

Produce a Markdown outline with:
- The proposed H1 (page title)
- A suggested **Meta title** (≤60 chars) and **Meta description** (≤155 chars)
- Full hierarchical outline with H2 and H3 sections
- Suggested word count next to each section in parentheses, e.g. (200 words)
- Brief notes under each section describing what to cover
- A short list of related keywords/entities to include
- Suggested internal-link anchor concepts and an FAQ section if relevant`,
      };

    case "article-drafter":
      return {
        system: baseSystem,
        user: `Draft a complete article based on the inputs below.

Topic: ${inputs.topic || ""}
${inputs.outline ? `Outline / Brief:\n${inputs.outline}` : ""}
Target word count: ${inputs.wordCount || "1500"}

Write the full article in Markdown. Use:
- An H1 title
- An engaging intro hook
- H2/H3 subheadings
- Short scannable paragraphs, lists, tables where useful
- A short conclusion / next-step CTA

CRITICAL: Wrap any factual claim, statistic, name, date, price, or specific reference with [FACT CHECK]. Example: "...the breed lived ~12 years [FACT CHECK]..." Do not invent specific numbers without flagging them.`,
      };

    case "content-repurposer": {
      const formats: string[] = inputs.formats || [];
      if (!formats.length) {
        return {
          system: baseSystem,
          user: `No formats selected. Please ask the user to choose at least one of: Facebook, Pinterest, Email, Twitter.`,
        };
      }
      return {
        system: baseSystem,
        user: `Repurpose the following article into the requested formats. Article:

"""
${inputs.article || ""}
"""

Generate content for these formats only: ${formats.join(", ")}.

For each format, follow these rules:
- **Facebook**: 1-2 paragraph post with a hook opener, value, and a CTA. Add 3-5 relevant hashtags at the end.
- **Pinterest**: 3 pin titles (max 100 chars each), and a 200-word pin description with keywords and 5 hashtags.
- **Email**: Compelling subject line + preheader + email body (~250 words) ending in a CTA back to the article.
- **Twitter**: A 5-tweet thread numbered 1/ through 5/, hooks first, value-packed, ending with a CTA.

Use Markdown headings to clearly separate each format.`,
      };
    }

    case "content-updater":
      return {
        system: baseSystem,
        user: `Refresh and update this existing article based on what has changed.

Current article:
"""
${inputs.article || ""}
"""

What's changed / new info:
"""
${inputs.changes || ""}
"""

Output the fully refreshed article in Markdown. Update stats, dates, examples and recommendations to reflect the new info. Add a brief "Updated [Month Year]" line near the top. Flag any new statistics or claims you introduce with [FACT CHECK].`,
      };

    // ---- DFD Article Workflow ----
    case "dfd-intent":
      return {
        system: DFD_BRAND_VOICE,
        user: `Give me reader intent for the keyword '${inputs.keyword || ""}'.
Include:
- Primary intent type (informational / commercial / transactional)
- What the reader actually wants to know (5-7 specific questions they have)
- Funnel stage (top / mid / bottom)
- Emotional undercurrent
- What content angle wins this keyword (e.g. balanced, persuasive, listicle, comparison)`,
      };

    case "dfd-keywords":
      return {
        system: DFD_BRAND_VOICE,
        user: `Main Keyword: ${inputs.keyword || ""}
LSI Keywords: ${inputs.lsi || ""}
Review this keyword list. Flag any that appear to be competitor page artifacts (product names, author names, branded terms unrelated to the topic) so they can be excluded from the brief.`,
      };

    case "dfd-brief":
      return {
        system: DFD_BRAND_VOICE,
        user: `Using the reader intent analysis and the LSI keyword list provided, build a full content brief for an article targeting '${inputs.keyword || ""}'.

Reader Intent Analysis:
${inputs.intentAnalysis || ""}

Approved Keyword List:
${inputs.approvedKeywords || ""}

Include:
- Target URL slug
- Search intent classification
- Recommended word count range
- H1 recommendation
- Full H2/H3 structure with section-level word counts
- What to cover in each section
- Which keywords belong in each section
- A keyword placement summary table (keyword | target count | primary section)
- Notes on any keywords to exclude and why`,
      };

    case "dfd-draft":
      return {
        system: DFD_BRAND_VOICE,
        user: `Using the content brief provided, write the full article.

Content Brief:
${inputs.contentBrief || ""}

Requirements:
- Reading level: ${inputs.readingLevel || "10th Grade Flesch-Kincaid"}
- Tone: Upbeat, vibrant tone used by today's pet owners
- Do not use placeholder copy anywhere
- Follow the H2 structure from the brief exactly
- Hit the keyword targets from the placement summary
- End with a CTA section pointing to ${inputs.ctaDestination || ""}
- Do not write a puff piece — acknowledge real risks or downsides where relevant`,
      };

    case "dfd-citations":
      return {
        system: DFD_BRAND_VOICE,
        user: `Review the article draft below. Identify every claim that needs a source — statistics, research findings, health guidance, legal references, institutional recommendations.

Article Draft:
${inputs.articleDraft || ""}

For each claim:
1. Search for a real, working URL from a credible source (government agencies, academic institutions, peer-reviewed research, established medical publishers)
2. Replace the unsourced claim with an inline citation linking to that URL
3. Correct any statistics that were approximated if the real number differs
4. At the end of the article, add a numbered Sources section with titles and full URLs

Rules:
- No broken links
- No paraphrasing that misrepresents the source
- No placeholder citations
- Correct the article if sourced data contradicts the original draft`,
      };

    case "dfd-meta":
      return {
        system: DFD_BRAND_VOICE,
        user: `Write a meta description for this article.

Article:
${inputs.citedArticle || ""}

Requirements:
- Include the primary keyword naturally
- Under 160 characters
- Conveys the value of the article without being clickbait
- Matches the tone of the article
- Provide character count at the end`,
      };

    // ---- SEO ----
    case "title-meta-rewriter":
      return {
        system: baseSystem,
        user: `Rewrite the title and meta description below into 3 compelling variations each, optimized for click-through rate while staying accurate.

Current title: ${inputs.title || ""}
Current meta description: ${inputs.meta || ""}
Target keyword: ${inputs.keyword || ""}

Output:
## Title Variations
1. (≤60 chars) ...
2. ...
3. ...

## Meta Description Variations
1. (≤155 chars) ...
2. ...
3. ...

After each variation note WHY it's strong (1 short line).`,
      };

    case "internal-link-suggester":
      return {
        system: baseSystem,
        user: `Identify 5-10 strong internal linking opportunities for this article.

Article:
"""
${inputs.article || ""}
"""

Available pages to link to (one per line):
"""
${inputs.pages || ""}
"""

For each suggestion provide:
- The exact anchor text to use (a phrase that appears or could naturally appear in the article)
- The target URL/page from the list
- A 1-line reason this link helps the reader and SEO

Format as a Markdown table.`,
      };

    case "cta-recommender":
      return {
        system: baseSystem,
        user: `Recommend 5 CTA variations.

Topic / page context: ${inputs.topic || ""}
Goal: ${inputs.goal || "engagement"}

Output a numbered Markdown list. For each CTA include:
- The headline (short, punchy)
- The button label
- A 1-line note on why it works for this goal
- Suggested placement (e.g. "above the fold", "after section X", "exit intent")`,
      };

    case "cannibalization-checker":
      return {
        system: baseSystem,
        user: `Analyze the page list below for keyword cannibalization. Group pages that target overlapping intents/keywords.

Page list (URL — title — primary keyword if known, one per line):
"""
${inputs.pages || ""}
"""

For each cannibalization group:
- Heading with the overlapping intent/keyword
- The pages involved
- Recommendation: keep one (which?), merge, redirect, or differentiate (with how)
- Risk level: High / Medium / Low

If there are no obvious cannibalization issues, say so explicitly.`,
      };

    case "schema-generator":
      return {
        system: baseSystem,
        user: `Generate valid JSON-LD schema for the page below.

Page type: ${inputs.pageType || "Article"}
Topic / page details: ${inputs.topic || ""}

Output a Markdown code block (\`\`\`json) containing the full <script type="application/ld+json"> JSON-LD body. Use schema.org types appropriate for the page type. Use placeholder values where needed (e.g. "AUTHOR_NAME") and clearly call out which fields the user must replace before publishing.`,
      };

    // ---- Social ----
    case "newsletter-generator":
      return {
        system: baseSystem,
        user: `Write a complete newsletter email.

Topic: ${inputs.topic || ""}
Key points to cover:
"""
${inputs.points || ""}
"""

Output Markdown structured as:
## Subject Line Options
1. ...
2. ...
3. ...

## Preheader
...

## Email Body
(Engaging intro hook → main value → 2-4 short sections → clear CTA)

Aim for ~400-600 words in the body. Conversational, scannable, on-brand for the site.`,
      };

    case "caption-writer":
      return {
        system: baseSystem,
        user: `Write 3 social captions for this topic on the chosen platform.

Topic: ${inputs.topic || ""}
Platform: ${inputs.platform || "Instagram"}

For each caption:
- Hook-led opener
- Core value
- A clear CTA
- 5-10 platform-appropriate hashtags

Tailor length and style to the platform conventions (Instagram = mid-length, Twitter/X = short, LinkedIn = longer thoughtful, Facebook = casual, TikTok = punchy).

Output as Markdown numbered 1, 2, 3.`,
      };

    case "content-calendar":
      return {
        system: baseSystem,
        user: `Build a full social/content calendar.

Month: ${inputs.month || ""}
Theme: ${inputs.theme || ""}
Posts per week: ${inputs.postsPerWeek || "3"}

Output a Markdown table with columns: Date | Day | Post Type | Topic / Hook | Channel | CTA. Cover the full month, balancing content pillars (educational, promotional, community, entertainment). Tie everything back to the theme.`,
      };

    case "hook-writer":
      return {
        system: baseSystem,
        user: `Write 5 strong opening hooks for content on this topic.

Topic: ${inputs.topic || ""}

For each hook output:
1. The hook itself (1-2 sentences)
2. The psychological trigger label in parentheses, e.g. (Curiosity Gap), (Pattern Interrupt), (Pain Point), (Bold Claim), (Social Proof), (Storytelling Open), (Contrarian Take)
3. A 1-line note on when to use it.

Format as a Markdown numbered list.`,
      };

    // ---- Monetization ----
    case "affiliate-placement":
      return {
        system: baseSystem,
        user: `Identify 5 strong affiliate placement opportunities inside this article and recommend 3 affiliate programs that fit.

Article:
"""
${inputs.article || ""}
"""

Niche: ${inputs.niche || ""}

Output:
## Placement Opportunities (5)
For each: where in the article (e.g. "after section 2"), the angle (problem → product fit), and recommended product type / category.

## Recommended Affiliate Programs (3)
For each: program name, why it fits, typical commission [FACT CHECK], how to apply.`,
      };

    case "lead-magnet":
      return {
        system: baseSystem,
        user: `Generate 8 lead magnet ideas.

Audience: ${inputs.audience || ""}
Niche: ${inputs.niche || ""}

For each idea provide:
- Title
- Format (checklist, mini-guide, template, swipe file, video, etc.)
- Why this audience will want it
- The CTA / opt-in headline that would convert best

Output as a Markdown numbered list (1-8).`,
      };

    case "high-intent-pages":
      return {
        system: baseSystem,
        user: `Rank the following pages by commercial intent — which are most likely to convert visitors into buyers, leads, or affiliate clicks.

Pages (URL — title, one per line):
"""
${inputs.pages || ""}
"""

Output a Markdown table: Rank | Page | Intent Score (1-10) | Why | Best Monetization Angle.

Then add a short "Top 3 Priority Optimizations" section.`,
      };

    case "listing-upsell":
      return {
        system: baseSystem,
        user: `Write an upsell email to a Dog Friendly Destos business owner.

Business name: ${inputs.business || ""}
Current listing tier: ${inputs.tier || "Free"}
Target tier (optional): ${inputs.targetTier || "next tier up"}

The four DFD tiers are: Free, $29/mo, $49/mo, $99/mo (each adds more visibility, photos, featured placement, and analytics).

Output a Markdown email with:
## Subject Line Options (3)
## Email Body
- Personal opener referencing their business and audience
- Specific benefits of upgrading (tied to dog-owner traffic)
- Social proof / outcome example [FACT CHECK if specific]
- Clear CTA with link placeholder
- Friendly sign-off

Keep it warm, helpful, and on-brand for DFD.`,
      };

    // ---- Operations ----
    case "task-list":
      return {
        system: baseSystem,
        user: `Generate a prioritized task list.

Focus / area: ${inputs.focus || ""}
Time available: ${inputs.time || "4 hours"}

Output three Markdown sections:
## Must Do
## Should Do
## Nice to Do

Each task should be specific, time-boxed (estimated minutes), and tied to outcomes. Make sure totals roughly fit the time available.`,
      };

    case "content-audit":
      return {
        system: baseSystem,
        user: `Audit the following pages and decide what to do with each.

Pages (Title — Last updated date, one per line):
"""
${inputs.pages || ""}
"""

For each page assign exactly one action: KEEP, UPDATE, CONSOLIDATE (with which page), or DELETE. Then briefly justify (1 line).

Output as a Markdown table: Page | Last Updated | Action | Reason.

End with a short "Audit Summary" — counts per action and the top 3 priorities.`,
      };

    case "site-health":
      return {
        system: baseSystem,
        user: `Build a site health checklist for this site.

Site URL / context: ${inputs.url || ""}

Output a Markdown checklist organized into:
## Monthly Tasks
## Quarterly Tasks
## One-Time Tasks (audit/setup)

Cover SEO, analytics, technical (Core Web Vitals, indexing), content, monetization, and security/legal items relevant to this site type. Use - [ ] checkbox format.`,
      };

    case "weekly-report":
      return {
        system: baseSystem,
        user: `Generate a clean weekly report from these notes.

Wins this week:
"""
${inputs.wins || ""}
"""

Problems / blockers:
"""
${inputs.problems || ""}
"""

Content / output produced:
"""
${inputs.content || ""}
"""

Format the report in Markdown with:
## Summary (2-3 sentences)
## Wins
## Problems & Blockers
## Content Produced
## Next Week's Focus (inferred top 3 priorities)
## Key Metrics to Watch

Keep it scannable and honest.`,
      };

    default:
      return {
        system: baseSystem,
        user: `Unknown tool. Inputs: ${JSON.stringify(inputs)}`,
      };
  }
}
