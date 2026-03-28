import type { RiskLevel } from "./risk";

export interface Campaign {
  id: string;
  name: string;
  platform: "google_ads" | "meta";
  status: "active" | "paused";
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

export interface Proposal {
  id: string;
  userId: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  platform: "google_ads" | "meta";
  campaignId: string;
  campaignName: string;
  action: "adjust_budget" | "adjust_bid" | "pause" | "enable";
  currentValue: number;
  proposedValue: number;
  changeRatio: number;
  riskLevel: RiskLevel;
  reasoning: string;
  expectedImpact: string;
  requiresStepUp: boolean;
  approvedAt?: string;
  approvedWithMFA?: boolean;
  executedAt?: string;
  executionResult?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  action:
    | "token_exchange"
    | "api_call"
    | "proposal_created"
    | "proposal_approved"
    | "proposal_rejected"
    | "proposal_executed"
    | "connection_added"
    | "connection_revoked"
    | "step_up_completed";
  provider?: "google_ads" | "meta";
  details: Record<string, unknown>;
  scope?: string;
  success: boolean;
  errorMessage?: string;
}

export interface Connection {
  id: string;
  provider: "google-ads" | "meta-ads" | "tiktok-ads";
  displayName: string;
  status: "connected" | "disconnected" | "expired" | "coming_soon";
  connectedAt?: string;
  lastUsed?: string;
  tokenHealth: "healthy" | "expiring" | "expired" | "unknown";
  scopes: string[];
  accountName?: string;
}

export interface LLMUsage {
  model: string;
  invocations: number;
  inputTokens: number;
  outputTokens: number;
  costToday: number;
  costTotal: number;
  creditRemaining: number;
  creditLimit: number;
}

// ---------- Mock Data ----------

const today = new Date().toISOString().split("T")[0]!;
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "g-001",
    name: "Brand Awareness Q1",
    platform: "google_ads",
    status: "active",
    budget: 2000,
    spend: 1842,
    impressions: 245000,
    clicks: 7840,
    conversions: 156,
    ctr: 3.2,
    cpc: 2.15,
    cpa: 11.81,
    roas: 4.2,
  },
  {
    id: "g-002",
    name: "Summer Sale",
    platform: "google_ads",
    status: "active",
    budget: 1500,
    spend: 1380,
    impressions: 180000,
    clicks: 4320,
    conversions: 72,
    ctr: 2.4,
    cpc: 3.19,
    cpa: 19.17,
    roas: 0.8,
  },
  {
    id: "m-001",
    name: "Retargeting Lookalikes",
    platform: "meta",
    status: "active",
    budget: 1000,
    spend: 920,
    impressions: 310000,
    clicks: 9920,
    conversions: 198,
    ctr: 3.2,
    cpc: 0.93,
    cpa: 4.65,
    roas: 5.1,
  },
  {
    id: "m-002",
    name: "Product Catalog DPA",
    platform: "meta",
    status: "paused",
    budget: 800,
    spend: 560,
    impressions: 120000,
    clicks: 2880,
    conversions: 48,
    ctr: 2.4,
    cpc: 1.94,
    cpa: 11.67,
    roas: 2.3,
  },
];

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "p-001",
    userId: "mock-user",
    createdAt: `${today}T14:30:00Z`,
    status: "pending",
    platform: "google_ads",
    campaignId: "g-001",
    campaignName: "Brand Awareness Q1",
    action: "adjust_budget",
    currentValue: 1500,
    proposedValue: 2000,
    changeRatio: 0.333,
    riskLevel: "MEDIUM",
    reasoning:
      "Meta's CPC ($2.80) is 30% higher than Google's ($2.15) for similar audience segments. Shifting $500 from Meta to Google Ads should reduce overall CPA by approximately 18%.",
    expectedImpact: "CPA: $12.40 → $10.17 (▼18%)",
    requiresStepUp: false,
  },
  {
    id: "p-002",
    userId: "mock-user",
    createdAt: `${today}T14:28:00Z`,
    status: "pending",
    platform: "google_ads",
    campaignId: "g-002",
    campaignName: "Summer Sale",
    action: "pause",
    currentValue: 1,
    proposedValue: 0,
    changeRatio: -1,
    riskLevel: "HIGH",
    reasoning:
      "ROAS has been below 1.0 for 7 consecutive days. Continuing will waste approximately $1,200/week with no return.",
    expectedImpact: "Weekly savings: ~$1,200",
    requiresStepUp: true,
  },
  {
    id: "p-003",
    userId: "mock-user",
    createdAt: `${yesterday}T09:15:00Z`,
    status: "approved",
    platform: "meta",
    campaignId: "m-001",
    campaignName: "Retargeting Lookalikes",
    action: "adjust_bid",
    currentValue: 1.2,
    proposedValue: 1.5,
    changeRatio: 0.25,
    riskLevel: "LOW",
    reasoning:
      "This campaign has a strong ROAS of 5.1x with room for growth. Increasing bid by 25% could capture additional high-value impressions in competitive time slots.",
    expectedImpact: "Impressions: +15-20%, ROAS maintained above 4.5x",
    requiresStepUp: false,
    approvedAt: `${yesterday}T10:00:00Z`,
    approvedWithMFA: false,
  },
  {
    id: "p-004",
    userId: "mock-user",
    createdAt: `${yesterday}T08:00:00Z`,
    status: "rejected",
    platform: "meta",
    campaignId: "m-002",
    campaignName: "Product Catalog DPA",
    action: "enable",
    currentValue: 0,
    proposedValue: 1,
    changeRatio: 1,
    riskLevel: "LOW",
    reasoning:
      "This campaign was paused 3 days ago but recent audience signals show improved relevance scores.",
    expectedImpact: "Resume spending at $800/week",
    requiresStepUp: false,
  },
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "a-001",
    userId: "mock-user",
    timestamp: `${today}T14:32:00Z`,
    action: "proposal_approved",
    provider: "google_ads",
    details: {
      proposalId: "p-001",
      action: "Shift $500 Meta → Google Ads",
      approvedBy: "you@gmail.com",
    },
    success: true,
  },
  {
    id: "a-002",
    userId: "mock-user",
    timestamp: `${today}T14:31:00Z`,
    action: "token_exchange",
    provider: "google_ads",
    details: { scope: "Campaign Management", latency: "245ms" },
    scope: "https://www.googleapis.com/auth/adwords",
    success: true,
  },
  {
    id: "a-003",
    userId: "mock-user",
    timestamp: `${today}T14:30:00Z`,
    action: "api_call",
    provider: "google_ads",
    details: {
      method: "GET",
      endpoint: "/customers/.../campaigns",
      duration: "1.2s",
      statusCode: 200,
    },
    success: true,
  },
  {
    id: "a-004",
    userId: "mock-user",
    timestamp: `${today}T14:28:00Z`,
    action: "step_up_completed",
    details: {
      method: "TOTP",
      result: "Verified",
      trigger: "Pause campaign (HIGH risk)",
    },
    success: true,
  },
  {
    id: "a-005",
    userId: "mock-user",
    timestamp: `${yesterday}T09:15:00Z`,
    action: "connection_added",
    provider: "meta",
    details: { scopes: ["Ad Management", "Performance Data"] },
    success: true,
  },
  {
    id: "a-006",
    userId: "mock-user",
    timestamp: `${yesterday}T08:45:00Z`,
    action: "connection_added",
    provider: "google_ads",
    details: { scopes: ["Campaign Management"] },
    success: true,
  },
  {
    id: "a-007",
    userId: "mock-user",
    timestamp: `${yesterday}T08:30:00Z`,
    action: "proposal_created",
    provider: "meta",
    details: {
      proposalId: "p-003",
      action: "Adjust bid for Retargeting Lookalikes",
    },
    success: true,
  },
];

