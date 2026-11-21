"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { createDepot, createTank, receiveStock, recordDip } from "@/lib/shop/services/inventory.js";
import { depotSchema, dipSchema, receiptSchema, tankSchema } from "@/lib/shop/validation/inventory.js";
import { parseInput } from "@/lib/shop/validation/parse.js";

export async function createDepotAction(input) {
  return runShopAction(({ actor }) => createDepot(parseInput(depotSchema, input), actor));
}

export async function createTankAction(input) {
  return runShopAction(({ actor }) => createTank(parseInput(tankSchema, input), actor));
}

export async function receiveStockAction(input) {
  return runShopAction(({ actor }) => receiveStock(parseInput(receiptSchema, input), actor));
}

export async function recordDipAction(input) {
  return runShopAction(({ actor }) => recordDip(parseInput(dipSchema, input), actor));
}
