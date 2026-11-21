import { insertInto, likePattern, toCamelRow, toCamelRows, updateRow } from "./rows.js";

// Invoices with the amount already paid and the payment state, as a derived table.
const INVOICE_STATE_SQL = `
  SELECT i.id, i.invoice_no, i.order_id, i.customer_id, i.invoice_date, i.due_date, i.status,
         i.total_litres, i.subtotal_paisa, i.tax_paisa, i.total_paisa, i.created_at,
         c.name AS customer_name, c.customer_type,
         COALESCE(a.paid_paisa, 0) AS paid_paisa,
         CASE
           WHEN i.status = 'cancelled' THEN 'cancelled'
           WHEN COALESCE(a.paid_paisa, 0) = 0 THEN 'unpaid'
           WHEN COALESCE(a.paid_paisa, 0) < i.total_paisa THEN 'partial'
           ELSE 'paid'
         END AS payment_state
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  LEFT JOIN (
    SELECT invoice_id, SUM(amount_paisa) AS paid_paisa FROM payment_allocations GROUP BY invoice_id
  ) a ON a.invoice_id = i.id`;

const INVOICE_DETAIL_SQL = `
  SELECT i.*, c.name AS customer_name, c.customer_type, c.whatsapp AS customer_whatsapp,
         c.contact_person AS customer_contact, c.phone AS customer_phone,
         o.order_no, o.delivery_address, o.delivery_date,
         COALESCE((SELECT SUM(a.amount_paisa) FROM payment_allocations a WHERE a.invoice_id = i.id), 0) AS paid_paisa
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  JOIN orders o ON o.id = i.order_id`;

export function insertInvoice(db, values) {
  return insertInto(db, "invoices", values);
}

export function insertInvoiceLine(db, values) {
  return insertInto(db, "invoice_lines", values);
}

export function findInvoiceRow(db, id) {
  return toCamelRow(db.prepare(`${INVOICE_DETAIL_SQL} WHERE i.id = ?`).get(id));
}

export function findInvoiceByToken(db, token) {
  return toCamelRow(db.prepare(`${INVOICE_DETAIL_SQL} WHERE i.share_token = ?`).get(token));
}

export function invoiceLines(db, invoiceId) {
  return toCamelRows(
    db.prepare("SELECT id, product_code, litres, rate_paisa, amount_paisa FROM invoice_lines WHERE invoice_id = ? ORDER BY id").all(invoiceId),
  );
}

export function invoiceAllocations(db, invoiceId) {
  return toCamelRows(
    db
      .prepare(
        `SELECT a.id, a.amount_paisa, a.payment_id, p.receipt_no, p.received_on, p.method, p.reference
         FROM payment_allocations a
         JOIN payments p ON p.id = a.payment_id
         WHERE a.invoice_id = ?
         ORDER BY p.received_on, a.id`,
      )
      .all(invoiceId),
  );
}

export function invoicesForOrder(db, orderId) {
  return toCamelRows(
    db.prepare("SELECT id, invoice_no, invoice_date, status, total_paisa, cancel_reason FROM invoices WHERE order_id = ? ORDER BY id").all(orderId),
  );
}

export function activeInvoiceForOrder(db, orderId) {
  return toCamelRow(
    db.prepare("SELECT id, invoice_no, total_paisa FROM invoices WHERE order_id = ? AND status = 'issued'").get(orderId),
  );
}

/** Issued invoices that still have money owing, oldest due date first. Used to allocate payments (FIFO). */
export function openInvoicesForCustomer(db, customerId) {
  return toCamelRows(
    db
      .prepare(
        `SELECT x.id, x.invoice_no, x.invoice_date, x.due_date, x.total_paisa, x.paid_paisa,
                x.total_paisa - x.paid_paisa AS outstanding_paisa
         FROM (${INVOICE_STATE_SQL}) x
         WHERE x.customer_id = ? AND x.status = 'issued' AND x.payment_state IN ('unpaid', 'partial')
         ORDER BY x.due_date, x.invoice_date, x.id`,
      )
      .all(customerId),
  );
}

/** Every open invoice across customers, for aging reports. */
export function openInvoicesForAging(db) {
  return toCamelRows(
    db
      .prepare(
        `SELECT x.id, x.invoice_no, x.customer_id, x.customer_name, x.customer_type, x.due_date,
                x.total_paisa - x.paid_paisa AS outstanding_paisa
         FROM (${INVOICE_STATE_SQL}) x
         WHERE x.status = 'issued' AND x.payment_state IN ('unpaid', 'partial')`,
      )
      .all(),
  );
}

export function listInvoiceRows(db, { customerId = null, status = "", paymentState = "", from = "", to = "", search = "", limit, offset }) {
  const clauses = [];
  const params = [];

  if (customerId) {
    clauses.push("x.customer_id = ?");
    params.push(customerId);
  }
  if (status) {
    clauses.push("x.status = ?");
    params.push(status);
  }
  if (paymentState) {
    clauses.push("x.payment_state = ?");
    params.push(paymentState);
  }
  if (from) {
    clauses.push("x.invoice_date >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("x.invoice_date <= ?");
    params.push(to);
  }
  if (search) {
    clauses.push("(x.invoice_no LIKE ? ESCAPE '\\' OR x.customer_name LIKE ? ESCAPE '\\')");
    const pattern = likePattern(search);
    params.push(pattern, pattern);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = Number(db.prepare(`SELECT COUNT(*) AS total FROM (${INVOICE_STATE_SQL}) x ${where}`).get(...params).total);
  const rows = db
    .prepare(`SELECT x.* FROM (${INVOICE_STATE_SQL}) x ${where} ORDER BY x.invoice_date DESC, x.id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return { rows: toCamelRows(rows), total };
}

export function setInvoiceCancelled(db, id, reason, cancelledAt) {
  return updateRow(db, "invoices", id, { status: "cancelled", cancel_reason: reason, cancelled_at: cancelledAt });
}
