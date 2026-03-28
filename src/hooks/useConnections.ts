import { useState, useCallback, useEffect } from "react";
import { MOCK_CONNECTIONS, type Connection } from "@/lib/mock-data";

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

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/connect/status", { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) {
          setConnections(MOCK_CONNECTIONS);
          return;
        }
        throw new Error(`status ${resp.status}`);
      }
      const data: StatusResponse = await resp.json();
      const mapped = data.connections.map(apiToConnection);
      mapped.push(TIKTOK_PLACEHOLDER);
      setConnections(mapped);
    } catch (e) {
      console.warn("Failed to fetch connection status, using fallback:", e);
      setConnections(MOCK_CONNECTIONS);
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
      try {
        const resp = await fetch(`/api/connect/disconnect?provider=${provider}`, {
          method: "POST",
          credentials: "include",
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? `status ${resp.status}`);
        }
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Disconnect failed";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  return { connections, isLoading, error, refresh, connect, completeConnection, disconnect };
}
