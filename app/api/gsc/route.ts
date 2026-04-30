import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import { DATA_CONFIG } from "@/lib/dataConfig";
import { SiteId } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Google. Sign in first." },
        { status: 401 }
      );
    }

    const { site, mode } = (await req.json()) as {
      site: SiteId;
      mode?: "topPages" | "declining";
    };
    const cfg = DATA_CONFIG[site];
    if (!cfg) {
      return NextResponse.json({ error: "Invalid site" }, { status: 400 });
    }
    if (!cfg.gscSiteUrl) {
      return NextResponse.json(
        { error: "GSC site URL not configured for this site." },
        { status: 400 }
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const webmasters = google.webmasters({ version: "v3", auth });

    if (mode === "declining") {
      // Compare last 28d vs prior 28d
      const recent = await webmasters.searchanalytics.query({
        siteUrl: cfg.gscSiteUrl,
        requestBody: {
          startDate: daysAgo(28),
          endDate: daysAgo(1),
          dimensions: ["page"],
          rowLimit: 100,
        },
      });
      const prior = await webmasters.searchanalytics.query({
        siteUrl: cfg.gscSiteUrl,
        requestBody: {
          startDate: daysAgo(56),
          endDate: daysAgo(29),
          dimensions: ["page"],
          rowLimit: 100,
        },
      });
      const priorMap = new Map<string, number>();
      (prior.data.rows || []).forEach((r) =>
        priorMap.set(r.keys?.[0] || "", r.clicks || 0)
      );
      const decline = (recent.data.rows || [])
        .map((r) => {
          const url = r.keys?.[0] || "";
          const recentClicks = r.clicks || 0;
          const priorClicks = priorMap.get(url) || 0;
          const delta = recentClicks - priorClicks;
          const pct = priorClicks ? (delta / priorClicks) * 100 : 0;
          return {
            page: url,
            recentClicks,
            priorClicks,
            delta,
            pct,
          };
        })
        .filter((r) => r.priorClicks > 0 && r.pct < 0)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 25);

      return NextResponse.json({ rows: decline });
    }

    // default: top pages
    const res = await webmasters.searchanalytics.query({
      siteUrl: cfg.gscSiteUrl,
      requestBody: {
        startDate: daysAgo(28),
        endDate: daysAgo(1),
        dimensions: ["page"],
        rowLimit: 25,
      },
    });

    const rows = (res.data.rows || []).map((r) => ({
      page: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    return NextResponse.json({ rows });
  } catch (err: any) {
    console.error("/api/gsc error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch GSC data" },
      { status: 500 }
    );
  }
}
