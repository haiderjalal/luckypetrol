"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { recordPayment, voidPayment } from "@/lib/shop/services/payments.js";
import { paymentSchema, voidPaymentSchema } from "@/lib/shop/validation/payments.js";
import { parseInput } from "@/lib/shop/validation/parse.js";

export async function recordPaymentAction(input) {
  return runShopAction(({ actor }) => recordPayment(parseInput(paymentSchema, input), actor));
}

export async function voidPaymentAction(input) {
  return runShopAction(({ actor }) => voidPayment(parseInput(voidPaymentSchema, input), actor));
}
