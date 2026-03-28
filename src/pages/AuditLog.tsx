import { ScrollText } from "lucide-react";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { EmptyState } from "@/components/shared/EmptyState";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data";

export function AuditLog() {
  const entries = MOCK_AUDIT_LOGS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Complete activity timeline for your account
        </p>
      </div>

      {entries.length === 0 ? (
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
