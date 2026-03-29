import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
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

interface ConnectionsContextValue {
  connections: Connection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  connect: (provider: string, returnTo?: string) => Promise<void>;
  completeConnection: (connectCode: string) => Promise<boolean>;
  disconnect: (provider: string) => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextValue | null>(null);

export function ConnectionsProvider({ children }: { children: ReactNode }) {
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

  const connect = useCallback(
    async (provider: string, returnTo?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const returnPath = returnTo ?? window.location.pathname;
        const resp = await fetch(
          `/api/connect/initiate?provider=${provider}&return_to=${encodeURIComponent(returnPath)}`,
          { method: "POST", credentials: "include" },
        );

        const body = await resp.json().catch(() => ({ error: "" }));

        if (resp.ok && body.connect_uri) {
          window.location.href = body.connect_uri;
          return;
        }

        const isDemoFallback = resp.status === 503 || body.demo;
        if (isDemoFallback) {
          setError(`${provider} is in demo mode — credentials not configured`);
          return;
        }

        throw new Error(body.error || `status ${resp.status}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

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
        await refresh();
      } catch {
        // Optimistic update already applied
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  return (
    <ConnectionsContext.Provider
      value={{ connections, isLoading, error, refresh, connect, completeConnection, disconnect }}
    >
      {children}
    </ConnectionsContext.Provider>
  );
}

export function useConnections() {
  const ctx = useContext(ConnectionsContext);
  if (!ctx) {
    throw new Error("useConnections must be used within a ConnectionsProvider");
  }
  return ctx;
}
