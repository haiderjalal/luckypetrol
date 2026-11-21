"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { completeDelivery } from "@/lib/shop/services/deliveries.js";
import { deliverySchema } from "@/lib/shop/validation/deliveries.js";
import { parseInput } from "@/lib/shop/validation/parse.js";

export async function completeDeliveryAction(input) {
  return runShopAction(({ actor }) => completeDelivery(parseInput(deliverySchema, input), actor));
}
