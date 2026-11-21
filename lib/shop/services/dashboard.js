// Dashboard figures. Everything is calculated from the ledger, invoices, payments, orders and stock.

import { PRODUCT_LABELS } from "../constants.js";
import { addDays, fiscalYearStart, monthStart, todayIso } from "../dates.js";
import { currentDb, snapshot } from "../db.js";
import { listOrders } from "../repositories/orders.js";
import { listPaymentRows, unallocatedTotalsByCustomer } from "../repositories/payments.js";
import { openInvoicesForAging } from "../repositories/invoices.js";
import {
  collectionsByMethod,
  deliveredNotInvoicedCount,
  litresByProduct,
  orderStatusCounts,
  salesDaily,
  salesSummary,
  topCustomers,
} from "../repositories/reports.js";
import { getInventoryOverview } from "./inventory.js";

const TREND_DAYS = 14;

function sumBy(rows, key) {
  return rows.reduce((total, row) => total + (row[key] ?? 0), 0);
}

/** Pads the sales trend with zero days so the chart always shows the same number of bars. */
function fillTrend(rows, today, days) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1));
    const row = byDate.get(date);
    return { date, totalPaisa: row?.totalPaisa ?? 0, litres: row?.litres ?? 0 };
  });
}

/** All figures are read in one snapshot, so the cards agree with each other even while staff are saving. */
export async function getDashboard(today = todayIso()) {
  return snapshot(() => buildDashboard(today));
}

async function buildDashboard(today) {
  const db = currentDb();
  const monthFrom = monthStart(today);
  const inventory = await getInventoryOverview();

  const openInvoices = await openInvoicesForAging(db);
  const overdueInvoices = openInvoices.filter((invoice) => invoice.dueDate < today);
  const collections = await collectionsByMethod(db, monthFrom, today);
  const statusCounts = Object.fromEntries((await orderStatusCounts(db)).map((row) => [row.status, row.total]));

  return {
    today,
    sales: {
      today: await salesSummary(db, today, today),
      month: await salesSummary(db, monthFrom, today),
      fiscalYear: await salesSummary(db, fiscalYearStart(today), today),
    },
    collectedMonthPaisa: sumBy(collections, "amountPaisa"),
    collectionsByMethod: collections,
    receivables: {
      outstandingPaisa: sumBy(openInvoices, "outstandingPaisa"),
      overduePaisa: sumBy(overdueInvoices, "outstandingPaisa"),
      openInvoiceCount: openInvoices.length,
      overdueInvoiceCount: overdueInvoices.length,
      advancesPaisa: sumBy(await unallocatedTotalsByCustomer(db), "unallocatedPaisa"),
    },
    orderQueue: {
      received: statusCounts.received ?? 0,
      confirmed: statusCounts.confirmed ?? 0,
      dispatched: statusCounts.dispatched ?? 0,
      deliveredNotInvoiced: await deliveredNotInvoicedCount(db),
    },
    trend: fillTrend(await salesDaily(db, addDays(today, -(TREND_DAYS - 1)), today), today, TREND_DAYS),
    litresByProduct: (await litresByProduct(db, monthFrom, today)).map((row) => ({
      ...row,
      label: PRODUCT_LABELS[row.productCode] ?? row.productCode,
    })),
    topCustomers: await topCustomers(db, monthFrom, today, 5),
    inventory: {
      alerts: inventory.alerts,
      productTotals: inventory.productTotals,
    },
    recentOrders: (await listOrders(db, { limit: 6, offset: 0 })).rows,
    recentPayments: (await listPaymentRows(db, { limit: 6, offset: 0 })).rows,
  };
}
