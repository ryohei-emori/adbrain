const AUTH0_DOMAIN =
  import.meta.env.VITE_AUTH0_DOMAIN || "adbrain-dev.jp.auth0.com";
const AUTH0_CLIENT_ID =
  import.meta.env.VITE_AUTH0_CLIENT_ID || "yknrxu5sRkJPx2mmxouZCDnyeHLDvPdv";

export const auth0Config = {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
  },
  useRefreshTokens: true,
  cacheLocation: "localstorage" as const,
};

export const isAuth0Configured = !!AUTH0_DOMAIN && !!AUTH0_CLIENT_ID;
