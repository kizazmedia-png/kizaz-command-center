import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { getBigQueryClient } from "@/lib/bigquery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID || "";
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || "";
const TABLE_ID = "kizaz_impressions";

const ALLOWED_HOSTS = new Set([
  "kizaz.com",
  "www.kizaz.com",
  "dogfriendlydestos.com",
  "www.dogfriendlydestos.com",
]);

const BOT_PATTERN = /bot|crawler|spider|googlebot|bingbot/i;

function corsHeaders(origin: string | null): Record<string, string> {
  let allowed = "";
  if (origin) {
    try {
      if (ALLOWED_HOSTS.has(new URL(origin).host)) allowed = origin;
    } catch {
      /* invalid origin string — leave empty */
    }
  }
  return {
    "Access-Control-Allow-Origin": allowed,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  try {
    return ALLOWED_HOSTS.has(new URL(origin).host);
  } catch {
    return false;
  }
}

async function ensureTable(bq: BigQuery) {
  const dataset = bq.dataset(DATASET_ID);
  const [dsExists] = await dataset.exists();
  if (!dsExists) await dataset.create();
  const table = dataset.table(TABLE_ID);
  const [tExists] = await table.exists();
  if (!tExists) {
    await table.create({
      schema: [
        { name: "tracked_at", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "url", type: "STRING", mode: "REQUIRED" },
        { name: "host", type: "STRING" },
        { name: "impressions", type: "INT64", mode: "REQUIRED" },
        { name: "referer", type: "STRING" },
        { name: "user_agent", type: "STRING" },
        { name: "ip", type: "STRING" },
      ],
      timePartitioning: { type: "DAY", field: "tracked_at" },
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed." },
      { status: 403, headers: cors }
    );
  }

  try {
    if (!PROJECT_ID || !DATASET_ID) {
      return NextResponse.json(
        { error: "BigQuery project/dataset not configured." },
        { status: 500, headers: cors }
      );
    }

    const userAgent = req.headers.get("user-agent") || null;
    if (userAgent && BOT_PATTERN.test(userAgent)) {
      return NextResponse.json(
        { ok: true, filtered: "bot" },
        { headers: cors }
      );
    }

    const raw = await req.text();
    let body: { url?: string; impressions?: number };
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400, headers: cors }
      );
    }

    const url = typeof body.url === "string" ? body.url.slice(0, 2048) : "";
    if (!url) {
      return NextResponse.json(
        { error: "Missing url." },
        { status: 400, headers: cors }
      );
    }
    const impressions =
      typeof body.impressions === "number" && Number.isFinite(body.impressions)
        ? Math.max(1, Math.floor(body.impressions))
        : 1;

    const referer = req.headers.get("referer") || null;
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || null;
    let host: string | null = null;
    if (referer) {
      try {
        host = new URL(referer).host;
      } catch {
        /* ignore */
      }
    }

    const bq = getBigQueryClient();
    await ensureTable(bq);
    await bq
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert([
        {
          tracked_at: new Date().toISOString(),
          url,
          host,
          impressions,
          referer,
          user_agent: userAgent,
          ip,
        },
      ]);

    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (err: any) {
    console.error("/api/track error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: cors }
    );
  }
}
