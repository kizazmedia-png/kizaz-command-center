import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { updatePost } from "@/lib/socialPosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFor(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    const id = form.get("id") as string | null;

    if (!id) {
      return NextResponse.json({ error: "Missing post id." }, { status: 400 });
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing 'image' in form data." },
        { status: 400 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type}` },
        { status: 415 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is larger than 10MB." },
        { status: 413 }
      );
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${id}-${Date.now()}.${extFor(file.type)}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    const imageUrl = `/uploads/${filename}`;

    const post = await updatePost(id, { imageUrl });
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (err: any) {
    console.error("/api/social-posts/image error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
