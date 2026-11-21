// Read-only aggregates for the dashboard and reports. Only issued invoices count as sales.

import { toCamelRows } from "./rows.js";

export function salesSummary(db, from, to) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS invoices, COALESCE(SUM(total_litres), 0) AS litres,
              COALESCE(SUM(total_paisa), 0) AS total_paisa, COALESCE(SUM(tax_paisa), 0) AS tax_paisa
       FROM invoices
       WHERE status = 'issued' AND invoice_date BETWEEN ? AND ?`,
    )
    .get(from, to);

  return {
    invoices: Number(row.invoices),
    litres: Number(row.litres),
    totalPaisa: Number(row.total_paisa),
    taxPaisa: Number(row.tax_paisa),
  };
}

export function salesDaily(db, from, to) {
  return toCamelRows(
    db
      .prepare(
        `SELECT invoice_date AS date, SUM(total_paisa) AS total_paisa, SUM(total_litres) AS litres
         FROM invoices
         WHERE status = 'issued' AND invoice_date BETWEEN ? AND ?
         GROUP BY invoice_date
         ORDER BY invoice_date`,
      )
      .all(from, to),
  );
}

export function litresByProduct(db, from, to) {
  return toCamelRows(
    db
      .prepare(
        `SELECT l.product_code, SUM(l.litres) AS litres, SUM(l.amount_paisa) AS amount_paisa
         FROM invoice_lines l
         JOIN invoices i ON i.id = l.invoice_id
         JOIN products p ON p.code = l.product_code
         WHERE i.status = 'issued' AND i.invoice_date BETWEEN ? AND ?
         GROUP BY l.product_code, p.sort_order
         ORDER BY p.sort_order`,
      )
      .all(from, to),
  );
}

export function salesByCustomerType(db, from, to) {
  return toCamelRows(
    db
      .prepare(
        `SELECT c.customer_type, COUNT(i.id) AS invoices, SUM(i.total_litres) AS litres, SUM(i.total_paisa) AS total_paisa
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
         WHERE i.status = 'issued' AND i.invoice_date BETWEEN ? AND ?
         GROUP BY c.customer_type
         ORDER BY total_paisa DESC`,
      )
      .all(from, to),
  );
}

export function topCustomers(db, from, to, limit) {
  return toCamelRows(
    db
      .prepare(
        `SELECT c.id AS customer_id, c.code, c.name, SUM(i.total_litres) AS litres, SUM(i.total_paisa) AS total_paisa
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
         WHERE i.status = 'issued' AND i.invoice_date BETWEEN ? AND ?
         GROUP BY c.id
         ORDER BY total_paisa DESC
         LIMIT ?`,
      )
      .all(from, to, limit),
  );
}

export function collectionsByMethod(db, from, to) {
  return toCamelRows(
    db
      .prepare(
        `SELECT method, COUNT(*) AS receipts, SUM(amount_paisa) AS amount_paisa
         FROM payments
         WHERE status = 'posted' AND received_on BETWEEN ? AND ?
         GROUP BY method
         ORDER BY amount_paisa DESC`,
      )
      .all(from, to),
  );
}

/** Delivered orders with no issued invoice yet: earned but not billed. */
export function deliveredNotInvoicedCount(db) {
  return Number(
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM orders o
         WHERE o.status = 'delivered'
           AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id AND i.status = 'issued')`,
      )
      .get().total,
  );
}

export function orderStatusCounts(db) {
  return toCamelRows(db.prepare("SELECT status, COUNT(*) AS total FROM orders GROUP BY status").all());
}
