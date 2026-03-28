import { useState, useCallback } from "react";
import { MOCK_CONNECTIONS, type Connection } from "@/lib/mock-data";

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 600));
    setConnections(MOCK_CONNECTIONS);
    setIsLoading(false);
  }, []);

  const connect = useCallback(async (provider: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === provider
          ? {
              ...c,
              status: "connected" as const,
              connectedAt: new Date().toISOString(),
              tokenHealth: "healthy" as const,
              lastUsed: new Date().toISOString(),
            }
          : c,
      ),
    );
    setIsLoading(false);
  }, []);

  const disconnect = useCallback(async (provider: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === provider
          ? {
              ...c,
              status: "disconnected" as const,
              tokenHealth: "unknown" as const,
              scopes: [],
            }
          : c,
      ),
    );
    setIsLoading(false);
  }, []);

  return { connections, isLoading, error, refresh, connect, disconnect };
}
