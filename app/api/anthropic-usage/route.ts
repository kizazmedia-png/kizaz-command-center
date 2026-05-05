import { NextRequest, NextResponse } from "next/server";
import { getBigQueryClient } from "@/lib/bigquery";
import { CLAUDE_CALLS_TABLE, priceFor } from "@/lib/claudeUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    const datasetId = process.env.BIGQUERY_DATASET_ID;
    if (!projectId || !datasetId) {
      return NextResponse.json(
        { configured: false, error: "BigQuery project/dataset not configured." },
        { status: 200 }
      );
    }

    const { startDate, endDate } = (await req.json()) as {
      startDate?: string;
      endDate?: string;
    };
    const today = new Date().toISOString().slice(0, 10);
    const start = isValidDate(startDate) ? startDate! : today;
    const end = isValidDate(endDate) ? endDate! : today;

    const bq = getBigQueryClient();
    const dataset = bq.dataset(datasetId);
    const table = dataset.table(CLAUDE_CALLS_TABLE);
    const [tableExists] = await table.exists();
    if (!tableExists) {
      return NextResponse.json({
        configured: true,
        range: { startDate: start, endDate: end },
        totalUsd: 0,
        byModel: [],
        byFeature: [],
        byTokenType: [],
        daily: [],
        empty: true,
      });
    }

    const fqTable = `\`${projectId}.${datasetId}.${CLAUDE_CALLS_TABLE}\``;
    const params = {
      startTs: `${start} 00:00:00`,
      endTs: `${end} 23:59:59`,
    };
    const where = `WHERE timestamp BETWEEN TIMESTAMP(@startTs) AND TIMESTAMP(@endTs)`;

    const [modelRows] = await bq.query({
      query: `SELECT
                model,
                SUM(usd_cost) AS usd,
                SUM(input_tokens) AS input_tokens,
                SUM(output_tokens) AS output_tokens,
                SUM(cache_read_tokens) AS cache_read_tokens,
                SUM(cache_creation_tokens) AS cache_creation_tokens
              FROM ${fqTable} ${where}
              GROUP BY model
              ORDER BY usd DESC`,
      params,
    });
    const [featureRows] = await bq.query({
      query: `SELECT COALESCE(feature, 'unknown') AS feature, SUM(usd_cost) AS usd
              FROM ${fqTable} ${where}
              GROUP BY feature
              ORDER BY usd DESC`,
      params,
    });
    const [dailyRows] = await bq.query({
      query: `SELECT FORMAT_TIMESTAMP('%Y-%m-%d', timestamp) AS date,
                     SUM(usd_cost) AS usd
              FROM ${fqTable} ${where}
              GROUP BY date
              ORDER BY date ASC`,
      params,
    });

    const tokenTypeUsd = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
    const tokenTotals = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
    let totalUsd = 0;
    for (const r of modelRows as any[]) {
      const p = priceFor(r.model);
      const inTok = Number(r.input_tokens ?? 0);
      const outTok = Number(r.output_tokens ?? 0);
      const crTok = Number(r.cache_read_tokens ?? 0);
      const ccTok = Number(r.cache_creation_tokens ?? 0);
      tokenTotals.input += inTok;
      tokenTotals.output += outTok;
      tokenTotals.cache_read += crTok;
      tokenTotals.cache_creation += ccTok;
      tokenTypeUsd.input += (inTok * p.input) / 1_000_000;
      tokenTypeUsd.output += (outTok * p.output) / 1_000_000;
      tokenTypeUsd.cache_read += (crTok * p.cache_read) / 1_000_000;
      tokenTypeUsd.cache_creation += (ccTok * p.cache_creation) / 1_000_000;
      totalUsd += Number(r.usd ?? 0);
    }
    const byTokenType = (
      ["input", "output", "cache_read", "cache_creation"] as const
    )
      .map((k) => ({ tokenType: k, usd: tokenTypeUsd[k] }))
      .filter((r) => r.usd > 0);

    return NextResponse.json({
      configured: true,
      range: { startDate: start, endDate: end },
      totalUsd,
      byModel: (modelRows as any[]).map((r) => ({
        model: r.model,
        usd: Number(r.usd ?? 0),
      })),
      byFeature: featureRows.map((r: any) => ({
        feature: r.feature,
        usd: Number(r.usd ?? 0),
      })),
      byTokenType,
      daily: dailyRows.map((r: any) => ({
        date: typeof r.date === "string" ? r.date : r.date?.value,
        usd: Number(r.usd ?? 0),
      })),
      tokens: tokenTotals,
    });
  } catch (err: any) {
    console.error("/api/anthropic-usage error:", err);
    const msg = String(err?.message || "");
    if (/default credentials|GOOGLE_APPLICATION_CREDENTIALS/i.test(msg)) {
      return NextResponse.json({
        configured: false,
        error:
          "BigQuery is not authenticated locally. Set GOOGLE_APPLICATION_CREDENTIALS_JSON in .env.local (paste the service account JSON) or run `gcloud auth application-default login`.",
      });
    }
    return NextResponse.json(
      { error: err?.message || "Anthropic usage query failed" },
      { status: 500 }
    );
  }
}
