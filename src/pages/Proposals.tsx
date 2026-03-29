import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { StepUpDialog } from "@/components/auth/StepUpDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useProposals, type ProposalFilter } from "@/hooks/useProposals";
import { useConnections } from "@/hooks/useConnections";
import { useStepUp } from "@/hooks/useStepUp";
import { useToast } from "@/components/shared/Toast";

const TABS: { value: ProposalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function Proposals() {
  const { proposals, allProposals, filter, setFilter, approve, reject, isLoading } =
    useProposals();
  const { connections } = useConnections();
  const stepUp = useStepUp();
  const { toast } = useToast();
  const [pendingStepUpId, setPendingStepUpId] = useState<string | null>(null);

  const hasConnections = connections.some(
    (c) => c.status === "connected" && c.provider !== "tiktok-ads",
  );

  const counts: Record<ProposalFilter, number> = {
    all: allProposals.length,
    pending: allProposals.filter((p) => p.status === "pending").length,
    approved: allProposals.filter((p) => p.status === "approved").length,
    rejected: allProposals.filter((p) => p.status === "rejected").length,
  };

  const handleApprove = async (id: string) => {
    await approve(id);
    toast("success", "Proposal approved");
  };

  const handleReject = async (id: string) => {
    await reject(id);
    toast("warning", "Proposal rejected");
  };

  const handleStepUpApprove = (id: string) => {
    setPendingStepUpId(id);
    stepUp.open();
  };

  const handleMFAVerify = async (code: string) => {
    const ok = await stepUp.verify(code);
    if (ok && pendingStepUpId) {
      await approve(pendingStepUpId, true);
      toast("success", "Proposal approved with MFA");
      setPendingStepUpId(null);
    }
    return ok;
  };

  if (!hasConnections) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-zinc-500 mt-1">
            AI-generated optimization proposals for your campaigns
          </p>
        </div>
        <EmptyState
          icon={Link2}
          title="Connect an ad account first"
          description="The AI agent needs access to your campaign data to generate optimization proposals. Connect Google Ads or Meta Ads to get started."
          action={
            <Link
              to="/dashboard/connections"
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Go to Connections
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Proposals</h1>
        <p className="text-sm text-zinc-500 mt-1">
          AI-generated optimization proposals for your campaigns
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.value
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {tab.label}
            {counts[tab.value] > 0 && (
              <span className="ml-1.5 text-zinc-500">{counts[tab.value]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Proposal list */}
      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="The agent will analyze your campaigns shortly and generate optimization proposals."
        />
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onApprove={handleApprove}
              onReject={handleReject}
              onStepUpApprove={handleStepUpApprove}
              disabled={isLoading}
            />
          ))}
        </div>
      )}

      <StepUpDialog
        open={stepUp.isOpen}
        onClose={stepUp.close}
        onVerify={handleMFAVerify}
        isVerifying={stepUp.isVerifying}
        error={stepUp.error}
      />
    </div>
  );
}
