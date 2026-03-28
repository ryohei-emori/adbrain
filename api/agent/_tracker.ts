import { kv } from "@vercel/kv";

const TTL_SECONDS = 90 * 24 * 60 * 60;

export type LLMUsageRecord = {
  date: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  invocationCount: number;
};

type DailyAggregate = {
  date: string;
  models: Record<
    string,
    {
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCostUsd: number;
      invocationCount: number;
    }
  >;
};

/**
 * grok-3-mini: $0.10 / 1M input, $0.30 / 1M output (design doc).
 * gemini-2.5-flash: approximate blended rates when primary fails over.
 */
export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const m = model.toLowerCase();
  if (m.includes("grok")) {
    return (inputTokens * 0.1 + outputTokens * 0.3) / 1_000_000;
  }
  if (m.includes("gemini")) {
    return (inputTokens * 0.075 + outputTokens * 0.3) / 1_000_000;
  }
  return 0;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Merges usage into KV key llm_usage:{date} with 90-day TTL.
 */
export async function trackLLMUsage(record: LLMUsageRecord): Promise<void> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn(
      "[AdBrain] KV not configured; skipping LLM usage tracking."
    );
    return;
  }

  const date = record.date || todayUtc();
  const key = `llm_usage:${date}`;

  try {
    const raw = await kv.get<string>(key);
    const parsed: DailyAggregate = raw
      ? (JSON.parse(raw) as DailyAggregate)
      : { date, models: {} };

    parsed.date = date;
    const prev = parsed.models[record.model] ?? {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      invocationCount: 0,
    };

    parsed.models[record.model] = {
      totalInputTokens: prev.totalInputTokens + record.totalInputTokens,
      totalOutputTokens: prev.totalOutputTokens + record.totalOutputTokens,
      totalCostUsd: prev.totalCostUsd + record.totalCostUsd,
      invocationCount: prev.invocationCount + record.invocationCount,
    };

    await kv.set(key, JSON.stringify(parsed), { ex: TTL_SECONDS });
  } catch (err) {
    console.error("[AdBrain] trackLLMUsage failed:", err);
  }
}
