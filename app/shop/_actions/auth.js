"use server";

import { cookies, headers } from "next/headers";

import { getSessionSecret, getShopUsername, isShopConfigured } from "@/lib/shop/config.js";
import { verifyCredentials } from "@/lib/shop/credentials.js";
import { logger } from "@/lib/shop/logger.js";
import { clearSignInFailures, getSignInLockoutMinutes, recordSignInFailure } from "@/lib/shop/services/signInThrottle.js";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/shop/session.js";

const DEFAULT_LANDING_PATH = "/shop";

/** Only same-site paths inside /shop may be used after sign-in, which blocks open redirects. */
function safeNextPath(value) {
  if (typeof value !== "string" || !value.startsWith("/shop") || value.startsWith("/shop/login") || value.includes("\\")) {
    return DEFAULT_LANDING_PATH;
  }
  return value;
}

async function clientKey(username) {
  const store = await headers();
  const address = store.get("x-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || "direct";
  return `${address.slice(0, 64)}|${username.toLowerCase()}`;
}

export async function loginAction(input) {
  if (!isShopConfigured()) {
    return {
      ok: false,
      message: "The shop is not set up yet. Add SHOP_USERNAME, SHOP_PASSWORD and a SHOP_SESSION_SECRET of at least 32 characters.",
    };
  }

  const username = String(input?.username ?? "").trim();
  const password = String(input?.password ?? "");
  if (!username || !password) {
    return { ok: false, message: "Enter your username and password." };
  }

  const key = await clientKey(username);
  const minutesLeft = await getSignInLockoutMinutes(key);
  if (minutesLeft > 0) {
    return { ok: false, message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` };
  }

  const isValid = await verifyCredentials(username, password);
  if (!isValid) {
    await recordSignInFailure(key);
    logger.info("Shop sign-in failed");
    return { ok: false, message: "That username or password is not correct." };
  }

  await clearSignInFailures(key);
  const token = await createSessionToken({ username: getShopUsername(), secret: getSessionSecret() });
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  logger.info("Shop sign-in succeeded");
  return { ok: true, redirectTo: safeNextPath(input?.next) };
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  return { ok: true, redirectTo: "/shop/login" };
}
