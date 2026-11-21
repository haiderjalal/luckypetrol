import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "../constants.js";
import { todayIso } from "../dates.js";
import { currentDb, transaction } from "../db.js";
import { ShopError, notFoundError } from "../errors.js";
import { formatRupees } from "../money.js";
import { nextReceiptNumber } from "../numbering.js";
import { pageCount, paginate } from "../pagination.js";
import { cleanDate, cleanSearch, parseOptionalId, pickAllowed } from "../query.js";
import { findCustomerById } from "../repositories/customers.js";
import { openInvoicesForCustomer } from "../repositories/invoices.js";
import { customerBalancePaisa } from "../repositories/ledger.js";
import {
  deleteAllocationsForPayment,
  findPaymentRow,
  insertAllocation,
  insertPayment,
  listPaymentRows,
  paymentAllocations,
  setPaymentVoided,
} from "../repositories/payments.js";
import { nullable } from "../repositories/rows.js";
import { recordAudit } from "./audit.js";
import { postLedgerEntry } from "./ledger.js";

/** Applies money to the oldest open invoices first (FIFO). Whatever is left over becomes an advance. */
async function allocateOldestFirst(db, { paymentId, customerId, amountPaisa }) {
  let remaining = amountPaisa;
  const allocations = [];
  const invoices = await openInvoicesForCustomer(db, customerId);

  for (const invoice of invoices) {
    if (remaining === 0) {
      break;
    }

    const amount = Math.min(remaining, invoice.outstandingPaisa);
    if (amount <= 0) {
      continue;
    }

    await insertAllocation(db, { payment_id: paymentId, invoice_id: invoice.id, amount_paisa: amount });
    allocations.push({ invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amountPaisa: amount });
    remaining -= amount;
  }

  return { allocations, advancePaisa: remaining };
}

export async function recordPayment(input, actor) {
  return transaction(async (db) => {
    const customer = await findCustomerById(db, input.customerId);
    if (!customer) {
      throw notFoundError("Customer");
    }

    const receiptNo = await nextReceiptNumber(db);
    const paymentId = await insertPayment(db, {
      receipt_no: receiptNo,
      customer_id: customer.id,
      amount_paisa: input.amount,
      method: input.method,
      reference: nullable(input.reference),
      bank_name: nullable(input.bankName),
      received_on: input.receivedOn,
      status: "posted",
      notes: nullable(input.notes),
      created_by: actor,
    });

    const methodLabel = PAYMENT_METHOD_LABELS[input.method] ?? input.method;
    await postLedgerEntry(db, {
      customerId: customer.id,
      entryDate: input.receivedOn,
      entryType: "payment",
      reference: receiptNo,
      description: `Payment by ${methodLabel}${input.reference ? ` (${input.reference})` : ""}`,
      creditPaisa: input.amount,
    });

    const { allocations, advancePaisa } = await allocateOldestFirst(db, {
      paymentId,
      customerId: customer.id,
      amountPaisa: input.amount,
    });

    await recordAudit(db, {
      actor,
      action: "payment.received",
      entityType: "payment",
      entityId: paymentId,
      summary: `${receiptNo} from ${customer.name}: ${formatRupees(input.amount)} by ${methodLabel}`,
    });

    const appliedPaisa = input.amount - advancePaisa;
    const parts = [`Receipt ${receiptNo} recorded for ${formatRupees(input.amount)}.`];
    if (appliedPaisa > 0) {
      parts.push(`${formatRupees(appliedPaisa)} applied to ${allocations.length} invoice${allocations.length === 1 ? "" : "s"}.`);
    }
    if (advancePaisa > 0) {
      parts.push(`${formatRupees(advancePaisa)} held as advance.`);
    }

    return { id: paymentId, receiptNo, message: parts.join(" "), redirectTo: `/shop/payments/${paymentId}` };
  });
}

/** Voids a payment: its allocations are removed, so the invoices it paid become open again. Keeps an audit trail. */
export async function voidPayment(input, actor) {
  return transaction(async (db) => {
    const payment = await findPaymentRow(db, input.paymentId);
    if (!payment) {
      throw notFoundError("Payment");
    }
    if (payment.status !== "posted") {
      throw new ShopError(`${payment.receiptNo} is already voided.`);
    }

    const today = todayIso();
    const now = new Date().toISOString();
    await deleteAllocationsForPayment(db, payment.id);
    await setPaymentVoided(db, payment.id, input.reason, now);
    await postLedgerEntry(db, {
      customerId: payment.customerId,
      entryDate: today,
      entryType: "payment_void",
      reference: payment.receiptNo,
      description: `Voided ${payment.receiptNo}: ${input.reason}`,
      debitPaisa: payment.amountPaisa,
    });

    await recordAudit(db, {
      actor,
      action: "payment.voided",
      entityType: "payment",
      entityId: payment.id,
      summary: `${payment.receiptNo} voided: ${input.reason}`,
    });

    return { message: `${payment.receiptNo} voided. Any invoices it paid are open again.`, redirectTo: `/shop/payments/${payment.id}` };
  });
}

export async function listPayments(filters = {}) {
  const db = currentDb();
  const paging = paginate(filters.page);
  const { rows, total } = await listPaymentRows(db, {
    customerId: parseOptionalId(filters.customerId),
    method: pickAllowed(filters.method, PAYMENT_METHOD_LABELS),
    status: pickAllowed(filters.status, PAYMENT_STATUS_LABELS),
    from: cleanDate(filters.from),
    to: cleanDate(filters.to),
    search: cleanSearch(filters.search),
    limit: paging.limit,
    offset: paging.offset,
  });

  return { rows, total, page: paging.page, pageCount: pageCount(total) };
}

export async function getPaymentDetail(paymentId) {
  const db = currentDb();
  const payment = await findPaymentRow(db, paymentId);
  if (!payment) {
    throw notFoundError("Payment");
  }

  return {
    payment: {
      ...payment,
      unappliedPaisa: payment.status === "posted" ? payment.amountPaisa - payment.allocatedPaisa : 0,
    },
    allocations: await paymentAllocations(db, paymentId),
    customerBalancePaisa: await customerBalancePaisa(db, payment.customerId),
  };
}
