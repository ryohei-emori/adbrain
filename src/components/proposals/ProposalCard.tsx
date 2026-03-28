import { Check, X, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { RiskBadge } from "./RiskBadge";
import type { Proposal } from "@/lib/mock-data";

interface ProposalCardProps {
  proposal: Proposal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onStepUpApprove?: (id: string) => void;
  disabled?: boolean;
}

function platformLabel(p: "google_ads" | "meta") {
  return p === "google_ads" ? "Google Ads" : "Meta Ads";
}

function actionLabel(a: Proposal["action"]) {
  const labels: Record<string, string> = {
    adjust_budget: "Budget Adjustment",
    adjust_bid: "Bid Adjustment",
    pause: "Pause Campaign",
    enable: "Enable Campaign",
  };
  return labels[a] ?? a;
}

export function ProposalCard({
  proposal,
  onApprove,
  onReject,
  onStepUpApprove,
  disabled,
}: ProposalCardProps) {
  const isPending = proposal.status === "pending";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:bg-zinc-800/30 transition-colors">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <RiskBadge level={proposal.riskLevel} />
        <span className="text-xs text-zinc-500">{platformLabel(proposal.platform)}</span>
        <span className="text-xs text-zinc-600">|</span>
        <span className="text-xs text-zinc-500">{actionLabel(proposal.action)}</span>
        {!isPending && (
          <span
            className={cn(
              "ml-auto text-xs font-medium capitalize",
              proposal.status === "approved" && "text-green-400",
              proposal.status === "rejected" && "text-red-400",
              proposal.status === "executed" && "text-brand-primary",
            )}
          >
            {proposal.status}
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-zinc-100 mb-2">
        {proposal.campaignName}
      </h4>

      <div className="mb-3 rounded-lg bg-zinc-800/50 p-3">
        <p className="text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wider">
          Why
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {proposal.reasoning}
        </p>
      </div>

      <div className="mb-4 text-sm text-zinc-300">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          Expected Impact:{" "}
        </span>
        {proposal.expectedImpact}
      </div>

      {isPending && (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          {proposal.requiresStepUp ? (
            <button
              onClick={() => onStepUpApprove?.(proposal.id)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              Approve (MFA)
            </button>
          ) : (
            <button
              onClick={() => onApprove(proposal.id)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
          )}
          <button
            onClick={() => onReject(proposal.id)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
