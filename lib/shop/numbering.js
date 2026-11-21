// Document numbers. Each sequence is a row in shop.counters, incremented inside the caller's transaction,
// so numbers never repeat and a failed save does not leave a gap.

import { fiscalYearLabel } from "./dates.js";

/** Increments the named counter and returns the new value. Call inside a transaction. */
export async function nextSequence(db, key) {
  const [row] = await db`
    insert into shop.counters (key, value) values (${key}, 1)
    on conflict (key) do update set value = shop.counters.value + 1
    returning value`;
  return Number(row.value);
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

export async function nextCustomerCode(db) {
  return `CU-${pad(await nextSequence(db, "customer"), 4)}`;
}

export async function nextOrderNumber(db) {
  return `ORD-${pad(await nextSequence(db, "order"), 6)}`;
}

export async function nextDeliveryNumber(db) {
  return `DN-${pad(await nextSequence(db, "delivery"), 6)}`;
}

export async function nextReceiptNumber(db) {
  return `RCT-${pad(await nextSequence(db, "receipt"), 6)}`;
}

/** Invoices restart each financial year: "LP/2026-27/0001". */
export async function nextInvoiceNumber(db, { prefix, invoiceDate }) {
  const fiscalYear = fiscalYearLabel(invoiceDate);
  const sequence = await nextSequence(db, `invoice:${fiscalYear}`);
  return `${prefix}/${fiscalYear}/${pad(sequence, 4)}`;
}
