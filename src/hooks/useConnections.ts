import { useState, useCallback, useEffect } from "react";
import type { Connection } from "@/lib/mock-data";

interface APIConnectionStatus {
  provider: string;
  connected: boolean;
  connected_at?: string;
  token_status: string;
  scopes?: string[];
  account_name?: string;
}

interface StatusResponse {
  user_id: string;
  connections: APIConnectionStatus[];
  source: string;
}

const PROVIDER_DISPLAY: Record<string, { displayName: string; id: string }> = {
  "google-ads": { displayName: "Google Ads", id: "c-001" },
  "meta-ads": { displayName: "Meta Ads", id: "c-002" },
};

function apiToConnection(api: APIConnectionStatus): Connection {
  const display = PROVIDER_DISPLAY[api.provider];
  return {
    id: display?.id ?? api.provider,
    provider: api.provider as Connection["provider"],
    displayName: display?.displayName ?? api.provider,
    status: api.connected ? "connected" : "disconnected",
    connectedAt: api.connected_at,
    lastUsed: api.connected ? new Date().toISOString() : undefined,
    tokenHealth: api.connected
      ? (api.token_status as Connection["tokenHealth"]) ?? "healthy"
      : "unknown",
    scopes: api.scopes ?? [],
    accountName: api.account_name,
  };
}

const TIKTOK_PLACEHOLDER: Connection = {
  id: "c-003",
  provider: "tiktok-ads",
  displayName: "TikTok Ads",
  status: "coming_soon",
  tokenHealth: "unknown",
  scopes: [],
};

const DEFAULT_CONNECTIONS: Connection[] = [
  {
    id: "c-001",
    provider: "google-ads",
    displayName: "Google Ads",
    status: "disconnected",
    tokenHealth: "unknown",
    scopes: ["https://www.googleapis.com/auth/adwords"],
  },
  {
    id: "c-002",
    provider: "meta-ads",
    displayName: "Meta Ads",
    status: "disconnected",
    tokenHealth: "unknown",
    scopes: ["ads_management", "ads_read"],
  },
  TIKTOK_PLACEHOLDER,
];

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>(DEFAULT_CONNECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/connect/status", { credentials: "include" });
      if (!resp.ok) {
        setConnections(DEFAULT_CONNECTIONS);
        return;
      }
      const data: StatusResponse = await resp.json();
      const mapped = data.connections.map(apiToConnection);
      mapped.push(TIKTOK_PLACEHOLDER);
      setConnections(mapped);
    } catch {
      setConnections(DEFAULT_CONNECTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(async (provider: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/connect/initiate?provider=${provider}`, {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? `status ${resp.status}`);
      }
      const data = await resp.json();
      if (data.connect_uri) {
        window.location.href = data.connect_uri;
        return;
      }
      throw new Error("No connect_uri returned");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
      setIsLoading(false);
    }
  }, []);

  const completeConnection = useCallback(
    async (connectCode: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetch(
          `/api/connect/complete?connect_code=${encodeURIComponent(connectCode)}`,
          { method: "POST", credentials: "include" },
        );
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? `status ${resp.status}`);
        }
        await refresh();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Complete failed";
        setError(msg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  const disconnect = useCallback(
    async (provider: string) => {
      setIsLoading(true);
      setError(null);

      // Immediately update local state to reflect disconnection
      setConnections((prev) =>
        prev.map((c) =>
          c.provider === provider
            ? {
                ...c,
                status: "disconnected" as const,
                tokenHealth: "unknown" as const,
                connectedAt: undefined,
                lastUsed: undefined,
                accountName: undefined,
              }
            : c,
        ),
      );

      try {
        await fetch(`/api/connect/disconnect?provider=${provider}`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Local state already updated above
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { connections, isLoading, error, refresh, connect, completeConnection, disconnect };
}
