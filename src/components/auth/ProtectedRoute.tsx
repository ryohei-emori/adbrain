import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, type ReactNode } from "react";

const ONBOARDED_KEY = "adbrain_onboarded";

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "1");
}

export function resetOnboarded() {
  localStorage.removeItem(ONBOARDED_KEY);
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const loginTriggered = useRef(false);

  const hasConnectResult =
    searchParams.has("connected") || searchParams.has("connect_error");

  useEffect(() => {
    if (!isLoading && !isAuthenticated && hasConnectResult && !loginTriggered.current) {
      loginTriggered.current = true;
      const returnPath = location.pathname + location.search;
      loginWithRedirect({ appState: { returnTo: returnPath } });
    }
  }, [isLoading, isAuthenticated, hasConnectResult, loginWithRedirect, location]);

  if (searchParams.get("reset_onboarding") === "1") {
    resetOnboarded();
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoading || (hasConnectResult && !isAuthenticated)) {
    return (
      <div className="flex items-center justify-center h-dvh bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isOnboarded() && !location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
