export async function insertAuditEntry(db, values) {
  const [{ id }] = await db`insert into shop.audit_log ${db(values)} returning id`;
  return Number(id);
}

export async function listAuditEntries(db, { limit, offset }) {
  const [{ total }] = await db`select count(*) as total from shop.audit_log`;
  const rows = await db`
    select id, actor, action, entity_type, entity_id, summary, created_at
    from shop.audit_log
    order by id desc
    limit ${limit} offset ${offset}`;

  return { rows: [...rows], total: Number(total) };
}
