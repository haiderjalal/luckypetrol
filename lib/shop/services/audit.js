import { currentDb } from "../db.js";
import { pageCount, paginate } from "../pagination.js";
import { insertAuditEntry, listAuditEntries } from "../repositories/audit.js";

/**
 * Records who changed what and when. Call it inside the same transaction as the change,
 * so the change and its audit entry are saved together or not at all.
 */
export async function recordAudit(db, { actor, action, entityType, entityId = null, summary }) {
  await insertAuditEntry(db, {
    actor,
    action,
    entity_type: entityType,
    entity_id: entityId === null ? null : String(entityId),
    summary,
  });
}

export async function getAuditLog({ page } = {}) {
  const db = currentDb();
  const paging = paginate(page);
  const { rows, total } = await listAuditEntries(db, { limit: paging.limit, offset: paging.offset });
  return { rows, total, page: paging.page, pageCount: pageCount(total) };
}
