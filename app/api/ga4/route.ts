import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DATA_CONFIG } from "@/lib/dataConfig";
import { SiteId } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Google. Sign in first." },
        { status: 401 }
      );
    }

    const { site } = (await req.json()) as { site: SiteId };
    const cfg = DATA_CONFIG[site];
    if (!cfg) {
      return NextResponse.json({ error: "Invalid site" }, { status: 400 });
    }
    if (!cfg.ga4PropertyId) {
      return NextResponse.json(
        { error: "GA4 property ID not configured for this site." },
        { status: 400 }
      );
    }

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${cfg.ga4PropertyId}:runReport`;
    const requestBody = {
      dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "bounceRate" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 25,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `GA4 API error: ${res.status} ${text}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const rows = (data.rows || []).map((r: any) => ({
      pagePath: r.dimensionValues?.[0]?.value || "",
      pageTitle: r.dimensionValues?.[1]?.value || "",
      views: Number(r.metricValues?.[0]?.value || 0),
      sessions: Number(r.metricValues?.[1]?.value || 0),
      bounceRate: Number(r.metricValues?.[2]?.value || 0),
    }));

    return NextResponse.json({ rows });
  } catch (err: any) {
    console.error("/api/ga4 error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch GA4 data" },
      { status: 500 }
    );
  }
}
