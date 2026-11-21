// Message builders for WhatsApp. Links open WhatsApp with the text filled in; a person still presses Send.
// Automatic sending needs the WhatsApp Business Cloud API and is not built yet.

import { PRODUCT_LABELS } from "./constants.js";
import { formatDate } from "./dates.js";
import { formatLitres, formatRupees } from "./money.js";

/** Builds a click-to-chat link for a normalised mobile number (digits only, country code first). */
export function buildWhatsAppLink(mobileDigits, message) {
  return `https://wa.me/${mobileDigits}?text=${encodeURIComponent(message)}`;
}

function productLines(items, litresKey) {
  return items
    .map((item) => `${PRODUCT_LABELS[item.productCode] ?? item.productCode}: ${formatLitres(item[litresKey])} L`)
    .join("\n");
}

function bankBlock(bankAccounts) {
  const accounts = bankAccounts.filter((account) => account.accountNumber || account.iban);
  if (accounts.length === 0) {
    return null;
  }

  const details = accounts.map((account) =>
    [
      [account.bankName, account.accountTitle].filter(Boolean).join(" – "),
      account.accountNumber ? `A/C: ${account.accountNumber}` : null,
      account.iban ? `IBAN: ${account.iban}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return `Payment details:\n${details.join("\n\n")}`;
}

/**
 * @param {{ invoice: object, lines: object[], company: object, bankAccounts: object[], shareUrl: string }} input
 */
export function buildInvoiceMessage({ invoice, lines, company, bankAccounts, shareUrl }) {
  const greeting = `Dear ${invoice.contactName || invoice.billToName},`;
  const parts = [
    `*${company.name}*`,
    greeting,
    `Your invoice ${invoice.invoiceNo} dated ${formatDate(invoice.invoiceDate)} is ready.`,
    productLines(lines, "litres"),
    `Total: ${formatRupees(invoice.totalPaisa)}`,
    `Due date: ${formatDate(invoice.dueDate)}`,
  ];

  const banks = bankBlock(bankAccounts);
  if (banks) {
    parts.push(banks);
  }

  parts.push(`View and print your invoice: ${shareUrl}`, "Thank you for your business.");
  return parts.join("\n\n");
}

/**
 * @param {{ order: object, items: object[], company: object }} input
 */
export function buildOrderMessage({ order, items, company }) {
  const slot = order.windowStart && order.windowEnd ? `${order.windowStart} to ${order.windowEnd}` : "Any time that day";
  return [
    `*${company.name}* – Order ${order.orderNo}`,
    `Customer: ${order.customerName}`,
    `Delivery: ${formatDate(order.deliveryDate)}, ${slot}`,
    `Address: ${order.deliveryAddress}`,
    productLines(items, "orderedLitres"),
    `Total: ${formatLitres(order.totalLitres)} L`,
    `Estimated value: ${formatRupees(order.estimatedPaisa)}`,
    order.notes ? `Notes: ${order.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Friendly account reminder for overdue balances. Keep the tone polite.
 * @param {{ customerName: string, contactName?: string, balancePaisa: number, overdueInvoices: object[], company: object, bankAccounts: object[] }} input
 */
export function buildReminderMessage({ customerName, contactName, balancePaisa, overdueInvoices, company, bankAccounts }) {
  const greeting = `Dear ${contactName || customerName},`;
  const overdueLines = overdueInvoices
    .slice(0, 5)
    .map((invoice) => `${invoice.invoiceNo} (due ${formatDate(invoice.dueDate)}): ${formatRupees(invoice.outstandingPaisa)}`);

  const parts = [
    `*${company.name}*`,
    greeting,
    `This is a friendly reminder that your account balance is ${formatRupees(balancePaisa)}.`,
  ];

  if (overdueLines.length > 0) {
    parts.push(`Overdue invoices:\n${overdueLines.join("\n")}`);
  }

  const banks = bankBlock(bankAccounts);
  if (banks) {
    parts.push(banks);
  }

  parts.push("Please arrange payment at your earliest convenience. If you have already paid, please share the receipt. Thank you.");
  return parts.join("\n\n");
}
