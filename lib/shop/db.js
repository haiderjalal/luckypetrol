// SQLite access through Node's built-in node:sqlite (Node 22.13 or newer). No native build step is needed.
// Sync API: every service call runs inside one database call, so transactions are simple and safe.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { MIGRATIONS } from "./migrations.js";

const GLOBAL_KEY = "__lpShopDatabase";
let transactionDepth = 0;

/** SHOP_DB_PATH overrides the default file. Tests use ":memory:". */
export function getDatabasePath() {
  return process.env.SHOP_DB_PATH || join(process.cwd(), "data", "shop.sqlite");
}

/** Opens the database once per process and applies any pending migrations. */
export function getDb() {
  if (!globalThis[GLOBAL_KEY]) {
    const file = getDatabasePath();
    if (file !== ":memory:") {
      mkdirSync(dirname(file), { recursive: true });
    }

    const db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (file !== ":memory:") {
      db.exec("PRAGMA journal_mode = WAL;");
    }

    migrate(db);
    globalThis[GLOBAL_KEY] = db;
  }

  return globalThis[GLOBAL_KEY];
}

/**
 * Runs `work` inside BEGIN IMMEDIATE ... COMMIT. Nested calls join the outer transaction.
 * Any thrown error rolls everything back.
 */
export function transaction(work) {
  const db = getDb();
  if (transactionDepth > 0) {
    return work(db);
  }

  db.exec("BEGIN IMMEDIATE");
  transactionDepth += 1;
  try {
    const result = work(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    transactionDepth -= 1;
  }
}

function migrate(db) {
  const { user_version: currentVersion } = db.prepare("PRAGMA user_version").get();

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
