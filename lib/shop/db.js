// Postgres access for the shop, through postgres.js. The app connects to Supabase's transaction pooler (port 6543),
// which needs prepare: false. max_pipeline: 1 avoids a hang on pipelined queries in Supavisor before 2.10.
// Local databases (tests, a local Postgres) use no TLS. Every other host requires TLS.

import { AsyncLocalStorage } from "node:async_hooks";

import postgres from "postgres";

const GLOBAL_KEY = "__lpShopSql";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const transactionStore = new AsyncLocalStorage();

/** Supabase returns timestamptz as text such as "2026-11-21 13:59:00.123+00". The app expects ISO strings. */
function parseTimestamp(raw) {
  return new Date(raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")).toISOString();
}

/** The shop's Postgres client, created once per server process. */
export function getSql() {
  if (!globalThis[GLOBAL_KEY]) {
    const url = process.env.SHOP_DATABASE_URL;
    if (!url) {
      throw new Error("SHOP_DATABASE_URL is not set.");
    }

    globalThis[GLOBAL_KEY] = postgres(url, {
      ssl: LOCAL_HOSTS.has(new URL(url).hostname) ? false : "require",
      prepare: false,
      max: 3,
      max_pipeline: 1,
      idle_timeout: 20,
      transform: {
        undefined: null,
        column: { to: postgres.fromCamel, from: postgres.toCamel },
      },
      types: {
        // Counts and sums come back as bigint or numeric. Paisa totals fit safely in a JavaScript number.
        bigint: { to: 20, from: [20], serialize: (value) => String(value), parse: (value) => Number(value) },
        numeric: { to: 1700, from: [1700], serialize: (value) => String(value), parse: (value) => Number(value) },
        // Business dates stay as YYYY-MM-DD text, so they never shift with the server's time zone.
        date: { to: 1082, from: [1082], serialize: (value) => value, parse: (value) => value },
        timestamptz: { from: [1184], parse: parseTimestamp },
      },
    });
  }
  return globalThis[GLOBAL_KEY];
}

/** The open transaction when one is running, otherwise the pool. Repositories use whichever this returns. */
export function currentDb() {
  return transactionStore.getStore() ?? getSql();
}

// Every shop write runs under this one advisory lock, so writes run one at a time, as they did on SQLite. Each write
// reads the current state and then writes. Without the lock, two writes could both pass the same check.
const WRITE_LOCK_KEY = 20261121;

/**
 * Runs `work` in one transaction, one write at a time, and commits when it resolves. A thrown error rolls everything back.
 * A nested call joins the transaction that is already open, so services can call each other safely.
 */
export function transaction(work) {
  const open = transactionStore.getStore();
  if (open) {
    return work(open);
  }
  return getSql().begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${WRITE_LOCK_KEY}::bigint)`;
    return transactionStore.run(tx, () => work(tx));
  });
}

/** Runs reads in one repeatable-read, read-only transaction, so figures from several queries agree with each other. */
export function snapshot(work) {
  const open = transactionStore.getStore();
  if (open) {
    return work(open);
  }
  return getSql().begin("isolation level repeatable read read only", (tx) => transactionStore.run(tx, () => work(tx)));
}

/** Closes the pool. Scripts and tests call this when they finish, or Node keeps waiting for connections. */
export async function closeSql() {
  const sql = globalThis[GLOBAL_KEY];
  if (sql) {
    delete globalThis[GLOBAL_KEY];
    await sql.end({ timeout: 5 });
  }
}
