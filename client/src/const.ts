export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://api.manus.im";
  const appId = import.meta.env.VITE_APP_ID || "rodotransfer-app";
  
  if (!oauthPortalUrl || !appId ) {
    console.error("[Auth] Missing required environment variables:", {
      VITE_OAUTH_PORTAL_URL: oauthPortalUrl,
      VITE_APP_ID: appId,
    });
    throw new Error("Missing required environment variables for OAuth");
  }
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error("[Auth] Failed to construct login URL:", error);
    throw error;
  }
};
