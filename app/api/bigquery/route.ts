import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { SiteId } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID || "";
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || "";
const SNAPSHOT_TABLE = "snapshots";

function getClient(): BigQuery {
  // Uses Application Default Credentials (GCE/Cloud Run/local gcloud)
  // or GOOGLE_APPLICATION_CREDENTIALS env if set.
  return new BigQuery({ projectId: PROJECT_ID });
}

async function ensureTable(bq: BigQuery) {
  const dataset = bq.dataset(DATASET_ID);
  const [dsExists] = await dataset.exists();
  if (!dsExists) await dataset.create();
  const table = dataset.table(SNAPSHOT_TABLE);
  const [tExists] = await table.exists();
  if (!tExists) {
    await table.create({
      schema: [
        { name: "captured_at", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "site", type: "STRING", mode: "REQUIRED" },
        { name: "source", type: "STRING", mode: "REQUIRED" },
        { name: "label", type: "STRING" },
        { name: "payload", type: "JSON", mode: "REQUIRED" },
      ],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!PROJECT_ID || !DATASET_ID) {
      return NextResponse.json(
        { error: "BigQuery project/dataset not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { action } = body as { action: "store" | "list" };

    const bq = getClient();
    await ensureTable(bq);

    if (action === "store") {
      const { site, source, label, payload } = body as {
        site: SiteId;
        source: string;
        label?: string;
        payload: any;
      };
      if (!site || !source || !payload) {
        return NextResponse.json(
          { error: "Missing site, source, or payload" },
          { status: 400 }
        );
      }
      await bq
        .dataset(DATASET_ID)
        .table(SNAPSHOT_TABLE)
        .insert([
          {
            captured_at: new Date().toISOString(),
            site,
            source,
            label: label || null,
            payload: JSON.stringify(payload),
          },
        ]);
      return NextResponse.json({ ok: true });
    }

    if (action === "list") {
      const { site, source, limit } = body as {
        site?: SiteId;
        source?: string;
        limit?: number;
      };
      const where: string[] = [];
      const params: Record<string, any> = {};
      if (site) {
        where.push("site = @site");
        params.site = site;
      }
      if (source) {
        where.push("source = @source");
        params.source = source;
      }
      const sql = `SELECT captured_at, site, source, label, payload
                   FROM \`${PROJECT_ID}.${DATASET_ID}.${SNAPSHOT_TABLE}\`
                   ${where.length ? "WHERE " + where.join(" AND ") : ""}
                   ORDER BY captured_at DESC
                   LIMIT ${Math.min(Number(limit) || 25, 200)}`;
      const [rows] = await bq.query({ query: sql, params });
      return NextResponse.json({ rows });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("/api/bigquery error:", err);
    return NextResponse.json(
      { error: err?.message || "BigQuery request failed" },
      { status: 500 }
    );
  }
}
