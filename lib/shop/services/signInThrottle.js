// Sign-in throttling, kept in the database so every server instance shares the same failure count.

import { currentDb } from "../db.js";
import { hashClientKey, lockoutMinutes, MAX_FAILURES, WINDOW_MS } from "../rateLimit.js";
import {
  deleteLoginFailures,
  deleteOldLoginFailures,
  insertLoginFailure,
  listRecentLoginFailures,
} from "../repositories/loginAttempts.js";

const ONE_DAY_SECONDS = 24 * 60 * 60;

/** Minutes left before this client may try again, or 0 when a sign-in attempt is allowed. */
export async function getSignInLockoutMinutes(clientKey, nowMs = Date.now()) {
  const failures = await listRecentLoginFailures(currentDb(), hashClientKey(clientKey), WINDOW_MS / 1000, MAX_FAILURES);
  return lockoutMinutes(failures, nowMs);
}

/** Records a failed sign-in, then drops failures older than a day. */
export async function recordSignInFailure(clientKey) {
  const db = currentDb();
  await insertLoginFailure(db, hashClientKey(clientKey));
  await deleteOldLoginFailures(db, ONE_DAY_SECONDS);
}

/** Clears this client's failures after a successful sign-in. */
export async function clearSignInFailures(clientKey) {
  await deleteLoginFailures(currentDb(), hashClientKey(clientKey));
}
