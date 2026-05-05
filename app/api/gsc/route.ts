import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import { DATA_CONFIG } from "@/lib/dataConfig";
import { SiteId } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function priorPeriod(start: string, end: string): { startDate: string; endDate: string } {
  const startMs = Date.parse(start + "T00:00:00Z");
  const endMs = Date.parse(end + "T00:00:00Z");
  const lengthDays = Math.round((endMs - startMs) / 86_400_000) + 1;
  const priorEnd = new Date(startMs);
  priorEnd.setUTCDate(priorEnd.getUTCDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setUTCDate(priorStart.getUTCDate() - (lengthDays - 1));
  return {
    startDate: priorStart.toISOString().slice(0, 10),
    endDate: priorEnd.toISOString().slice(0, 10),
  };
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

    const { site, mode, startDate, endDate } = (await req.json()) as {
      site: SiteId;
      mode?: "topPages" | "declining";
      startDate?: string;
      endDate?: string;
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

    const today = new Date().toISOString().slice(0, 10);
    const rangeStart = isValidDate(startDate) ? startDate! : today;
    const rangeEnd = isValidDate(endDate) ? endDate! : today;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const webmasters = google.webmasters({ version: "v3", auth });

    if (mode === "declining") {
      const prior = priorPeriod(rangeStart, rangeEnd);
      const recentRes = await webmasters.searchanalytics.query({
        siteUrl: cfg.gscSiteUrl,
        requestBody: {
          startDate: rangeStart,
          endDate: rangeEnd,
          dimensions: ["page"],
          rowLimit: 100,
        },
      });
      const priorRes = await webmasters.searchanalytics.query({
        siteUrl: cfg.gscSiteUrl,
        requestBody: {
          startDate: prior.startDate,
          endDate: prior.endDate,
          dimensions: ["page"],
          rowLimit: 100,
        },
      });
      const priorMap = new Map<string, number>();
      (priorRes.data.rows || []).forEach((r) =>
        priorMap.set(r.keys?.[0] || "", r.clicks || 0)
      );
      const decline = (recentRes.data.rows || [])
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
        startDate: rangeStart,
        endDate: rangeEnd,
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
