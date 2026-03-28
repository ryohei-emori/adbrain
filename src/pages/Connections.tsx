import { useState } from "react";
import { Link2 } from "lucide-react";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { RevokeDialog } from "@/components/connections/RevokeDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConnections } from "@/hooks/useConnections";
import { useToast } from "@/components/shared/Toast";

export function Connections() {
  const { connections, connect, disconnect } = useConnections();
  const { toast } = useToast();
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const targetConnection = connections.find((c) => c.provider === revokeTarget);

  const handleDisconnect = (provider: string) => {
    setRevokeTarget(provider);
  };

  const confirmDisconnect = async () => {
    if (!revokeTarget) return;
    await disconnect(revokeTarget);
    toast("warning", "Account disconnected", `${targetConnection?.displayName ?? revokeTarget} has been disconnected.`);
    setRevokeTarget(null);
  };

  const handleConnect = async (provider: string) => {
    await connect(provider);
    const c = connections.find((x) => x.provider === provider);
    toast("success", "Account connected", `${c?.displayName ?? provider} connected successfully.`);
  };

  const activeConnections = connections.filter((c) => c.status !== "coming_soon");
  const hasConnected = activeConnections.some((c) => c.status === "connected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Connected Accounts</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your ad platform connections
        </p>
      </div>

      {!hasConnected && activeConnections.every((c) => c.status === "disconnected") ? (
        <EmptyState
          icon={Link2}
          title="No accounts connected yet"
          description="Connect your Google Ads or Meta Ads account to start seeing performance data and AI optimization proposals."
          action={
            <div className="flex gap-3">
              <button
                onClick={() => handleConnect("google-ads")}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Connect Google Ads
              </button>
              <button
                onClick={() => handleConnect("meta-ads")}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Connect Meta Ads
              </button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {connections.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              onDisconnect={handleDisconnect}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}

      <RevokeDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={confirmDisconnect}
        providerName={targetConnection?.displayName ?? ""}
        pendingProposals={3}
      />
    </div>
  );
}
