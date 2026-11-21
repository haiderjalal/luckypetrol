import { insertInto, toCamelRows } from "./rows.js";

export function insertAuditEntry(db, values) {
  return insertInto(db, "audit_log", values);
}

export function listAuditEntries(db, { limit, offset }) {
  const total = Number(db.prepare("SELECT COUNT(*) AS total FROM audit_log").get().total);
  const rows = toCamelRows(
    db
      .prepare("SELECT id, actor, action, entity_type, entity_id, summary, created_at FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?")
      .all(limit, offset),
  );

  return { rows, total };
}
