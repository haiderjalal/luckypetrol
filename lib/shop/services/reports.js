// Reports and CSV exports. Every amount in a CSV is in rupees (two decimals), so spreadsheets can total it.

import { PRODUCT_LABELS, PAYMENT_METHOD_LABELS } from "../constants.js";
import { AGING_BUCKETS, fiscalYearStart, isIsoDate, todayIso } from "../dates.js";
import { currentDb, snapshot } from "../db.js";
import { ShopError } from "../errors.js";
import { getAgingReport } from "./ledger.js";
import { allEntriesBetween } from "../repositories/ledger.js";
import { listInvoiceRows } from "../repositories/invoices.js";
import { listOrders } from "../repositories/orders.js";
import { listPaymentRows } from "../repositories/payments.js";
import { litresByProduct, salesByCustomerType, salesSummary, collectionsByMethod, topCustomers } from "../repositories/reports.js";
import { listTankRows } from "../repositories/inventory.js";
import { paisaToRupees, cleanDate } from "../query.js";
import { toCsv } from "../csv.js";

const EXPORT_LIMIT = 10000;

/** Resolves the reporting period. Defaults to the current financial year up to today. */
export async function resolvePeriod({ from, to } = {}) {
  const today = todayIso();
  const start = cleanDate(from, fiscalYearStart(today));
  const end = cleanDate(to, today);
  if (start > end) {
    throw new ShopError("The start date must be before the end date.", { fieldErrors: { to: "Choose an end date after the start date." } });
  }
  return { from: start, to: end };
}

/** Every figure in the summary is read in one snapshot, so the totals agree with each other. */
export async function getReportSummary(period) {
  return snapshot(() => buildReportSummary(period));
}

async function buildReportSummary(period) {
  const db = currentDb();
  const { from, to } = await resolvePeriod(period);
  return {
    from,
    to,
    sales: await salesSummary(db, from, to),
    byProduct: (await litresByProduct(db, from, to)).map((row) => ({ ...row, label: PRODUCT_LABELS[row.productCode] ?? row.productCode })),
    byCustomerType: await salesByCustomerType(db, from, to),
    topCustomers: await topCustomers(db, from, to, 10),
    collections: (await collectionsByMethod(db, from, to)).map((row) => ({
      ...row,
      label: PAYMENT_METHOD_LABELS[row.method] ?? row.method,
    })),
    aging: await getAgingReport(todayIso()),
  };
}

