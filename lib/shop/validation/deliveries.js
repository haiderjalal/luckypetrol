import { z } from "zod";

import { idField, isoDateField, litresField, optionalText, phoneField } from "./common.js";

export const dispatchSchema = z.object({
  orderId: idField("Order"),
  depotId: idField("Depot"),
  vehicleNo: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => /^[A-Z0-9][A-Z0-9 -]{2,18}$/.test(value),
      "Vehicle number must be 3 to 19 letters, numbers, spaces or hyphens.",
    ),
  driverName: optionalText("Driver name", 80),
  driverPhone: phoneField("Driver phone"),
  sealNumbers: optionalText("Seal numbers", 200),
});

export const deliverySchema = z.object({
  deliveryId: idField("Delivery"),
  deliveredOn: isoDateField("Delivery date"),
  deliveredPMG: litresField("Petrol delivered"),
  deliveredHSD: litresField("Diesel delivered"),
  deliveredHOBC: litresField("High octane delivered"),
});
