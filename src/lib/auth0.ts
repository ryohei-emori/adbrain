export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? "",
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? "",
  authorizationParams: {
    redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
    audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? "",
  },
  useRefreshTokens: true,
  cacheLocation: "localstorage" as const,
};

export const isAuth0Configured =
  !!import.meta.env.VITE_AUTH0_DOMAIN && !!import.meta.env.VITE_AUTH0_CLIENT_ID;
