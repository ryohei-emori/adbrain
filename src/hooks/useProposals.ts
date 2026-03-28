import { useState, useCallback, useEffect } from "react";
import { MOCK_PROPOSALS, type Proposal } from "@/lib/mock-data";

export type ProposalFilter = "all" | "pending" | "approved" | "rejected";

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [filter, setFilter] = useState<ProposalFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? proposals
      : proposals.filter((p) => p.status === filter);

  const fetchFromGoAPI = useCallback(async (): Promise<Proposal[] | null> => {
    try {
      const resp = await fetch("/api/proposals", {
        credentials: "include",
      });
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
  }, []);

  const fetchFromAgent = useCallback(async (): Promise<Proposal[] | null> => {
    try {
      const resp = await fetch("/api/agent/invoke", {
        method: "POST",
        credentials: "include",
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
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const goProposals = await fetchFromGoAPI();
    if (goProposals) {
      setProposals(goProposals);
      setIsLoading(false);
      return;
    }

    const agentProposals = await fetchFromAgent();
    if (agentProposals) {
      setProposals(agentProposals);
    } else {
      setProposals(MOCK_PROPOSALS);
    }
    setIsLoading(false);
  }, [fetchFromGoAPI, fetchFromAgent]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = useCallback(async (id: string, withMFA = false) => {
    setIsLoading(true);
    try {
      await fetch(`/api/proposals?id=${id}`, {
        method: "PATCH",
        credentials: "include",
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
  }, []);

  const reject = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/proposals?id=${id}`, {
        method: "PATCH",
        credentials: "include",
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
  }, []);

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
  };
}
