"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { dispatchOrder } from "@/lib/shop/services/deliveries.js";
import { cancelOrder, confirmOrder, createOrder } from "@/lib/shop/services/orders.js";
import { dispatchSchema } from "@/lib/shop/validation/deliveries.js";
import { parseInput } from "@/lib/shop/validation/parse.js";
import { cancelOrderSchema, confirmOrderSchema, orderSchema } from "@/lib/shop/validation/orders.js";

export async function createOrderAction(input) {
  return runShopAction(({ actor }) => createOrder(parseInput(orderSchema, input), actor));
}

export async function confirmOrderAction(input) {
  return runShopAction(({ actor }) => confirmOrder(parseInput(confirmOrderSchema, input), actor));
}

export async function cancelOrderAction(input) {
  return runShopAction(({ actor }) => cancelOrder(parseInput(cancelOrderSchema, input), actor));
}

export async function dispatchOrderAction(input) {
  return runShopAction(({ actor }) => dispatchOrder(parseInput(dispatchSchema, input), actor));
}