const REPORT_BUILDERS = {
  invoices: async (db, period) => {
    const { rows } = await listInvoiceRows(db, { from: period.from, to: period.to, limit: EXPORT_LIMIT, offset: 0 });
    return {
      headers: ["Invoice no", "Invoice date", "Due date", "Customer", "Customer type", "Status", "Payment state", "Litres", "Subtotal (Rs)", "Tax (Rs)", "Total (Rs)", "Paid (Rs)", "Outstanding (Rs)"],
      rows: rows.map((row) => [
        row.invoiceNo,
        row.invoiceDate,
        row.dueDate,
        row.customerName,
        row.customerType,
        row.status,
        row.payment_state ?? row.paymentState,
        row.totalLitres,
        paisaToRupees(row.subtotalPaisa),
        paisaToRupees(row.taxPaisa),
        paisaToRupees(row.totalPaisa),
        paisaToRupees(row.paidPaisa),
        row.status === "cancelled" ? 0 : paisaToRupees(row.totalPaisa - row.paidPaisa),
      ]),
    };
  },
  payments: async (db, period) => {
    const { rows } = await listPaymentRows(db, { from: period.from, to: period.to, limit: EXPORT_LIMIT, offset: 0 });
    return {
      headers: ["Receipt no", "Received on", "Customer", "Method", "Reference", "Bank", "Status", "Amount (Rs)", "Applied (Rs)", "Unapplied (Rs)"],
      rows: rows.map((row) => [
        row.receiptNo,
        row.receivedOn,
        row.customerName,
        PAYMENT_METHOD_LABELS[row.method] ?? row.method,
        row.reference ?? "",
        row.bankName ?? "",
        row.status,
        paisaToRupees(row.amountPaisa),
        paisaToRupees(row.allocatedPaisa),
        row.status === "posted" ? paisaToRupees(row.amountPaisa - row.allocatedPaisa) : 0,
      ]),
    };
  },
  orders: async (db, period) => {
    const { rows } = await listOrders(db, { from: period.from, to: period.to, limit: EXPORT_LIMIT, offset: 0 });
    return {
      headers: ["Order no", "Delivery date", "Window start", "Window end", "Customer", "Customer type", "Source", "Status", "Litres", "Estimated value (Rs)"],
      rows: rows.map((row) => [
        row.orderNo,
        row.deliveryDate,
        row.windowStart ?? "",
        row.windowEnd ?? "",
        row.customerName,
        row.customerType,
        row.source,
        row.status,
        row.totalLitres,
        paisaToRupees(row.estimatedPaisa),
      ]),
    };
  },
  ledger: async (db, period) => {
    const entries = await allEntriesBetween(db, period.from, period.to);
    return {
      headers: ["Customer code", "Customer", "Date", "Type", "Reference", "Description", "Debit (Rs)", "Credit (Rs)"],
      rows: entries.map((row) => [
        row.customerCode,
        row.customerName,
        row.entryDate,
        row.entryType,
        row.reference,
        row.description,
        paisaToRupees(row.debitPaisa),
        paisaToRupees(row.creditPaisa),
      ]),
    };
  },
  aging: async () => {
    const report = await getAgingReport(todayIso());
    return {
      headers: ["Customer", "Customer type", ...AGING_BUCKETS.map((bucket) => `${bucket} (Rs)`), "Outstanding (Rs)", "Advances (Rs)", "Net balance (Rs)"],
      rows: report.rows.map((row) => [
        row.customerName,
        row.customerType,
        ...AGING_BUCKETS.map((bucket) => paisaToRupees(row.buckets[bucket])),
        paisaToRupees(row.outstandingPaisa),
        paisaToRupees(row.advancePaisa),
        paisaToRupees(row.netPaisa),
      ]),
    };
  },
  "sales-by-product": async (db, period) => {
    const rows = await litresByProduct(db, period.from, period.to);
    return {
      headers: ["Product", "Litres", "Amount (Rs)"],
      rows: rows.map((row) => [
        PRODUCT_LABELS[row.productCode] ?? row.productCode,
        row.litres,
        paisaToRupees(row.amountPaisa),
      ]),
    };
  },
  stock: async (db) => {
    const tanks = await listTankRows(db);
    return {
      headers: ["Depot", "Tank", "Product", "Capacity (L)", "Book stock (L)", "Fill %", "Last dip (L)", "Last dip date", "Last variance (L)"],
      rows: tanks.map((tank) => [
        tank.depotName,
        tank.name,
        PRODUCT_LABELS[tank.productCode] ?? tank.productCode,
        tank.capacityLitres,
        tank.bookLitres,
        tank.capacityLitres > 0 ? Math.round((tank.bookLitres / tank.capacityLitres) * 1000) / 10 : 0,
        tank.lastDipLitres ?? "",
        tank.lastDipOn ?? "",
        tank.lastVarianceLitres ?? "",
      ]),
    };
  },
};

export const REPORT_KEYS = Object.keys(REPORT_BUILDERS);

/** Builds a CSV for one report over the chosen period. Throws a ShopError for an unknown report. */
export async function buildCsvExport(reportKey, filters = {}) {
  return snapshot(() => buildCsvFile(reportKey, filters));
}

async function buildCsvFile(reportKey, filters) {
  const db = currentDb();
  const build = REPORT_BUILDERS[reportKey];
  if (!build) {
    throw new ShopError("Unknown report.", { code: "not_found" });
  }

  const period = await resolvePeriod(filters);
  const { headers, rows } = await build(db, period);
  const stamp = isIsoDate(period.from) && isIsoDate(period.to) ? `${period.from}_to_${period.to}` : todayIso();
  return { filename: `lucky-petroleum-${reportKey}-${stamp}.csv`, csv: toCsv(headers, rows) };
}
