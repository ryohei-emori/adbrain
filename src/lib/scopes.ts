export interface ScopeLabel {
  technical: string;
  display: string;
  description: string;
  icon: string;
  riskLevel: "low" | "medium" | "high";
}

export const SCOPE_LABELS: Record<string, ScopeLabel[]> = {
  "google-ads": [
    {
      technical: "https://www.googleapis.com/auth/adwords",
      display: "Campaign Management",
      description: "View and edit your Google Ads campaigns, budgets, and bids",
      icon: "BarChart3",
      riskLevel: "high",
    },
    {
      technical: "https://www.googleapis.com/auth/adwords.readonly",
      display: "Performance Reporting",
      description: "View campaign performance metrics and reports",
      icon: "Eye",
      riskLevel: "low",
    },
  ],
  "meta-ads": [
    {
      technical: "ads_management",
      display: "Ad Management",
      description: "Create, edit, and manage your Meta ad campaigns",
      icon: "Megaphone",
      riskLevel: "high",
    },
    {
      technical: "ads_read",
      display: "Performance Data",
      description: "View campaign performance metrics and reports",
      icon: "Eye",
      riskLevel: "low",
    },
  ],
};

export function getScopeLabels(provider: string): ScopeLabel[] {
  return SCOPE_LABELS[provider] ?? [];
}

export function getScopeDisplayName(provider: string, technical: string): string {
  const scopes = SCOPE_LABELS[provider];
  if (!scopes) return technical;
  const found = scopes.find((s) => s.technical === technical);
  return found?.display ?? technical;
}
