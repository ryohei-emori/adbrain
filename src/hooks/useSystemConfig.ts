import { useState, useEffect, useCallback } from "react";

export interface SystemCapabilities {
  llmConfigured: boolean;
  llmProviders: string[];
  proxyReady: boolean;
  googleDeveloperToken: boolean;
  metaConfigured: boolean;
  kvAvailable: boolean;
}

const DEFAULT: SystemCapabilities = {
  llmConfigured: false,
  llmProviders: [],
  proxyReady: false,
  googleDeveloperToken: false,
  metaConfigured: false,
  kvAvailable: false,
};

let cached: SystemCapabilities | null = null;
let fetchPromise: Promise<SystemCapabilities> | null = null;

async function fetchConfig(): Promise<SystemCapabilities> {
  try {
    const resp = await fetch("/api/config");
    if (!resp.ok) return DEFAULT;
    const data = await resp.json();
    return {
      llmConfigured: data.llm_configured ?? false,
      llmProviders: data.llm_providers ?? [],
      proxyReady: data.proxy_ready ?? false,
      googleDeveloperToken: data.google_developer_token ?? false,
      metaConfigured: data.meta_configured ?? false,
      kvAvailable: data.kv_available ?? false,
    };
  } catch {
    return DEFAULT;
  }
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemCapabilities>(cached ?? DEFAULT);
  const [isLoading, setIsLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    cached = null;
    fetchPromise = null;
    setIsLoading(true);
    const result = await fetchConfig();
    cached = result;
    setConfig(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (cached) {
      setConfig(cached);
      setIsLoading(false);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchConfig();
    }
    fetchPromise.then((result) => {
      cached = result;
      setConfig(result);
      setIsLoading(false);
    });
  }, []);

  return { config, isLoading, refresh };
}
