// In-memory sign-in throttle: five failed attempts in 15 minutes locks that client out until the oldest one expires.
// Good for one server process. Use a shared store if the shop ever runs on several instances.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const STORE_KEY = "__lpShopLoginFailures";

function failureStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }
  return globalThis[STORE_KEY];
}

function recentFailures(key, nowMs) {
  const store = failureStore();
  const recent = (store.get(key) ?? []).filter((time) => nowMs - time < WINDOW_MS);
  if (recent.length > 0) {
    store.set(key, recent);
  } else {
    store.delete(key);
  }
  return recent;
}

/** Minutes left before this client may try again, or 0 when a sign-in attempt is allowed. */
export function getLockoutMinutes(key, nowMs = Date.now()) {
  const recent = recentFailures(key, nowMs);
  if (recent.length < MAX_FAILURES) {
    return 0;
  }

  const unlockAt = recent[recent.length - MAX_FAILURES] + WINDOW_MS;
  return Math.max(1, Math.ceil((unlockAt - nowMs) / 60000));
}

export function recordLoginFailure(key, nowMs = Date.now()) {
  const recent = recentFailures(key, nowMs);
  recent.push(nowMs);
  failureStore().set(key, recent);
}

export function clearLoginFailures(key) {
  failureStore().delete(key);
}
