import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Link2, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { StepUpDialog } from "@/components/auth/StepUpDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScopeVisualizer } from "@/components/connections/ScopeVisualizer";
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
  const { proposals, allProposals, filter, setFilter, approve, reject, refresh: refreshProposals, isLoading } =
    useProposals();
  const { connections, connect, refresh: refreshConnections } = useConnections();
  const stepUp = useStepUp();
  const { toast } = useToast();
  const [pendingStepUpId, setPendingStepUpId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const connectedParam = searchParams.get("connected");
  const connectError = searchParams.get("connect_error");

  const hasConnections = connections.some(
    (c) => c.status === "connected" && c.provider !== "tiktok-ads",
  );

  useEffect(() => {
    if (connectedParam) {
      refreshConnections();
      toast("success", "Connected!", `${connectedParam} has been connected successfully.`);
      setSearchParams({}, { replace: true });
      setGenerating(true);
      refreshProposals().finally(() => {
        setTimeout(() => setGenerating(false), 2000);
      });
    }
  }, [connectedParam, refreshConnections, refreshProposals, toast, setSearchParams]);

  useEffect(() => {
    if (connectError) {
      toast("error", "Connection failed", connectError);
      setSearchParams({}, { replace: true });
    }
  }, [connectError, toast, setSearchParams]);

  const counts: Record<ProposalFilter, number> = {
    all: allProposals.length,
    pending: allProposals.filter((p) => p.status === "pending").length,
    approved: allProposals.filter((p) => p.status === "approved").length,
    rejected: allProposals.filter((p) => p.status === "rejected").length,
  };

  const handleConnect = async (provider: "google-ads" | "meta-ads") => {
    setConnecting(provider);
    try {
      await connect(provider, "/dashboard/proposals");
    } finally {
      setConnecting(null);
    }
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

  if (generating) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-zinc-500 mt-1">
            AI-generated optimization proposals for your campaigns
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-brand-primary" />
            </div>
            <Loader2 className="absolute -top-1 -right-1 h-5 w-5 animate-spin text-brand-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">Analyzing your campaigns</h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              The AI agent is reviewing your ad data and generating optimization proposals. This may take a moment.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse [animation-delay:300ms]" />
            <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse [animation-delay:600ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasConnections) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-zinc-500 mt-1">
            AI-generated optimization proposals for your campaigns
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-brand-primary" />
              </div>
            </div>
            <h2 className="text-lg font-semibold mb-1">Connect to generate proposals</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              The AI agent needs access to your campaign data. Connect an ad platform below to start receiving optimization proposals.
            </p>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            {([
              { provider: "google-ads" as const, name: "Google Ads", color: "bg-blue-600" },
              { provider: "meta-ads" as const, name: "Meta Ads", color: "bg-indigo-600", demo: true },
            ]).map(({ provider, name, color, demo }) => (
              <div key={provider} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold", color)}>
                      {name[0]}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  {demo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                      Demo
                    </span>
                  )}
                </div>
                <ScopeVisualizer provider={provider} />
                <button
                  onClick={() => handleConnect(provider)}
                  disabled={connecting === provider}
                  className="mt-3 w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {connecting === provider ? "Connecting..." : `Connect with ${name.split(" ")[0]}`}
                </button>
              </div>
            ))}
          </div>
        </div>
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
