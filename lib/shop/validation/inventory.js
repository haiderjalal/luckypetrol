import { z } from "zod";

import { PRODUCT_CODES } from "../constants.js";
import { booleanFlag, idField, isoDateField, litresField, optionalText, requiredText, selectField } from "./common.js";

export const depotSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z0-9]{2,10}$/.test(value), "Depot code must be 2 to 10 letters or numbers."),
  name: requiredText("Depot name", 80),
  location: optionalText("Location", 120),
});

export const tankSchema = z.object({
  depotId: idField("Depot"),
  name: requiredText("Tank name", 40),
  productCode: selectField(PRODUCT_CODES, "product"),
  capacityLitres: litresField("Capacity", { required: true, allowZero: false }),
});

export const receiptSchema = z.object({
  tankId: idField("Tank"),
  litres: litresField("Litres received", { required: true, allowZero: false }),
  reference: optionalText("Reference (challan or tanker number)", 80),
  occurredOn: isoDateField("Date received"),
});

export const dipSchema = z.object({
  tankId: idField("Tank"),
  measuredLitres: litresField("Measured litres", { required: true, allowZero: true }),
  measuredOn: isoDateField("Dip date"),
  notes: optionalText("Notes", 300),
  postAdjustment: booleanFlag(),
});
