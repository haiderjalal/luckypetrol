import { toCamelRows } from "./rows.js";

export function listSettingRows(db) {
  return toCamelRows(db.prepare("SELECT key, value FROM settings").all());
}

export function upsertSetting(db, key, value, updatedAt) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value, updatedAt);
}
