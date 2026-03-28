import { ScrollText, RefreshCw } from "lucide-react";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuditLog } from "@/hooks/useAuditLog";

export function AuditLog() {
  const { entries, isLoading, refresh } = useAuditLog();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Complete activity timeline for your account
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {entries.length === 0 && !isLoading ? (
        <EmptyState
          icon={ScrollText}
          title="No activity yet"
          description="Actions will appear here as you use AdBrain."
        />
      ) : (
        <AuditTimeline entries={entries} />
      )}
    </div>
  );
}
