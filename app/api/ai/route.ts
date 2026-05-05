import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, ToolId } from "@/lib/prompts";
import { SiteId, SITES } from "@/lib/sites";
import { logClaudeCall } from "@/lib/claudeUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { tool, inputs, site } = body as {
      tool: ToolId;
      inputs: Record<string, any>;
      site: SiteId;
    };

    if (!tool || !inputs || !site) {
      return NextResponse.json(
        { error: "Missing required fields: tool, inputs, site" },
        { status: 400 }
      );
    }
    if (!SITES[site]) {
      return NextResponse.json({ error: "Invalid site." }, { status: 400 });
    }

    const { system, user } = buildPrompt(tool, inputs, site);

    const client = new Anthropic({ apiKey });

    const model = "claude-sonnet-4-6";
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    });

    void logClaudeCall({
      model,
      feature: `ai:${tool}`,
      usage: message.usage,
    });

    const text = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    return NextResponse.json({ output: text });
  } catch (err: any) {
    console.error("/api/ai error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error in /api/ai" },
      { status: 500 }
    );
  }
}
