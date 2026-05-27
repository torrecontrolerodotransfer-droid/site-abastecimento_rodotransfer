export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = "https://api.manus.im";
  const appId = "rodotransfer-app";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri );

  return `${oauthPortalUrl}/app-auth?appId=${appId}&redirectUri=${encodeURIComponent(redirectUri)}&state=${state}&type=signIn`;
};
