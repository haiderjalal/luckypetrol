"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { addCustomerSite, createCustomer, editCustomer, setCustomerSiteActive } from "@/lib/shop/services/customers.js";
import { customerIdSchema, customerSchema, siteSchema, siteStatusSchema } from "@/lib/shop/validation/customers.js";
import { parseInput } from "@/lib/shop/validation/parse.js";

export async function createCustomerAction(input) {
  return runShopAction(({ actor }) => createCustomer(parseInput(customerSchema, input), actor));
}

export async function editCustomerAction(input) {
  return runShopAction(({ actor }) => {
    const { customerId } = parseInput(customerIdSchema, input);
    return editCustomer(customerId, parseInput(customerSchema, input), actor);
  });
}

export async function addCustomerSiteAction(input) {
  return runShopAction(({ actor }) => addCustomerSite(parseInput(siteSchema, input), actor));
}

export async function setCustomerSiteStatusAction(input) {
  return runShopAction(({ actor }) => setCustomerSiteActive(parseInput(siteStatusSchema, input), actor));
}
