import { NextRequest, NextResponse } from "next/server";
import { listPosts, updatePost, deletePost } from "@/lib/socialPosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body || {};
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }
    if (patch.hashtags && !Array.isArray(patch.hashtags)) {
      return NextResponse.json(
        { error: "hashtags must be an array of strings." },
        { status: 400 }
      );
    }
    const post = await updatePost(id, patch);
    if (!post) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const ok = await deletePost(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
