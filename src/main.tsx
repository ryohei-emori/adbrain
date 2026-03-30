import React, { useCallback } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./App";
import { auth0Config, isAuth0Configured } from "./lib/auth0";
import "./index.css";

function Auth0RouterProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const onRedirectCallback = useCallback(
    (appState?: AppState) => {
      navigate(appState?.returnTo || "/dashboard", { replace: true });
    },
    [navigate],
  );

  if (!isAuth0Configured) return <>{children}</>;

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={auth0Config.authorizationParams}
      useRefreshTokens={auth0Config.useRefreshTokens}
      cacheLocation={auth0Config.cacheLocation}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}

function Root() {
  return (
    <BrowserRouter>
      <Auth0RouterProvider>
        <App />
        <Analytics />
        <SpeedInsights />
      </Auth0RouterProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
