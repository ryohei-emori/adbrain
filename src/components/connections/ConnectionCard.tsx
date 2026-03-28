import { Wifi, WifiOff, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { ScopeVisualizer } from "./ScopeVisualizer";
import type { Connection } from "@/lib/mock-data";

interface ConnectionCardProps {
  connection: Connection;
  onDisconnect: (provider: string) => void;
  onConnect?: (provider: string) => void;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PROVIDER_COLORS: Record<string, string> = {
  "google-ads": "bg-blue-600",
  "meta-ads": "bg-indigo-600",
  "tiktok-ads": "bg-zinc-700",
};

const TOKEN_STATUS: Record<string, { color: string; label: string }> = {
  healthy: { color: "text-green-400", label: "Healthy" },
  expiring: { color: "text-amber-400", label: "Expiring Soon" },
  expired: { color: "text-red-400", label: "Expired" },
  unknown: { color: "text-zinc-500", label: "Unknown" },
};

export function ConnectionCard({
  connection,
  onDisconnect,
  onConnect,
}: ConnectionCardProps) {
  const isComingSoon = connection.status === "coming_soon";
  const isConnected = connection.status === "connected";
  const tokenInfo = TOKEN_STATUS[connection.tokenHealth] ?? TOKEN_STATUS.unknown!;

  if (isComingSoon) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", PROVIDER_COLORS[connection.provider])}>
            <span className="text-lg">🎵</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">{connection.displayName}</h3>
            <span className="text-xs text-zinc-500">Coming Soon</span>
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Cross-platform optimization across 3 platforms
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white", PROVIDER_COLORS[connection.provider])}>
            {connection.provider === "google-ads" ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.093 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.563V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{connection.displayName}</h3>
            {connection.accountName && (
              <p className="text-xs text-zinc-500">{connection.accountName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-medium text-green-400">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {connection.connectedAt && (
        <p className="text-xs text-zinc-500 mb-3">
          Connected {formatDate(connection.connectedAt)}
        </p>
      )}

      {isConnected && (
        <>
          <ScopeVisualizer provider={connection.provider} className="mb-4" />

          <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last used: {timeAgo(connection.lastUsed)}
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Token: <span className={tokenInfo.color}>{tokenInfo.label}</span>
            </span>
          </div>

          <button
            onClick={() => onDisconnect(connection.provider)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        </>
      )}

      {!isConnected && !isComingSoon && onConnect && (
        <button
          onClick={() => onConnect(connection.provider)}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Connect {connection.displayName}
        </button>
      )}
    </div>
  );
}
