// Document numbers. Each sequence is a row in the `counters` table, incremented inside the caller's transaction,
// so numbers never repeat and never skip because of a failed save.

import { fiscalYearLabel } from "./dates.js";

/** Increments the named counter and returns the new value. Call inside a transaction. */
export function nextSequence(db, key) {
  db.prepare("INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1").run(key);
  return Number(db.prepare("SELECT value FROM counters WHERE key = ?").get(key).value);
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

export function nextCustomerCode(db) {
  return `CU-${pad(nextSequence(db, "customer"), 4)}`;
}

export function nextOrderNumber(db) {
  return `ORD-${pad(nextSequence(db, "order"), 6)}`;
}

export function nextDeliveryNumber(db) {
  return `DN-${pad(nextSequence(db, "delivery"), 6)}`;
}

export function nextReceiptNumber(db) {
  return `RCT-${pad(nextSequence(db, "receipt"), 6)}`;
}

/** Invoices restart each financial year: "LP/2026-27/0001". */
export function nextInvoiceNumber(db, { prefix, invoiceDate }) {
  const fiscalYear = fiscalYearLabel(invoiceDate);
  const sequence = nextSequence(db, `invoice:${fiscalYear}`);
  return `${prefix}/${fiscalYear}/${pad(sequence, 4)}`;
}
