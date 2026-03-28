import { useState, useCallback, useEffect } from "react";
import { MOCK_AUDIT_LOGS, type AuditLogEntry } from "@/lib/mock-data";

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/audit", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        if (data.entries && Array.isArray(data.entries) && data.entries.length > 0) {
          const mapped: AuditLogEntry[] = data.entries.map((e: Record<string, unknown>) => ({
            id: e.id,
            userId: e.user_id,
            timestamp: e.timestamp,
            action: e.action,
            provider: e.provider,
            details: e.details ?? {},
            scope: e.scope,
            success: e.success,
            errorMessage: e.error_message,
          }));
          setEntries(mapped);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // fall through to mock
    }
    setEntries(MOCK_AUDIT_LOGS);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, isLoading, error, refresh: fetchEntries };
}
