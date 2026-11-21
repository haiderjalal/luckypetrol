// Customer ledger and aging. Positive balance means the customer owes money; negative means they have an advance.

import { AGING_BUCKETS, agingBucket, daysBetween, isIsoDate, todayIso } from "../dates.js";
import { currentDb } from "../db.js";
import { notFoundError } from "../errors.js";
import { findCustomerById } from "../repositories/customers.js";
import { openInvoicesForAging } from "../repositories/invoices.js";
import {
  balanceBeforeDate,
  customerBalancePaisa,
  customerEntriesBetween,
  insertLedgerEntry,
} from "../repositories/ledger.js";
import { unallocatedTotalsByCustomer } from "../repositories/payments.js";

/** Adds one posting to the ledger. Call it inside the caller's transaction. Pass either debit or credit, never both. */
export async function postLedgerEntry(db, { customerId, entryDate, entryType, reference, description, debitPaisa = 0, creditPaisa = 0 }) {
  return insertLedgerEntry(db, {
    customer_id: customerId,
    entry_date: entryDate,
    entry_type: entryType,
    reference,
    description,
    debit_paisa: debitPaisa,
    credit_paisa: creditPaisa,
  });
}

export async function getCustomerBalance(customerId) {
  const db = currentDb();
  return customerBalancePaisa(db, customerId);
}

/** Statement for one customer between two dates, with a running balance. */
export async function getStatement(customerId, { from = "", to = "" } = {}) {
  const db = currentDb();
  const customer = await findCustomerById(db, customerId);
  if (!customer) {
    throw notFoundError("Customer");
  }

  const end = isIsoDate(to) ? to : todayIso();
  const start = isIsoDate(from) ? from : "0001-01-01";
  const openingPaisa = isIsoDate(from) ? await balanceBeforeDate(db, customerId, from) : 0;

  let running = openingPaisa;
  let debitPaisa = 0;
  let creditPaisa = 0;
  const entries = await customerEntriesBetween(db, customerId, start, end);
  const rows = entries.map((entry) => {
    running += entry.debitPaisa - entry.creditPaisa;
    debitPaisa += entry.debitPaisa;
    creditPaisa += entry.creditPaisa;
    return { ...entry, balancePaisa: running };
  });

  return {
    customer,
    from: isIsoDate(from) ? from : "",
    to: end,
    openingPaisa,
    rows,
    debitPaisa,
    creditPaisa,
    closingPaisa: running,
  };
}

function emptyBuckets() {
  return Object.fromEntries(AGING_BUCKETS.map((bucket) => [bucket, 0]));
}

/**
 * Aging of open invoices by customer, measured in days past the due date, plus unapplied advances.
 * @param {string} [today] - ISO date; defaults to today in Pakistan time.
 */
export async function getAgingReport(today = todayIso()) {
  const db = currentDb();
  const advances = new Map((await unallocatedTotalsByCustomer(db)).map((row) => [row.customerId, row.unallocatedPaisa]));
  const byCustomer = new Map();

  for (const invoice of await openInvoicesForAging(db)) {
    const entry = byCustomer.get(invoice.customerId) ?? {
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerType: invoice.customerType,
      buckets: emptyBuckets(),
      outstandingPaisa: 0,
    };

    entry.buckets[agingBucket(daysBetween(invoice.dueDate, today))] += invoice.outstandingPaisa;
    entry.outstandingPaisa += invoice.outstandingPaisa;
    byCustomer.set(invoice.customerId, entry);
  }

  // Customers who have an advance but no open invoices still appear, so their credit is visible.
  for (const [customerId, unallocatedPaisa] of advances) {
    if (unallocatedPaisa > 0 && !byCustomer.has(customerId)) {
      const customer = await findCustomerById(db, customerId);
      byCustomer.set(customerId, {
        customerId,
        customerName: customer?.name ?? "Unknown customer",
        customerType: customer?.customerType ?? "other",
        buckets: emptyBuckets(),
        outstandingPaisa: 0,
      });
    }
  }

  const rows = [...byCustomer.values()]
    .map((entry) => {
      const advancePaisa = advances.get(entry.customerId) ?? 0;
      return { ...entry, advancePaisa, netPaisa: entry.outstandingPaisa - advancePaisa };
    })
    .sort((left, right) => right.netPaisa - left.netPaisa);

  const totals = rows.reduce(
    (sum, row) => {
      for (const bucket of AGING_BUCKETS) {
        sum.buckets[bucket] += row.buckets[bucket];
      }
      sum.outstandingPaisa += row.outstandingPaisa;
      sum.advancePaisa += row.advancePaisa;
      sum.netPaisa += row.netPaisa;
      return sum;
    },
    { buckets: emptyBuckets(), outstandingPaisa: 0, advancePaisa: 0, netPaisa: 0 },
  );

  return { today, rows, totals, buckets: AGING_BUCKETS };
}
