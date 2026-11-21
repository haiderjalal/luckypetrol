// Invoices are issued after delivery, for the litres actually delivered. Money already paid as an advance
// is applied to the new invoice straight away.

import { randomBytes } from "node:crypto";

import { INVOICE_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATE_LABELS, PRODUCT_LABELS } from "../constants.js";
import { addDays, todayIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { ShopError, notFoundError } from "../errors.js";
import { formatRupees } from "../money.js";
import { nextInvoiceNumber } from "../numbering.js";
import { pageCount, paginate } from "../pagination.js";
import { cleanDate, cleanSearch, parseOptionalId, pickAllowed } from "../query.js";
import { findCustomerById } from "../repositories/customers.js";
import {
  activeInvoiceForOrder,
  findInvoiceByToken,
  findInvoiceRow,
  insertInvoice,
  insertInvoiceLine,
  invoiceLines,
  invoiceAllocations,
  listInvoiceRows,
  setInvoiceCancelled,
} from "../repositories/invoices.js";
import { findOrderRow, orderItems } from "../repositories/orders.js";
import { insertAllocation, unallocatedPaymentsForCustomer } from "../repositories/payments.js";
import { nullable } from "../repositories/rows.js";
import { computeInvoiceTotals } from "../totals.js";
import { recordAudit } from "./audit.js";
import { postLedgerEntry } from "./ledger.js";
import { readSettings } from "./settings.js";

/** paid / partial / unpaid / cancelled, derived from the amounts applied to the invoice. */
export function paymentStateOf(invoice) {
  if (invoice.status === "cancelled") {
    return "cancelled";
  }
  if (invoice.paidPaisa === 0) {
    return "unpaid";
  }
  return invoice.paidPaisa < invoice.totalPaisa ? "partial" : "paid";
}

export function describeInvoice(invoice, today = todayIso()) {
  const isCancelled = invoice.status === "cancelled";
  const outstandingPaisa = isCancelled ? 0 : invoice.totalPaisa - invoice.paidPaisa;

  return {
    ...invoice,
    paymentState: paymentStateOf(invoice),
    outstandingPaisa,
    isOverdue: !isCancelled && outstandingPaisa > 0 && invoice.dueDate < today,
  };
}

/** Applies unused advances from earlier payments to a new invoice, oldest payment first. */
function applyAdvances(db, { invoiceId, customerId, amountDuePaisa, createdAt }) {
  let remaining = amountDuePaisa;
  let applied = 0;

  for (const payment of unallocatedPaymentsForCustomer(db, customerId)) {
    if (remaining === 0) {
      break;
    }

    const amount = Math.min(remaining, payment.unallocatedPaisa);
    insertAllocation(db, { payment_id: payment.id, invoice_id: invoiceId, amount_paisa: amount, created_at: createdAt });
    remaining -= amount;
    applied += amount;
  }

  return applied;
}

export function createInvoiceFromOrder(input, actor) {
  return transaction((db) => {
    const order = findOrderRow(db, input.orderId);
    if (!order) {
      throw notFoundError("Order");
    }
    if (order.status !== "delivered") {
      throw new ShopError(`Invoices are issued after delivery. ${order.orderNo} is ${ORDER_STATUS_LABELS[order.status].toLowerCase()}.`);
    }

    const existing = activeInvoiceForOrder(db, order.id);
    if (existing) {
      throw new ShopError(`${order.orderNo} is already invoiced as ${existing.invoiceNo}.`);
    }

    const deliveredItems = orderItems(db, order.id).filter((item) => (item.deliveredLitres ?? 0) > 0);
    if (deliveredItems.length === 0) {
      throw new ShopError(`Nothing was delivered on ${order.orderNo}, so there is nothing to invoice.`);
    }

    const settings = readSettings(db);
    const customer = findCustomerById(db, order.customerId);
    const today = todayIso();
    const lines = deliveredItems.map((item) => ({
      productCode: item.productCode,
      litres: item.deliveredLitres,
      ratePaisa: item.ratePaisa,
      amountPaisa: item.deliveredLitres * item.ratePaisa,
    }));

    const linesTotalPaisa = lines.reduce((sum, line) => sum + line.amountPaisa, 0);
    const totalLitres = lines.reduce((sum, line) => sum + line.litres, 0);
    const totals = computeInvoiceTotals({
      linesTotalPaisa,
      taxMode: settings.billing.taxMode,
      taxRateBps: settings.billing.taxRateBps,
    });

    const invoiceNo = nextInvoiceNumber(db, { prefix: settings.billing.invoicePrefix, invoiceDate: today });
    const now = new Date().toISOString();
    const invoiceId = insertInvoice(db, {
      invoice_no: invoiceNo,
      order_id: order.id,
      customer_id: customer.id,
      invoice_date: today,
      due_date: addDays(today, customer.paymentTermsDays),
      bill_to_name: customer.name,
      bill_to_address: nullable(customer.address) ?? order.deliveryAddress,
      bill_to_ntn: nullable(customer.ntn),
      bill_to_strn: nullable(customer.strn),
      tax_mode: settings.billing.taxMode,
      tax_rate_bps: settings.billing.taxRateBps,
      total_litres: totalLitres,
      subtotal_paisa: totals.subtotalPaisa,
      tax_paisa: totals.taxPaisa,
      total_paisa: totals.totalPaisa,
      status: "issued",
      share_token: randomBytes(24).toString("base64url"),
      created_by: actor,
      created_at: now,
    });

    for (const line of lines) {
      insertInvoiceLine(db, {
        invoice_id: invoiceId,
        product_code: line.productCode,
        litres: line.litres,
        rate_paisa: line.ratePaisa,
        amount_paisa: line.amountPaisa,
      });
    }

    postLedgerEntry(db, {
      customerId: customer.id,
      entryDate: today,
      entryType: "invoice",
      reference: invoiceNo,
      description: `Invoice ${invoiceNo} for ${totalLitres.toLocaleString("en-US")} litres`,
      debitPaisa: totals.totalPaisa,
    });

    const advancePaisa = applyAdvances(db, {
      invoiceId,
      customerId: customer.id,
      amountDuePaisa: totals.totalPaisa,
      createdAt: now,
    });

    recordAudit(db, {
      actor,
      action: "invoice.issued",
      entityType: "invoice",
      entityId: invoiceId,
      summary: `${invoiceNo} for ${order.orderNo}: ${formatRupees(totals.totalPaisa)}`,
    });

    const advanceNote = advancePaisa > 0 ? `, with ${formatRupees(advancePaisa)} of advance applied` : "";
    return {
      id: invoiceId,
      invoiceNo,
      message: `Invoice ${invoiceNo} issued for ${formatRupees(totals.totalPaisa)}${advanceNote}.`,
      redirectTo: `/shop/invoices/${invoiceId}`,
    };
  });
}

/** Cancels an invoice that has no payments applied. Payments must be voided first, which keeps the ledger honest. */
export function cancelInvoice(input, actor) {
  return transaction((db) => {
    const invoice = findInvoiceRow(db, input.invoiceId);
    if (!invoice) {
      throw notFoundError("Invoice");
    }
    if (invoice.status !== "issued") {
      throw new ShopError(`${invoice.invoiceNo} is already cancelled.`);
    }
    if (invoice.paidPaisa > 0) {
      throw new ShopError(`${invoice.invoiceNo} has ${formatRupees(invoice.paidPaisa)} of payments applied. Void those payments before cancelling the invoice.`);
    }

    const now = new Date().toISOString();
    setInvoiceCancelled(db, invoice.id, input.reason, now);
    postLedgerEntry(db, {
      customerId: invoice.customerId,
      entryDate: todayIso(),
      entryType: "invoice_cancel",
      reference: invoice.invoiceNo,
      description: `Cancelled ${invoice.invoiceNo}: ${input.reason}`,
      creditPaisa: invoice.totalPaisa,
    });

    recordAudit(db, {
      actor,
      action: "invoice.cancelled",
      entityType: "invoice",
      entityId: invoice.id,
      summary: `${invoice.invoiceNo} cancelled: ${input.reason}`,
    });

    return { message: `${invoice.invoiceNo} cancelled. The order can be invoiced again.`, redirectTo: `/shop/invoices/${invoice.id}` };
  });
}

export function listInvoices(filters = {}) {
  const paging = paginate(filters.page);
  const today = todayIso();
  const { rows, total } = listInvoiceRows(getDb(), {
    customerId: parseOptionalId(filters.customerId),
    status: pickAllowed(filters.status, INVOICE_STATUS_LABELS),
    paymentState: pickAllowed(filters.paymentState, PAYMENT_STATE_LABELS),
    from: cleanDate(filters.from),
    to: cleanDate(filters.to),
    search: cleanSearch(filters.search),
    limit: paging.limit,
    offset: paging.offset,
  });

  return {
    rows: rows.map((row) => describeInvoice(row, today)),
    total,
    page: paging.page,
    pageCount: pageCount(total),
  };
}

export function getInvoiceDetail(invoiceId, today = todayIso()) {
  const db = getDb();
  const invoice = findInvoiceRow(db, invoiceId);
  if (!invoice) {
    throw notFoundError("Invoice");
  }

  const settings = readSettings(db);
  return {
    invoice: describeInvoice(invoice, today),
    lines: invoiceLines(db, invoiceId).map((line) => ({ ...line, label: PRODUCT_LABELS[line.productCode] ?? line.productCode })),
    allocations: invoiceAllocations(db, invoiceId),
    company: settings.company,
    billing: settings.billing,
  };
}

/**
 * Read-only view for the public share link. Only fields the customer should see are included.
 * Returns null for unknown or malformed tokens, so the page can show "not found".
 */
export function getPublicInvoice(token) {
  if (typeof token !== "string" || !isWellFormedToken(token)) {
    return null;
  }

  const db = getDb();
  const invoice = findInvoiceByToken(db, token);
  if (!invoice) {
    return null;
  }

  const settings = readSettings(db);
  const described = describeInvoice(invoice);
  return {
    invoice: {
      invoiceNo: described.invoiceNo,
      invoiceDate: described.invoiceDate,
      dueDate: described.dueDate,
      status: described.status,
      paymentState: described.paymentState,
      billToName: described.billToName,
      billToAddress: described.billToAddress,
      billToNtn: described.billToNtn,
      billToStrn: described.billToStrn,
      taxMode: described.taxMode,
      taxRateBps: described.taxRateBps,
      totalLitres: described.totalLitres,
      subtotalPaisa: described.subtotalPaisa,
      taxPaisa: described.taxPaisa,
      totalPaisa: described.totalPaisa,
      paidPaisa: described.paidPaisa,
      outstandingPaisa: described.outstandingPaisa,
      orderNo: described.orderNo,
      deliveryAddress: described.deliveryAddress,
      deliveryDate: described.deliveryDate,
    },
    lines: invoiceLines(db, invoice.id).map((line) => ({
      productCode: line.productCode,
      label: PRODUCT_LABELS[line.productCode] ?? line.productCode,
      litres: line.litres,
      ratePaisa: line.ratePaisa,
      amountPaisa: line.amountPaisa,
    })),
    company: settings.company,
    bankAccounts: settings.billing.bankAccounts,
    footer: settings.billing.invoiceFooter,
  };
}

function isWellFormedToken(token) {
  return token.length >= 20 && token.length <= 64 && /^[A-Za-z0-9_-]+$/.test(token);
}
