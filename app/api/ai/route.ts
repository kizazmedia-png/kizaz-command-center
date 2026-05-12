import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, ToolId } from "@/lib/prompts";
import { SiteId, SITES } from "@/lib/sites";
import { logClaudeCall } from "@/lib/claudeUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODELS = new Set([
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
]);

const OVERLOAD_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

class OverloadedError extends Error {
  constructor() {
    super("Anthropic API is temporarily overloaded. Please try again in a moment.");
    this.name = "OverloadedError";
  }
}

async function createMessageWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming
) {
  for (let attempt = 0; attempt <= OVERLOAD_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status !== 529) throw err;
      if (attempt === OVERLOAD_RETRY_DELAYS_MS.length) throw new OverloadedError();
      await new Promise((resolve) =>
        setTimeout(resolve, OVERLOAD_RETRY_DELAYS_MS[attempt])
      );
    }
  }
  throw new OverloadedError();
}

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
    const client = new Anthropic({ apiKey });

    // Raw prompt mode: caller supplies system, user, model, and a feature label.
    if (body && typeof body.system === "string" && typeof body.user === "string") {
      const systemPrompt: string = body.system;
      const userPrompt: string = body.user;
      const requestedModel: string = body.model || "claude-haiku-4-5";
      const model = ALLOWED_MODELS.has(requestedModel)
        ? requestedModel
        : "claude-haiku-4-5";
      const feature: string = body.feature || "ai:raw";
      const maxTokens: number =
        typeof body.maxTokens === "number" && body.maxTokens > 0
          ? Math.min(body.maxTokens, 4096)
          : 1500;

      const message = await createMessageWithRetry(client, {
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      void logClaudeCall({ model, feature, usage: message.usage });

      const text = message.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      return NextResponse.json({ output: text });
    }

    // Tool mode (existing behavior).
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

    const model = "claude-sonnet-4-6";
    const message = await createMessageWithRetry(client, {
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
    if (err instanceof OverloadedError) {
      return NextResponse.json({ error: err.message }, { status: 529 });
    }
    return NextResponse.json(
      { error: err?.message || "Unknown error in /api/ai" },
      { status: 500 }
    );
  }
}
