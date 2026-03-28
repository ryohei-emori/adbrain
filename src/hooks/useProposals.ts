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

  const fetchFromAgent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/agent/invoke", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          platforms: ["google_ads", "meta_ads"],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          return null;
        }
        throw new Error(`agent invoke returned ${resp.status}`);
      }

      const data = await resp.json();
      if (data.proposals && Array.isArray(data.proposals) && data.proposals.length > 0) {
        return data.proposals as Proposal[];
      }
      return null;
    } catch (e) {
      console.warn("Agent invoke failed, using mock proposals:", e);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const agentProposals = await fetchFromAgent();
    if (agentProposals) {
      setProposals(agentProposals);
    } else {
      setProposals(MOCK_PROPOSALS);
    }
    setIsLoading(false);
  }, [fetchFromAgent]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = useCallback(async (id: string, withMFA = false) => {
    setIsLoading(true);
    try {
      await fetch("/api/agent/invoke", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", proposalId: id, withMFA }),
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
      await fetch("/api/agent/invoke", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", proposalId: id }),
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
