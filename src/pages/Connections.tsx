import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Loader2 } from "lucide-react";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { RevokeDialog } from "@/components/connections/RevokeDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConnections } from "@/hooks/useConnections";
import { useToast } from "@/components/shared/Toast";

export function Connections() {
  const { connections, connect, disconnect, completeConnection, isLoading } =
    useConnections();
  const { toast } = useToast();
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const connectCode = searchParams.get("connect_code");
    const isCallback = searchParams.get("connect_callback");
    if (connectCode && isCallback) {
      setCompleting(true);
      completeConnection(connectCode).then((ok) => {
        if (ok) {
          toast("success", "Account connected", "Token Vault connection established successfully.");
        } else {
          toast("error", "Connection failed", "Could not finalize the account connection.");
        }
        setSearchParams({}, { replace: true });
        setCompleting(false);
      });
    }
  }, [searchParams, completeConnection, toast, setSearchParams]);

  const targetConnection = connections.find((c) => c.provider === revokeTarget);

  const handleDisconnect = (provider: string) => {
    setRevokeTarget(provider);
  };

  const confirmDisconnect = async () => {
    if (!revokeTarget) return;
    await disconnect(revokeTarget);
    toast(
      "warning",
      "Account disconnected",
      `${targetConnection?.displayName ?? revokeTarget} has been disconnected.`,
    );
    setRevokeTarget(null);
  };

  const handleConnect = async (provider: string) => {
    await connect(provider);
  };

  const activeConnections = connections.filter((c) => c.status !== "coming_soon");
  const hasConnected = activeConnections.some((c) => c.status === "connected");

  if (completing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <p className="text-sm text-zinc-400">Completing account connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Connected Accounts
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your ad platform connections via Auth0 Token Vault
        </p>
      </div>

      {!hasConnected &&
      activeConnections.every((c) => c.status === "disconnected") ? (
        <EmptyState
          icon={Link2}
          title="No accounts connected yet"
          description="Connect your Google Ads or Meta Ads account to enable AI-powered optimization. Your tokens are securely stored in Auth0 Token Vault."
          action={
            <div className="flex gap-3">
              <button
                onClick={() => handleConnect("google-ads")}
                disabled={isLoading}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Connecting..." : "Connect Google Ads"}
              </button>
              <button
                onClick={() => handleConnect("meta-ads")}
                disabled={isLoading}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Connecting..." : "Connect Meta Ads"}
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
