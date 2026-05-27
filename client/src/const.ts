export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (): string => {
  try {
    const oauthPortalUrl = "https://api.manus.im";
    const appId = "rodotransfer-app";
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const params = new URLSearchParams({
      appId,
      redirectUri,
      state,
      type: "signIn",
    });

    return `${oauthPortalUrl}/app-auth?${params.toString()}`;
  } catch (error) {
    console.error("[Auth] Error constructing login URL:", error);
    return "https://api.manus.im/app-auth";
  }
};
