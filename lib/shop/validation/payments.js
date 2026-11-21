import { z } from "zod";

import { PAYMENT_METHOD_VALUES } from "../constants.js";
import { idField, isoDateField, moneyField, optionalText, requiredText, selectField } from "./common.js";

export const paymentSchema = z.object({
  customerId: idField("Customer"),
  amount: moneyField("Amount received"),
  method: selectField(PAYMENT_METHOD_VALUES, "payment method"),
  reference: optionalText("Reference", 80),
  bankName: optionalText("Bank name", 80),
  receivedOn: isoDateField("Date received"),
  notes: optionalText("Notes", 300),
});

export const voidPaymentSchema = z.object({
  paymentId: idField("Payment"),
  reason: requiredText("Reason for voiding", 300),
});
