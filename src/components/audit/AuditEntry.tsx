import {
  CheckCircle2,
  RefreshCw,
  Globe,
  ShieldCheck,
  Link2,
  Unlink,
  Bot,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AuditLogEntry } from "@/lib/mock-data";

const ACTION_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  proposal_approved: { icon: CheckCircle2, color: "text-green-400", label: "Proposal Approved" },
  proposal_rejected: { icon: XCircle, color: "text-red-400", label: "Proposal Rejected" },
  proposal_created: { icon: Bot, color: "text-brand-primary", label: "Proposal Created" },
  proposal_executed: { icon: CheckCircle2, color: "text-blue-400", label: "Proposal Executed" },
  token_exchange: { icon: RefreshCw, color: "text-yellow-400", label: "Token Exchange" },
  api_call: { icon: Globe, color: "text-cyan-400", label: "API Call" },
  step_up_completed: { icon: ShieldCheck, color: "text-purple-400", label: "Step-up Auth Completed" },
  connection_added: { icon: Link2, color: "text-green-400", label: "Connection Added" },
  connection_revoked: { icon: Unlink, color: "text-red-400", label: "Connection Revoked" },
};

interface AuditEntryProps {
  entry: AuditLogEntry;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function providerLabel(p?: "google_ads" | "meta"): string {
  if (!p) return "";
  return p === "google_ads" ? "Google Ads" : "Meta Ads";
}

export function AuditEntry({ entry }: AuditEntryProps) {
  const config = ACTION_CONFIG[entry.action] ?? {
    icon: Globe,
    color: "text-zinc-400",
    label: entry.action,
  };
  const Icon = config.icon;

  const detailValues = Object.entries(entry.details)
    .filter(([k]) => !["proposalId"].includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 shrink-0",
          )}
        >
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="w-px flex-1 bg-zinc-800 mt-2" />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-zinc-500">{formatTime(entry.timestamp)}</span>
          <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
          {entry.provider && (
            <span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
              {providerLabel(entry.provider)}
            </span>
          )}
          <span
            className={cn(
              "ml-auto text-xs font-medium",
              entry.success ? "text-green-400" : "text-red-400",
            )}
          >
            {entry.success ? "Success" : "Failed"}
          </span>
        </div>
        {detailValues && (
          <p className="text-xs text-zinc-500 mt-1 truncate">{detailValues}</p>
        )}
        {entry.errorMessage && (
          <p className="text-xs text-red-400 mt-1">{entry.errorMessage}</p>
        )}
      </div>
    </div>
  );
}
