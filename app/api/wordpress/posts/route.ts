import { NextRequest, NextResponse } from "next/server";
import { SiteId, SITES } from "@/lib/sites";
import { basicAuthHeader, getWordPressCreds } from "@/lib/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stripHtml(s: string): string {
  return (s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&hellip;/g, "...")
    .replace(/&nbsp;/g, " ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { site, status, perPage } = (body || {}) as {
      site: SiteId;
      status?: string;
      perPage?: number;
    };
    if (!site || !SITES[site]) {
      return NextResponse.json({ error: "Invalid site." }, { status: 400 });
    }

    const creds = getWordPressCreds(site);
    const params = new URLSearchParams({
      per_page: String(Math.min(Math.max(perPage || 100, 1), 100)),
      status: status || "publish,draft,pending,future,private",
      _fields: "id,title,slug,status,date,excerpt,link",
      orderby: "date",
      order: "desc",
    });

    const url = `${creds.url}/wp-json/wp/v2/posts?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: basicAuthHeader(creds),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          error: `WordPress API error (${res.status}): ${text.slice(0, 500)}`,
        },
        { status: res.status }
      );
    }

    const data = (await res.json()) as any[];
    const posts = (Array.isArray(data) ? data : []).map((p) => ({
      id: p.id,
      title: decodeEntities(stripHtml(p?.title?.rendered || "")),
      slug: p.slug || "",
      status: p.status || "",
      date: p.date || "",
      excerpt: decodeEntities(stripHtml(p?.excerpt?.rendered || "")),
      link: p.link || "",
    }));

    return NextResponse.json({ posts, site });
  } catch (err: any) {
    console.error("/api/wordpress/posts error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error in /api/wordpress/posts" },
      { status: 500 }
    );
  }
}
