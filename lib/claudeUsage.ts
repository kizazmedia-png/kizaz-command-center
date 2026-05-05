import type { BigQuery } from "@google-cloud/bigquery";
import { getBigQueryClient } from "./bigquery";

const TABLE_ID = "claude_calls";

interface PricePerMillion {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
}

// USD per 1M tokens. List prices as of 2026-01; update when Anthropic changes them.
// Unknown models fall back to claude-sonnet-4-6 pricing.
const PRICING: Record<string, PricePerMillion> = {
  "claude-opus-4-7": { input: 15, output: 75, cache_read: 1.5, cache_creation: 18.75 },
  "claude-sonnet-4-6": { input: 3, output: 15, cache_read: 0.3, cache_creation: 3.75 },
  "claude-haiku-4-5": { input: 1, output: 5, cache_read: 0.1, cache_creation: 1.25 },
};

export const PRICING_FALLBACK_MODEL = "claude-sonnet-4-6";

interface UsageInput {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function priceFor(model: string): PricePerMillion {
  return PRICING[model] ?? PRICING[PRICING_FALLBACK_MODEL];
}

export function computeUsd(model: string, usage: UsageInput): number {
  const p = priceFor(model);
  const input = (usage.input_tokens ?? 0) * p.input;
  const output = (usage.output_tokens ?? 0) * p.output;
  const cacheRead = (usage.cache_read_input_tokens ?? 0) * p.cache_read;
  const cacheCreate = (usage.cache_creation_input_tokens ?? 0) * p.cache_creation;
  return (input + output + cacheRead + cacheCreate) / 1_000_000;
}

let tableEnsured = false;
async function ensureTable(bq: BigQuery, datasetId: string) {
  if (tableEnsured) return;
  const dataset = bq.dataset(datasetId);
  const [dsExists] = await dataset.exists();
  if (!dsExists) await dataset.create();
  const table = dataset.table(TABLE_ID);
  const [tExists] = await table.exists();
  if (!tExists) {
    await table.create({
      schema: [
        { name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "model", type: "STRING", mode: "REQUIRED" },
        { name: "feature", type: "STRING" },
        { name: "input_tokens", type: "INT64" },
        { name: "output_tokens", type: "INT64" },
        { name: "cache_read_tokens", type: "INT64" },
        { name: "cache_creation_tokens", type: "INT64" },
        { name: "usd_cost", type: "FLOAT64" },
      ],
    });
  }
  tableEnsured = true;
}

interface LogInput {
  model: string;
  feature: string;
  usage: UsageInput;
}

export async function logClaudeCall({ model, feature, usage }: LogInput): Promise<void> {
  try {
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    const datasetId = process.env.BIGQUERY_DATASET_ID;
    if (!projectId || !datasetId) return;
    const bq = getBigQueryClient();
    await ensureTable(bq, datasetId);
    const usd = computeUsd(model, usage);
    await bq
      .dataset(datasetId)
      .table(TABLE_ID)
      .insert([
        {
          timestamp: new Date().toISOString(),
          model,
          feature,
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_tokens: usage.cache_read_input_tokens ?? 0,
          cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
          usd_cost: usd,
        },
      ]);
  } catch (err) {
    console.error("logClaudeCall failed:", err);
  }
}

export const CLAUDE_CALLS_TABLE = TABLE_ID;
