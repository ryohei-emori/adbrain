import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";

import { createAdBrainLlm } from "./_llm";
import {
  ANALYSIS_PROMPT,
  fillTemplate,
  OPTIMIZATION_PROMPT,
  SYSTEM_PROMPT,
} from "./_prompts";
import {
  type CampaignMetrics,
  fetch_google_ads,
  fetch_meta_ads,
  type InternalFetchContext,
} from "./_tools";

export type OptimizationProposal = {
  action: string;
  platform: string;
  campaignId: string;
  reasoning: string;
  currentValue: number;
  proposedValue: number;
  expectedImpact: string;
};

const ProposalZ = z.object({
  action: z.enum(["adjust_budget", "adjust_bid", "pause", "enable"]),
  platform: z.enum(["google_ads", "meta_ads"]),
  campaignId: z.string(),
  reasoning: z.string(),
  currentValue: z.number(),
  proposedValue: z.number(),
  expectedImpact: z.string(),
});

const OptimizeOutputZ = z.object({
  proposals: z.array(ProposalZ),
});

export type AdBrainAgentState = typeof AgentStateAnnotation.State;

const AgentStateAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  platforms: Annotation<string[]>(),
  campaignData: Annotation<CampaignMetrics[] | null>(),
  analysis: Annotation<string | null>(),
  proposals: Annotation<OptimizationProposal[]>(),
  messages: Annotation<BaseMessage[]>({
    reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
      const next = Array.isArray(right) ? right : [right];
      return left.concat(next);
    },
    default: () => [],
  }),
});

export type GraphRuntimeContext = InternalFetchContext & {
  campaignIds?: string[];
  recordUsage: (model: string, inputTokens: number, outputTokens: number) => void;
};

function normalizePlatformToken(p: string): "google_ads" | "meta_ads" | null {
  const x = p.trim().toLowerCase().replace(/-/g, "_");
  if (x === "google" || x === "google_ads" || x === "googleads") {
    return "google_ads";
  }
  if (x === "meta" || x === "meta_ads" || x === "facebook" || x === "fb") {
    return "meta_ads";
  }
  return null;
}

function collectUsageFromMessage(msg: BaseMessage): {
  model: string;
  input: number;
  output: number;
} {
  if (!(msg instanceof AIMessage)) {
    return { model: "unknown", input: 0, output: 0 };
  }
  const meta = msg.response_metadata as Record<string, unknown> | undefined;
  const model =
    (typeof meta?.model_name === "string" && meta.model_name) ||
    (typeof meta?.model === "string" && meta.model) ||
    "grok-3-mini";
  const input = msg.usage_metadata?.input_tokens ?? 0;
  const output = msg.usage_metadata?.output_tokens ?? 0;
  return { model, input, output };
}

function buildFetchDataNode(ctx: GraphRuntimeContext) {
  return async (
    state: AdBrainAgentState
  ): Promise<Partial<AdBrainAgentState>> => {
    const wanted = new Set(
      state.platforms
        .map(normalizePlatformToken)
        .filter(
          (x: ReturnType<typeof normalizePlatformToken>): x is "google_ads" | "meta_ads" =>
            x !== null
        )
    );

    const rows: CampaignMetrics[] = [];
    const params = {
      userId: state.userId,
      campaignIds: ctx.campaignIds,
    };

    try {
      if (wanted.has("google_ads")) {
        const part = await fetch_google_ads(params, ctx);
        rows.push(...part);
      }
      if (wanted.has("meta_ads")) {
        const part = await fetch_meta_ads(params, ctx);
        rows.push(...part);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`fetchData failed: ${msg}`);
    }

    let filtered = rows;
    if (ctx.campaignIds?.length) {
      const allow = new Set(ctx.campaignIds);
      filtered = rows.filter((c) => allow.has(c.campaignId));
    }

    return { campaignData: filtered };
  };
}

function buildAnalyzeNode(llm: BaseChatModel, ctx: GraphRuntimeContext) {
  return async (
    state: AdBrainAgentState
  ): Promise<Partial<AdBrainAgentState>> => {
    const dataJson = JSON.stringify(state.campaignData ?? []);
    const human = new HumanMessage(
      fillTemplate(ANALYSIS_PROMPT, { campaignData: dataJson })
    );
    const sys = new SystemMessage(SYSTEM_PROMPT);

    const resp = await llm.invoke([sys, human]);
    const { model, input, output } = collectUsageFromMessage(resp);
    ctx.recordUsage(model, input, output);

    const text =
      resp instanceof AIMessage ? resp.text : String(resp.content ?? "");

    return {
      analysis: text,
      messages: [human, resp],
    };
  };
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return m ? m[1].trim() : t;
}

