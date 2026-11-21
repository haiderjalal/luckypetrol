// Shop configuration read from environment variables.
// Kept free of Node-only imports so middleware (Edge runtime) can use it too.

export const MIN_SESSION_SECRET_LENGTH = 32;

export function getShopUsername() {
  return (process.env.SHOP_USERNAME ?? "").trim();
}

export function getShopPassword() {
  return process.env.SHOP_PASSWORD ?? "";
}

export function getSessionSecret() {
  return process.env.SHOP_SESSION_SECRET ?? "";
}

export function hasValidSessionSecret(secret = getSessionSecret()) {
  return secret.length >= MIN_SESSION_SECRET_LENGTH;
}

export function isShopConfigured() {
  return Boolean(getShopUsername() && getShopPassword() && hasValidSessionSecret());
}

/** Public website address used in share links, without a trailing slash. */
export function getPublicUrl() {
  return (process.env.SHOP_PUBLIC_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
