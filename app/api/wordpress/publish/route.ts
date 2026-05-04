import { NextRequest, NextResponse } from "next/server";
import { SiteId, SITES } from "@/lib/sites";
import { basicAuthHeader, getWordPressCreds } from "@/lib/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "draft",
  "publish",
  "pending",
  "private",
  "future",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, content, status, site } = (body || {}) as {
      title?: string;
      content?: string;
      status?: string;
      site?: SiteId;
    };

    if (!site || !SITES[site]) {
      return NextResponse.json({ error: "Invalid site." }, { status: 400 });
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Missing title." }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Missing content." }, { status: 400 });
    }

    const finalStatus =
      status && ALLOWED_STATUSES.has(status) ? status : "draft";

    const creds = getWordPressCreds(site);
    const url = `${creds.url}/wp-json/wp/v2/posts`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(creds),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        status: finalStatus,
      }),
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

    const data = (await res.json()) as any;
    return NextResponse.json({
      id: data?.id,
      url: data?.link || "",
      editUrl: data?.id ? `${creds.url}/wp-admin/post.php?post=${data.id}&action=edit` : "",
      status: data?.status || finalStatus,
    });
  } catch (err: any) {
    console.error("/api/wordpress/publish error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error in /api/wordpress/publish" },
      { status: 500 }
    );
  }
}
