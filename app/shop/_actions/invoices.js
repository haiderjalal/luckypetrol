"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { cancelInvoice, createInvoiceFromOrder } from "@/lib/shop/services/invoices.js";
import { parseInput } from "@/lib/shop/validation/parse.js";
import { cancelInvoiceSchema, createInvoiceSchema } from "@/lib/shop/validation/invoices.js";

export async function createInvoiceAction(input) {
  return runShopAction(({ actor }) => createInvoiceFromOrder(parseInput(createInvoiceSchema, input), actor));
}

export async function cancelInvoiceAction(input) {
  return runShopAction(({ actor }) => cancelInvoice(parseInput(cancelInvoiceSchema, input), actor));
}
