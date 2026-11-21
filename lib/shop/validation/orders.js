import { z } from "zod";

import { ORDER_SOURCE_VALUES } from "../constants.js";
import { idField, litresField, optionalText, optionalIdField, requiredText, selectField, timeField, isoDateField } from "./common.js";

export const orderSchema = z
  .object({
    customerId: idField("Customer"),
    siteId: optionalIdField("Delivery site"),
    deliveryAddress: optionalText("Delivery address", 300),
    deliveryDate: isoDateField("Delivery date"),
    windowStart: timeField("Window start"),
    windowEnd: timeField("Window end"),
    source: selectField(ORDER_SOURCE_VALUES, "order source"),
    litresPMG: litresField("Petrol litres"),
    litresHSD: litresField("Diesel litres"),
    litresHOBC: litresField("High octane litres"),
    notes: optionalText("Notes", 500),
  })
  .superRefine((value, ctx) => {
    if (value.litresPMG + value.litresHSD + value.litresHOBC === 0) {
      ctx.addIssue({ code: "custom", path: ["litresPMG"], message: "Enter litres for at least one product." });
    }
    if (value.siteId === null && value.deliveryAddress === "") {
      ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Enter the delivery address, or choose a saved site." });
    }
    if (Boolean(value.windowStart) !== Boolean(value.windowEnd)) {
      ctx.addIssue({ code: "custom", path: ["windowEnd"], message: "Enter both window times, or leave both blank." });
    } else if (value.windowStart && value.windowEnd && value.windowStart >= value.windowEnd) {
      ctx.addIssue({ code: "custom", path: ["windowEnd"], message: "The window must end after it starts." });
    }
  });

export const confirmOrderSchema = z.object({
  orderId: idField("Order"),
  overrideNote: optionalText("Approval note", 300),
});

export const cancelOrderSchema = z.object({
  orderId: idField("Order"),
  reason: requiredText("Reason for cancelling", 300),
});
