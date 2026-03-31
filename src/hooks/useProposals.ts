import { useState, useCallback, useEffect } from "react";
import { MOCK_PROPOSALS, type Proposal } from "@/lib/mock-data";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSystemConfig } from "@/hooks/useSystemConfig";

export type ProposalFilter = "all" | "pending" | "approved" | "rejected";
export type ProposalSource = "agent" | "kv" | "mock";

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [filter, setFilter] = useState<ProposalFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ProposalSource>("mock");
  const authFetch = useAuthFetch();
  const { config } = useSystemConfig();

  const filtered =
    filter === "all"
      ? proposals
      : proposals.filter((p) => p.status === filter);

  const fetchFromGoAPI = useCallback(async (): Promise<Proposal[] | null> => {
    try {
      const resp = await authFetch("/api/proposals");
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.proposals && Array.isArray(data.proposals) && data.proposals.length > 0) {
        return data.proposals.map((p: Record<string, unknown>) => ({
          id: p.id,
          userId: p.user_id,
          createdAt: p.created_at,
          status: p.status,
          platform: p.platform,
          campaignId: p.campaign_id,
          campaignName: p.campaign_name,
          action: p.action,
          currentValue: p.current_value,
          proposedValue: p.proposed_value,
          changeRatio: p.change_ratio,
          riskLevel: p.risk_level,
          reasoning: p.reasoning,
          expectedImpact: p.expected_impact,
          requiresStepUp: p.requires_step_up,
          approvedAt: p.approved_at,
          approvedWithMFA: p.approved_with_mfa,
        })) as Proposal[];
      }
      return null;
    } catch {
      return null;
    }
  }, [authFetch]);

  const fetchFromAgent = useCallback(async (): Promise<Proposal[] | null> => {
    try {
      const resp = await authFetch("/api/agent/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: ["google_ads", "meta_ads"] }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.proposals && Array.isArray(data.proposals) && data.proposals.length > 0) {
        return data.proposals as Proposal[];
      }
      return null;
    } catch {
      return null;
    }
  }, [authFetch]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const goProposals = await fetchFromGoAPI();
    if (goProposals) {
      setProposals(goProposals);
      setSource("kv");
      setIsLoading(false);
      return;
    }

    if (config.llmConfigured) {
      const agentProposals = await fetchFromAgent();
      if (agentProposals) {
        setProposals(agentProposals);
        setSource("agent");
        setIsLoading(false);
        return;
      }
    }

    setProposals(MOCK_PROPOSALS);
    setSource("mock");
    setIsLoading(false);
  }, [fetchFromGoAPI, fetchFromAgent, config.llmConfigured]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = useCallback(async (id: string, withMFA = false) => {
    setIsLoading(true);
    try {
      await authFetch(`/api/proposals?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }).catch(() => {});
    } finally {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "approved" as const,
                approvedAt: new Date().toISOString(),
                approvedWithMFA: withMFA,
              }
            : p,
        ),
      );
      setIsLoading(false);
    }
  }, [authFetch]);

  const reject = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await authFetch(`/api/proposals?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      }).catch(() => {});
    } finally {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "rejected" as const } : p,
        ),
      );
      setIsLoading(false);
    }
  }, [authFetch]);

  return {
    proposals: filtered,
    allProposals: proposals,
    filter,
    setFilter,
    approve,
    reject,
    refresh,
    isLoading,
    error,
    source,
  };
}
