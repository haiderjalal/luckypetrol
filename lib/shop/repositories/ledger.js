// The customer ledger. Every invoice, payment, cancellation and void is posted here, and the balance is the sum of it.
// Positive balance = the customer owes money. Negative balance = advance paid.

import { insertInto, toCamelRows } from "./rows.js";

export function insertLedgerEntry(db, values) {
  return insertInto(db, "ledger_entries", values);
}

export function customerBalancePaisa(db, customerId) {
  const row = db
    .prepare("SELECT COALESCE(SUM(debit_paisa) - SUM(credit_paisa), 0) AS balance FROM ledger_entries WHERE customer_id = ?")
    .get(customerId);
  return Number(row.balance);
}

export function balanceBeforeDate(db, customerId, date) {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(debit_paisa) - SUM(credit_paisa), 0) AS balance FROM ledger_entries WHERE customer_id = ? AND entry_date < ?",
    )
    .get(customerId, date);
  return Number(row.balance);
}

export function customerEntriesBetween(db, customerId, from, to) {
  return toCamelRows(
    db
      .prepare(
        `SELECT id, entry_date, entry_type, reference, description, debit_paisa, credit_paisa
         FROM ledger_entries
         WHERE customer_id = ? AND entry_date >= ? AND entry_date <= ?
         ORDER BY entry_date, id`,
      )
      .all(customerId, from, to),
  );
}

export function allEntriesBetween(db, from, to) {
  return toCamelRows(
    db
      .prepare(
        `SELECT e.id, e.entry_date, e.entry_type, e.reference, e.description, e.debit_paisa, e.credit_paisa,
                c.code AS customer_code, c.name AS customer_name, e.customer_id
         FROM ledger_entries e
         JOIN customers c ON c.id = e.customer_id
         WHERE e.entry_date >= ? AND e.entry_date <= ?
         ORDER BY c.name COLLATE NOCASE, e.entry_date, e.id`,
      )
      .all(from, to),
  );
}

export function balancesByCustomer(db) {
  return toCamelRows(
    db
      .prepare("SELECT customer_id, SUM(debit_paisa) - SUM(credit_paisa) AS balance_paisa FROM ledger_entries GROUP BY customer_id")
      .all(),
  );
}
