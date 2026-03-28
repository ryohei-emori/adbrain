import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

import { invokeAdBrainAgent } from "./_graph";
import { computeCostUsd, trackLLMUsage } from "./_tracker";

const BodySchema = z.object({
  userId: z.string().min(1).optional(),
  platforms: z.array(z.string()),
  campaignIds: z.array(z.string()).optional(),
});

function resolveBaseUrl(req: VercelRequest): string {
  const xf = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(xf) ? xf[0] : xf) || "https";
  const host = req.headers.host;
  if (host) {
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
}

async function validateAuth(
  req: VercelRequest
): Promise<
  | { ok: true; authUserId?: string; forwardHeaders: Record<string, string> }
  | { ok: false; error: string }
> {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const domain = process.env.AUTH0_DOMAIN;
    if (domain) {
      try {
        const r = await fetch(`https://${domain}/userinfo`, {
          headers: {
            Authorization: auth,
            Accept: "application/json",
          },
        });
        if (!r.ok) {
          return {
            ok: false,
            error: "Invalid or expired access token",
          };
        }
        const u = (await r.json()) as { sub?: string };
        return {
          ok: true,
          authUserId: typeof u.sub === "string" ? u.sub : undefined,
          forwardHeaders: { Authorization: auth },
        };
      } catch {
        return { ok: false, error: "Auth verification failed" };
      }
    }
    return {
      ok: true,
      forwardHeaders: { Authorization: auth },
    };
  }

  const cookie = req.headers.cookie;
  if (typeof cookie === "string" && cookie.length > 0) {
    return {
      ok: true,
      forwardHeaders: { Cookie: cookie },
    };
  }

  return {
    ok: false,
    error: "Unauthorized: provide Authorization: Bearer <token> or session Cookie",
  };
}

async function persistUsage(
  usage: Awaited<ReturnType<typeof invokeAdBrainAgent>>["usage"]
): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  for (const [model, u] of Object.entries(usage.byModel)) {
    const cost = computeCostUsd(model, u.input, u.output);
    await trackLLMUsage({
      date,
      model,
      totalInputTokens: u.input,
      totalOutputTokens: u.output,
      totalCostUsd: cost,
      invocationCount: u.invocations,
    });
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const auth = await validateAuth(req);
    if (!auth.ok) {
      res.status(401).json({ error: auth.error });
      return;
    }

    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { platforms, campaignIds } = parsed.data;
    const userId = parsed.data.userId || auth.authUserId || "anonymous";

    const baseUrl = resolveBaseUrl(req);
    const { proposals, usage } = await invokeAdBrainAgent({
      userId,
      platforms,
      campaignIds,
      baseUrl,
      forwardHeaders: auth.forwardHeaders,
    });

    await persistUsage(usage);

    res.status(200).json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AdBrain] /api/agent/invoke error:", err);
    res.status(500).json({
      error: "Agent invocation failed",
      message,
    });
  }
}
