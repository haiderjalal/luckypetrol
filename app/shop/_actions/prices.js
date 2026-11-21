"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { setRate } from "@/lib/shop/services/prices.js";
import { rateSchema } from "@/lib/shop/validation/prices.js";
import { parseInput } from "@/lib/shop/validation/parse.js";

export async function setRateAction(input) {
  return runShopAction(({ actor }) => setRate(parseInput(rateSchema, input), actor));
}
