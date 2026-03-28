import { useState, useCallback } from "react";
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

  const approve = useCallback(async (id: string, withMFA = false) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
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
  }, []);

  const reject = useCallback(async (id: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "rejected" as const } : p,
      ),
    );
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 600));
    setProposals(MOCK_PROPOSALS);
    setIsLoading(false);
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
