import { z } from "zod";

export const FetchGoogleAdsParamsSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  campaignIds: z.array(z.string()).optional(),
});

export const FetchMetaAdsParamsSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  campaignIds: z.array(z.string()).optional(),
});

export type FetchGoogleAdsParams = z.infer<typeof FetchGoogleAdsParamsSchema>;
export type FetchMetaAdsParams = z.infer<typeof FetchMetaAdsParamsSchema>;

export type CampaignMetrics = {
  platform: "google_ads" | "meta_ads";
  campaignId: string;
  campaignName?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  conversions: number;
  roas: number;
};

export type InternalFetchContext = {
  baseUrl: string;
  headers: Record<string, string>;
};

function buildUrl(
  baseUrl: string,
  path: string,
  campaignIds?: string[]
): string {
  const u = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (campaignIds?.length) {
    u.searchParams.set("campaignIds", campaignIds.join(","));
  }
  return u.toString();
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function normalizeOne(
  raw: Record<string, unknown>,
  platform: "google_ads" | "meta_ads"
): CampaignMetrics {
  const campaignId = String(
    raw.campaignId ?? raw.id ?? raw.campaign_id ?? ""
  ).trim();
  const impressions = toNumber(raw.impressions);
  const clicks = toNumber(raw.clicks);
  const spend = toNumber(raw.spend ?? raw.cost ?? raw.amount_spent);
  const conversions = toNumber(raw.conversions);
  const ctrRaw = raw.ctr;
  const cpcRaw = raw.cpc;
  const roasRaw = raw.roas;

  let ctr = toNumber(ctrRaw);
  if (!ctr && impressions > 0) {
    ctr = clicks / impressions;
  }

  let cpc = toNumber(cpcRaw);
  if (!cpc && clicks > 0) {
    cpc = spend / clicks;
  }

  let roas = toNumber(roasRaw);
  if (!roas && spend > 0) {
    const convValue = toNumber(raw.conversion_value ?? raw.revenue);
    if (convValue > 0) {
      roas = convValue / spend;
    }
  }

  return {
    platform,
    campaignId,
    campaignName:
      raw.campaignName != null
        ? String(raw.campaignName)
        : raw.name != null
          ? String(raw.name)
          : undefined,
    impressions,
    clicks,
    ctr,
    cpc,
    spend,
    conversions,
    roas,
  };
}

function extractCampaignArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.campaigns)) return o.campaigns;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.results)) return o.results;
  }
  return [];
}

/**
 * Fetches Google Ads campaigns via the Go proxy (internal HTTP).
 */
export async function fetch_google_ads(
  params: FetchGoogleAdsParams,
  ctx: InternalFetchContext
): Promise<CampaignMetrics[]> {
  const { userId, campaignIds } = FetchGoogleAdsParamsSchema.parse(params);
  const url = buildUrl(ctx.baseUrl, "/api/proxy/google-ads/campaigns", campaignIds);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...ctx.headers,
      "X-User-Id": userId,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `fetch_google_ads failed: ${res.status} ${res.statusText} ${text.slice(0, 500)}`
    );
  }

  const json: unknown = await res.json();
  return extractCampaignArray(json)
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    .map((row) => normalizeOne(row, "google_ads"))
    .filter((c) => c.campaignId.length > 0);
}

/**
 * Fetches Meta Ads campaigns via the Go proxy (internal HTTP).
 */
export async function fetch_meta_ads(
  params: FetchMetaAdsParams,
  ctx: InternalFetchContext
): Promise<CampaignMetrics[]> {
  const { userId, campaignIds } = FetchMetaAdsParamsSchema.parse(params);
  const url = buildUrl(ctx.baseUrl, "/api/proxy/meta-ads/campaigns", campaignIds);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...ctx.headers,
      "X-User-Id": userId,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `fetch_meta_ads failed: ${res.status} ${res.statusText} ${text.slice(0, 500)}`
    );
  }

  const json: unknown = await res.json();
  return extractCampaignArray(json)
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    .map((row) => normalizeOne(row, "meta_ads"))
    .filter((c) => c.campaignId.length > 0);
}
