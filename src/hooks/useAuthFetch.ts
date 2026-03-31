import { useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Authenticated fetch wrapper.
 * Attaches Auth0 Bearer token (access token or ID token fallback)
 * to every request. Falls back to cookie-based auth if token
 * acquisition fails so both auth strategies reach the Go backend.
 */
export function useAuthFetch() {
  const { getAccessTokenSilently } = useAuth();
  const getTokenRef = useRef(getAccessTokenSilently);
  getTokenRef.current = getAccessTokenSilently;

  return useCallback(async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    try {
      const token = await getTokenRef.current();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {
      // token unavailable — request will still include cookies
    }
    return fetch(url, { ...init, headers, credentials: "include" });
  }, []);
}
