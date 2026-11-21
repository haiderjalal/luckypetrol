import { getDb } from "../db.js";
import { pageCount, paginate } from "../pagination.js";
import { insertAuditEntry, listAuditEntries } from "../repositories/audit.js";

/**
 * Records who changed what and when. Call it inside the same transaction as the change,
 * so the change and its audit entry are saved together or not at all.
 */
export function recordAudit(db, { actor, action, entityType, entityId = null, summary }) {
  insertAuditEntry(db, {
    actor,
    action,
    entity_type: entityType,
    entity_id: entityId === null ? null : String(entityId),
    summary,
    created_at: new Date().toISOString(),
  });
}

export function getAuditLog({ page } = {}) {
  const paging = paginate(page);
  const { rows, total } = listAuditEntries(getDb(), { limit: paging.limit, offset: paging.offset });
  return { rows, total, page: paging.page, pageCount: pageCount(total) };
}
