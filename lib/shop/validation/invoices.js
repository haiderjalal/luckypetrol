import { z } from "zod";

import { idField, requiredText } from "./common.js";

export const createInvoiceSchema = z.object({
  orderId: idField("Order"),
});

export const cancelInvoiceSchema = z.object({
  invoiceId: idField("Invoice"),
  reason: requiredText("Reason for cancelling", 300),
});
