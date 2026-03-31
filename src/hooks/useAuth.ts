import { useState, useCallback, useMemo } from "react";
import { useAuth0 as useAuth0Sdk } from "@auth0/auth0-react";
import { isAuth0Configured } from "@/lib/auth0";

interface AuthUser {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

interface LoginOptions {
  appState?: { returnTo?: string };
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  loginWithRedirect: (opts?: LoginOptions) => void;
  logout: () => void;
  getAccessTokenSilently: () => Promise<string>;
}

const MOCK_USER: AuthUser = {
  sub: "mock|12345",
  name: "Sarah Chen",
  email: "sarah@demo.adbrain.dev",
  picture: "https://api.dicebear.com/7.x/initials/svg?seed=SC&backgroundColor=2563eb",
};

function useMockAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const loginWithRedirect = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const getAccessTokenSilently = useCallback(async () => {
    return "mock-access-token";
  }, []);

  return useMemo(
    () => ({
      isAuthenticated,
      isLoading: false,
      user: isAuthenticated ? MOCK_USER : null,
      loginWithRedirect,
      logout,
      getAccessTokenSilently,
    }),
    [isAuthenticated, loginWithRedirect, logout, getAccessTokenSilently],
  );
}

function useRealAuth(): AuthState {
  const auth0 = useAuth0Sdk();
  return useMemo(
    () => ({
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      user: auth0.user
        ? {
            sub: auth0.user.sub ?? "",
            name: auth0.user.name ?? "",
            email: auth0.user.email ?? "",
            picture: auth0.user.picture ?? "",
          }
        : null,
      loginWithRedirect: (opts?: LoginOptions) =>
        auth0.loginWithRedirect({ appState: opts?.appState }),
      logout: () => auth0.logout({ logoutParams: { returnTo: window.location.origin } }),
      getAccessTokenSilently: async () => {
        try {
          return await auth0.getAccessTokenSilently();
        } catch (e) {
          console.warn("[useAuth] getAccessTokenSilently failed, trying ID token fallback:", e);
          try {
            const claims = await auth0.getIdTokenClaims();
            if (claims?.__raw) return claims.__raw;
          } catch (e2) {
            console.error("[useAuth] ID token fallback also failed:", e2);
          }
          throw e;
        }
      },
    }),
    [auth0],
  );
}

export function useAuth(): AuthState {
  if (isAuth0Configured) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRealAuth();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMockAuth();
}
