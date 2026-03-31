import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Link2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { StepUpDialog } from "@/components/auth/StepUpDialog";
import { useProposals } from "@/hooks/useProposals";
import { useMetrics } from "@/hooks/useMetrics";
import { useStepUp } from "@/hooks/useStepUp";
import { useConnections } from "@/hooks/useConnections";
import { useToast } from "@/components/shared/Toast";

export function Dashboard() {
  const { allProposals, approve, reject, isLoading, source: proposalSource } = useProposals();
  const { metrics, source } = useMetrics();
  const { connections, refresh: refreshConnections } = useConnections();
  const stepUp = useStepUp();
  const { toast } = useToast();
  const [pendingStepUpId, setPendingStepUpId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const connectedParam = searchParams.get("connected");
  useEffect(() => {
    if (connectedParam) {
      setSearchParams({}, { replace: true });
      refreshConnections().then(() => {
        toast("success", "Connected!", `${connectedParam} has been connected successfully.`);
      });
    }
  }, [connectedParam, refreshConnections, toast, setSearchParams]);

  const connectedCount = connections.filter(
    (c) => c.status === "connected" && c.provider !== "tiktok-ads",
  ).length;
  const hasConnections = connectedCount > 0;
  const pendingProposals = allProposals.filter((p) => p.status === "pending");

  const handleApprove = async (id: string) => {
    await approve(id);
    toast("success", "Proposal approved", "The change will be executed shortly.");
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
      toast("success", "Proposal approved with MFA", "High-risk action verified and queued.");
      setPendingStepUpId(null);
    }
    return ok;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Your ad performance at a glance</p>
        </div>
        {source === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Live data via Token Vault
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400">
            Sample data
          </span>
        )}
      </div>

      {!hasConnections && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Link2 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">No ad accounts connected</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Connect Google Ads or Meta Ads to see live metrics and enable AI optimization.
            </p>
          </div>
          <Link
            to="/dashboard/connections"
            className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            Connect
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Spend"
          value={metrics.spend.value}
          change={metrics.spend.change}
          trend={metrics.spend.trend}
          trendPositive={metrics.spend.trendPositive}
        />
        <MetricCard
          label="CTR"
          value={metrics.ctr.value}
          change={metrics.ctr.change}
          trend={metrics.ctr.trend}
          trendPositive={metrics.ctr.trendPositive}
        />
        <MetricCard
          label="CPA"
          value={metrics.cpa.value}
          change={metrics.cpa.change}
          trend={metrics.cpa.trend}
          trendPositive={metrics.cpa.trendPositive}
        />
        <MetricCard
          label="ROAS"
          value={metrics.roas.value}
          change={metrics.roas.change}
          trend={metrics.roas.trend}
          trendPositive={metrics.roas.trendPositive}
        />
      </div>

      <PerformanceChart />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">
            Agent Proposals
            {pendingProposals.length > 0 && (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                ({pendingProposals.length} pending)
              </span>
            )}
            {proposalSource === "mock" && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal">
                Sample
              </span>
            )}
            {proposalSource === "agent" && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 font-normal">
                AI Agent
              </span>
            )}
          </h2>
          <Link
            to="/dashboard/proposals"
            className="inline-flex items-center gap-1 text-xs text-brand-primary hover:text-blue-400 transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {pendingProposals.slice(0, 3).map((p) => (
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
      </div>

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
