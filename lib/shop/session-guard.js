// Server-only helpers that read the signed-in user from cookies. Import this only from server code.

import { cookies } from "next/headers";

import { getSessionSecret } from "./config.js";
import { ShopError } from "./errors.js";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session.js";

/** Returns the signed-in user or null. Pages use this to decide whether to redirect to sign-in. */
export async function getSignedInUser() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value, getSessionSecret());
}

/** Throws a ShopError with code "unauthenticated" when nobody is signed in. Every server action calls this. */
export async function requireSignedInUser() {
  const user = await getSignedInUser();
  if (!user) {
    throw new ShopError("Your session has ended. Sign in again to continue.", { code: "unauthenticated" });
  }

  return user;
}
