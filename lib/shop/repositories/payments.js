import { insertInto, likePattern, toCamelRow, toCamelRows, updateRow } from "./rows.js";

const PAYMENT_SELECT_SQL = `
  SELECT p.id, p.receipt_no, p.customer_id, p.amount_paisa, p.method, p.reference, p.bank_name,
         p.received_on, p.status, p.notes, p.void_reason, p.voided_at, p.created_by, p.created_at,
         c.name AS customer_name, c.code AS customer_code,
         COALESCE((SELECT SUM(a.amount_paisa) FROM payment_allocations a WHERE a.payment_id = p.id), 0) AS allocated_paisa
  FROM payments p
  JOIN customers c ON c.id = p.customer_id`;

export function insertPayment(db, values) {
  return insertInto(db, "payments", values);
}

export function insertAllocation(db, values) {
  return insertInto(db, "payment_allocations", values);
}

export function findPaymentRow(db, id) {
  return toCamelRow(db.prepare(`${PAYMENT_SELECT_SQL} WHERE p.id = ?`).get(id));
}

export function paymentAllocations(db, paymentId) {
  return toCamelRows(
    db
      .prepare(
        `SELECT a.id, a.invoice_id, a.amount_paisa, i.invoice_no, i.invoice_date
         FROM payment_allocations a
         JOIN invoices i ON i.id = a.invoice_id
         WHERE a.payment_id = ?
         ORDER BY a.id`,
      )
      .all(paymentId),
  );
}

export function allocatedForPayment(db, paymentId) {
  return Number(
    db.prepare("SELECT COALESCE(SUM(amount_paisa), 0) AS allocated FROM payment_allocations WHERE payment_id = ?").get(paymentId).allocated,
  );
}

export function deleteAllocationsForPayment(db, paymentId) {
  return db.prepare("DELETE FROM payment_allocations WHERE payment_id = ?").run(paymentId).changes;
}

export function setPaymentVoided(db, id, reason, voidedAt) {
  return updateRow(db, "payments", id, { status: "voided", void_reason: reason, voided_at: voidedAt });
}

export function listPaymentRows(db, { customerId = null, method = "", status = "", from = "", to = "", search = "", limit, offset }) {
  const clauses = [];
  const params = [];

  if (customerId) {
    clauses.push("p.customer_id = ?");
    params.push(customerId);
  }
  if (method) {
    clauses.push("p.method = ?");
    params.push(method);
  }
  if (status) {
    clauses.push("p.status = ?");
    params.push(status);
  }
  if (from) {
    clauses.push("p.received_on >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("p.received_on <= ?");
    params.push(to);
  }
  if (search) {
    clauses.push("(p.receipt_no LIKE ? ESCAPE '\\' OR p.reference LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')");
    const pattern = likePattern(search);
    params.push(pattern, pattern, pattern);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = Number(
    db.prepare(`SELECT COUNT(*) AS total FROM payments p JOIN customers c ON c.id = p.customer_id ${where}`).get(...params).total,
  );
  const rows = db
    .prepare(`${PAYMENT_SELECT_SQL} ${where} ORDER BY p.received_on DESC, p.id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return { rows: toCamelRows(rows), total };
}

/** Posted payments that still have money not applied to an invoice (advances), oldest first. */
export function unallocatedPaymentsForCustomer(db, customerId) {
  return toCamelRows(
    db
      .prepare(
        `SELECT p.id, p.receipt_no, p.received_on, p.amount_paisa,
                p.amount_paisa - COALESCE(SUM(a.amount_paisa), 0) AS unallocated_paisa
         FROM payments p
         LEFT JOIN payment_allocations a ON a.payment_id = p.id
         WHERE p.customer_id = ? AND p.status = 'posted'
         GROUP BY p.id
         HAVING p.amount_paisa - COALESCE(SUM(a.amount_paisa), 0) > 0
         ORDER BY p.received_on, p.id`,
      )
      .all(customerId),
  );
}

/** Unapplied advances for every customer, used by the aging report. */
export function unallocatedTotalsByCustomer(db) {
  return toCamelRows(
    db
      .prepare(
        `SELECT p.customer_id, SUM(p.amount_paisa - COALESCE(x.allocated, 0)) AS unallocated_paisa
         FROM payments p
         LEFT JOIN (SELECT payment_id, SUM(amount_paisa) AS allocated FROM payment_allocations GROUP BY payment_id) x
           ON x.payment_id = p.id
         WHERE p.status = 'posted'
         GROUP BY p.customer_id`,
      )
      .all(),
  );
}
