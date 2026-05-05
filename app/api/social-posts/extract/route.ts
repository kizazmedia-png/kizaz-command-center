import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createPost } from "@/lib/socialPosts";
import { logClaudeCall } from "@/lib/claudeUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You extract a single interesting fact from a photographed page of a book, calendar, or article, and turn it into ready-to-post social media copy.

Return ONLY a JSON object (no prose, no code fences) with this exact shape:
{
  "fact": "one short sentence stating the fact, plain text",
  "caption": "punchy 1-2 line caption suitable for an image overlay (max ~120 chars)",
  "description": "2-4 sentence post body, conversational, no hashtags inline",
  "hashtags": ["#tag1", "#tag2", ...]
}

Rules:
- 6-10 hashtags, lowercase, no spaces, mix broad + niche.
- Caption should be human, not corporate. No emoji unless the fact is playful.
- Description should hook in line 1 and add context in lines 2-4.
- If the page contains multiple facts, pick the single most surprising or shareable one.
- If you cannot read any fact from the image, set "fact" to an empty string and leave the others empty.`;

function stripFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("page");
    const niche = (form.get("niche") as string) || "";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing 'page' image in form data." },
        { status: 400 }
      );
    }

    const mediaType = (file.type || "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image is larger than 5MB. Please use a smaller photo." },
        { status: 413 }
      );
    }
    const base64 = buffer.toString("base64");

    const userText = niche
      ? `Audience / niche: ${niche}\n\nExtract the fact and write the post.`
      : `Extract the fact and write the post.`;

    const client = new Anthropic({ apiKey });
    const model = "claude-sonnet-4-6";
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    void logClaudeCall({
      model,
      feature: "social-extract",
      usage: message.usage,
    });

    const text = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    let parsed: {
      fact: string;
      caption: string;
      description: string;
      hashtags: string[];
    };
    try {
      parsed = JSON.parse(stripFence(text));
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON.", raw: text },
        { status: 502 }
      );
    }

    if (!parsed.fact) {
      return NextResponse.json(
        { error: "No fact could be read from the image. Try a clearer photo." },
        { status: 422 }
      );
    }

    const post = await createPost({
      fact: parsed.fact,
      caption: parsed.caption || "",
      description: parsed.description || "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    });

    return NextResponse.json({ post });
  } catch (err: any) {
    console.error("/api/social-posts/extract error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