function buildOptimizeNodeWithUsage(
  llm: BaseChatModel,
  ctx: GraphRuntimeContext
) {
  return async (
    state: AdBrainAgentState
  ): Promise<Partial<AdBrainAgentState>> => {
    const dataJson = JSON.stringify(state.campaignData ?? []);
    const human = new HumanMessage(
      fillTemplate(OPTIMIZATION_PROMPT, {
        analysis: state.analysis ?? "(no analysis)",
        campaignData: dataJson,
      })
    );
    const sys = new SystemMessage(SYSTEM_PROMPT);

    const resp = await llm.invoke([sys, human]);
    const { model, input, output } = collectUsageFromMessage(resp);
    ctx.recordUsage(model, input, output);

    const rawText =
      resp instanceof AIMessage ? resp.text : String(resp.content ?? "");
    const raw = stripJsonFence(rawText);
    let proposals: OptimizationProposal[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      const checked = OptimizeOutputZ.safeParse(parsed);
      if (checked.success) {
        proposals = checked.data.proposals;
      } else {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start >= 0 && end > start) {
          const inner = JSON.parse(raw.slice(start, end + 1)) as unknown;
          const c2 = OptimizeOutputZ.safeParse(inner);
          if (c2.success) {
            proposals = c2.data.proposals;
          }
        }
      }
    } catch {
      proposals = [];
    }

    return {
      proposals,
      messages: [human, resp],
    };
  };
}

function buildFormatProposalsNode(ctx: GraphRuntimeContext) {
  return async (
    state: AdBrainAgentState
  ): Promise<Partial<AdBrainAgentState>> => {
    const list = state.proposals ?? [];
    const checked: OptimizationProposal[] = [];

    for (const p of list) {
      const r = ProposalZ.safeParse(p);
      if (r.success) {
        checked.push(r.data);
      }
    }

    let out = checked;
    if (ctx.campaignIds?.length) {
      const allow = new Set(ctx.campaignIds);
      out = checked.filter((p) => allow.has(p.campaignId));
    }

    return { proposals: out };
  };
}

/**
 * Stateless compiled graph (no checkpointer).
 */
export function compileAdBrainGraph(
  llm: BaseChatModel,
  ctx: GraphRuntimeContext
) {
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode("fetchData", buildFetchDataNode(ctx))
    .addNode("analyze", buildAnalyzeNode(llm, ctx))
    .addNode("optimize", buildOptimizeNodeWithUsage(llm, ctx))
    .addNode("formatProposals", buildFormatProposalsNode(ctx))
    .addEdge(START, "fetchData")
    .addEdge("fetchData", "analyze")
    .addEdge("analyze", "optimize")
    .addEdge("optimize", "formatProposals")
    .addEdge("formatProposals", END);

  return graph.compile();
}

export type UsageAccumulator = {
  byModel: Record<
    string,
    { input: number; output: number; invocations: number }
  >;
};

export function createUsageAccumulator(): UsageAccumulator {
  return { byModel: {} };
}

export function makeUsageRecorder(acc: UsageAccumulator) {
  return (model: string, inputTokens: number, outputTokens: number) => {
    const cur = acc.byModel[model] ?? {
      input: 0,
      output: 0,
      invocations: 0,
    };
    cur.input += inputTokens;
    cur.output += outputTokens;
    cur.invocations += 1;
    acc.byModel[model] = cur;
  };
}

export async function invokeAdBrainAgent(options: {
  userId: string;
  platforms: string[];
  campaignIds?: string[];
  baseUrl: string;
  forwardHeaders: Record<string, string>;
  llm?: BaseChatModel;
}): Promise<{
  proposals: OptimizationProposal[];
  usage: UsageAccumulator;
}> {
  const llm = options.llm ?? createAdBrainLlm();
  const usage = createUsageAccumulator();
  const recordUsage = makeUsageRecorder(usage);

  const ctx: GraphRuntimeContext = {
    baseUrl: options.baseUrl,
    headers: options.forwardHeaders,
    campaignIds: options.campaignIds,
    recordUsage,
  };

  const app = compileAdBrainGraph(llm, ctx);
  const finalState = await app.invoke({
    userId: options.userId,
    platforms: options.platforms,
    campaignData: null,
    analysis: null,
    proposals: [],
    messages: [],
  });

  return {
    proposals: finalState.proposals ?? [],
    usage,
  };
}
