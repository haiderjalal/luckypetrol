// Signed session tokens. Uses Web Crypto only, so the same code runs in middleware (Edge) and in Node.
// Token format: base64url(payload) + "." + base64url(HMAC-SHA256(payload, secret)).

export const SESSION_COOKIE_NAME = "lp_shop_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param {{ username: string, secret: string, nowMs?: number }} input
 * @returns {Promise<string>}
 */
export async function createSessionToken({ username, secret, nowMs = Date.now() }) {
  const payload = { u: username, exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS };
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/**
 * Returns the signed-in username, or null when the token is missing, tampered with or expired.
 * @returns {Promise<{ username: string, expiresAt: number } | null>}
 */
export async function verifySessionToken(token, secret, nowMs = Date.now()) {
  if (typeof token !== "string" || !secret) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [body, signature] = parts;
  try {
    // Only one string may encode each signature. Otherwise trailing bits can be changed without changing the bytes checked.
    const signatureBytes = base64UrlToBytes(signature);
    if (bytesToBase64Url(signatureBytes) !== signature) {
      return null;
    }

    const key = await importSigningKey(secret);
    const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(body));
    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(base64UrlToBytes(body)));
    if (typeof payload?.u !== "string" || typeof payload?.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 <= nowMs) {
      return null;
    }

    return { username: payload.u, expiresAt: payload.exp };
  } catch {
    // A malformed cookie is treated as signed out; it is not an error worth logging.
    return null;
  }
}

function importSigningKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
