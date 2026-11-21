import { insertInto, likePattern, toCamelRow, toCamelRows, updateRow } from "./rows.js";

const ORDER_DETAIL_SQL = `
  SELECT o.id, o.order_no, o.customer_id, o.site_id, o.delivery_address, o.delivery_date,
         o.window_start, o.window_end, o.source, o.status, o.total_litres, o.estimated_paisa,
         o.notes, o.credit_override_note, o.cancel_reason, o.created_by, o.created_at, o.updated_at,
         c.name AS customer_name, c.code AS customer_code, c.customer_type, c.status AS customer_status,
         c.whatsapp AS customer_whatsapp, c.phone AS customer_phone, c.contact_person AS customer_contact,
         c.address AS customer_address, c.ntn AS customer_ntn, c.strn AS customer_strn,
         c.credit_limit_paisa, c.payment_terms_days
  FROM orders o
  JOIN customers c ON c.id = o.customer_id`;

export function findOrderRow(db, id) {
  return toCamelRow(db.prepare(`${ORDER_DETAIL_SQL} WHERE o.id = ?`).get(id));
}

export function orderItems(db, orderId) {
  return toCamelRows(
    db
      .prepare(
        `SELECT id, order_id, product_code, ordered_litres, delivered_litres,
                list_rate_paisa, discount_paisa, rate_paisa
         FROM order_items WHERE order_id = ? ORDER BY id`,
      )
      .all(orderId),
  );
}

export function insertOrder(db, values) {
  return insertInto(db, "orders", values);
}

export function insertOrderItem(db, values) {
  return insertInto(db, "order_items", values);
}

export function setOrderStatus(db, id, status, updatedAt) {
  return updateRow(db, "orders", id, { status, updated_at: updatedAt });
}

export function setOrderCreditNote(db, id, note, updatedAt) {
  return updateRow(db, "orders", id, { credit_override_note: note, updated_at: updatedAt });
}

export function setOrderCancelled(db, id, reason, updatedAt) {
  return updateRow(db, "orders", id, { status: "cancelled", cancel_reason: reason, updated_at: updatedAt });
}

export function setItemDelivered(db, itemId, deliveredLitres) {
  return updateRow(db, "order_items", itemId, { delivered_litres: deliveredLitres });
}

export function listOrders(db, { status = "", customerId = null, search = "", from = "", to = "", limit, offset }) {
  const clauses = [];
  const params = [];

  if (from) {
    clauses.push("o.delivery_date >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("o.delivery_date <= ?");
    params.push(to);
  }

  if (status) {
    clauses.push("o.status = ?");
    params.push(status);
  }
  if (customerId) {
    clauses.push("o.customer_id = ?");
    params.push(customerId);
  }
  if (search) {
    clauses.push("(o.order_no LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')");
    const pattern = likePattern(search);
    params.push(pattern, pattern);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = Number(
    db.prepare(`SELECT COUNT(*) AS total FROM orders o JOIN customers c ON c.id = o.customer_id ${where}`).get(...params).total,
  );
  const rows = db
    .prepare(
      `SELECT o.id, o.order_no, o.customer_id, o.delivery_date, o.window_start, o.window_end,
              o.source, o.status, o.total_litres, o.estimated_paisa, o.created_at,
              c.name AS customer_name, c.customer_type,
              (SELECT COUNT(*) FROM invoices i WHERE i.order_id = o.id AND i.status = 'issued') AS invoice_count
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ${where}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);

  return { rows: toCamelRows(rows), total };
}

/**
 * Estimated value of a customer's confirmed orders that are not yet invoiced.
 * Counted against the credit limit so that several orders cannot exceed it together.
 */
export function openOrderExposurePaisa(db, customerId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(o.estimated_paisa), 0) AS exposure
       FROM orders o
       WHERE o.customer_id = ?
         AND o.status IN ('confirmed', 'dispatched', 'delivered')
         AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id AND i.status = 'issued')`,
    )
    .get(customerId);
  return Number(row.exposure);
}