export const MOCK_CONNECTIONS: Connection[] = [
  {
    id: "c-001",
    provider: "google-ads",
    displayName: "Google Ads",
    status: "connected",
    connectedAt: "2026-03-20T10:00:00Z",
    lastUsed: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    tokenHealth: "healthy",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    accountName: "AdBrain Demo (xxx-xxx-1234)",
  },
  {
    id: "c-002",
    provider: "meta-ads",
    displayName: "Meta Ads",
    status: "connected",
    connectedAt: "2026-03-21T11:00:00Z",
    lastUsed: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    tokenHealth: "healthy",
    scopes: ["ads_management", "ads_read"],
    accountName: "AdBrain Demo (act_123456)",
  },
  {
    id: "c-003",
    provider: "tiktok-ads",
    displayName: "TikTok Ads",
    status: "coming_soon",
    tokenHealth: "unknown",
    scopes: [],
  },
];

export const MOCK_LLM_USAGE: LLMUsage = {
  model: "grok-3-mini",
  invocations: 47,
  inputTokens: 28400,
  outputTokens: 12600,
  costToday: 0.03,
  costTotal: 0.42,
  creditRemaining: 149.58,
  creditLimit: 150.0,
};

export function generatePerformanceData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    data.push({
      date: label,
      google: +(2.8 + Math.random() * 1.2 - 0.3 * Math.sin(i * 0.5)).toFixed(2),
      meta: +(2.2 + Math.random() * 1.0 - 0.2 * Math.cos(i * 0.3)).toFixed(2),
    });
  }
  return data;
}
