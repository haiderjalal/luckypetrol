// Sign-in throttle rules: five failed attempts in 15 minutes lock that client out until the oldest of them expires.
// Only the rules and the key hashing live here. Failures are stored in shop.login_attempts (see services/signInThrottle.js),
// so every server instance counts the same failures.

import { createHash } from "node:crypto";

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** Minutes left before this client may try again, or 0 when a sign-in attempt is allowed. Times are in milliseconds. */
export function lockoutMinutes(failureTimesMs, nowMs = Date.now()) {
  const newestFirst = [...failureTimesMs].sort((a, b) => b - a);
  const recent = newestFirst.filter((time) => nowMs - time < WINDOW_MS);
  if (recent.length < MAX_FAILURES) {
    return 0;
  }

  const unlockAt = recent[MAX_FAILURES - 1] + WINDOW_MS;
  return Math.max(1, Math.ceil((unlockAt - nowMs) / 60000));
}

/** Stores a hash of the client address and username, so the table holds no raw personal data. */
export function hashClientKey(rawKey) {
  return createHash("sha256").update(rawKey).digest("hex");
}
