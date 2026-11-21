import { z } from "zod";

import { CUSTOMER_STATUS_VALUES, CUSTOMER_TYPE_VALUES } from "../constants.js";
import {
  emailField,
  idField,
  mobileField,
  moneyField,
  optionalText,
  phoneField,
  requiredText,
  selectField,
  taxNumberField,
  wholeNumberField,
} from "./common.js";

export const customerSchema = z.object({
  name: requiredText("Business name", 120),
  customerType: selectField(CUSTOMER_TYPE_VALUES, "customer type"),
  status: selectField(CUSTOMER_STATUS_VALUES, "status"),
  contactPerson: optionalText("Contact person", 120),
  phone: phoneField("Phone"),
  whatsapp: mobileField("WhatsApp number"),
  email: emailField("Email"),
  address: optionalText("Address", 300),
  city: optionalText("City", 80),
  ntn: taxNumberField("NTN", [7, 13]),
  strn: taxNumberField("STRN", [13]),
  creditLimit: moneyField("Credit limit", { required: false, allowZero: true }),
  paymentTermsDays: wholeNumberField("Payment terms (days)", { min: 0, max: 365 }),
  discount: moneyField("Discount per litre", { required: false, allowZero: true }),
  notes: optionalText("Notes", 500),
});

export const siteSchema = z.object({
  customerId: idField("Customer"),
  label: requiredText("Site name", 80),
  address: requiredText("Site address", 300),
  city: optionalText("City", 80),
  contactName: optionalText("Site contact", 120),
  contactPhone: phoneField("Site contact phone"),
});

export const customerIdSchema = z.object({
  customerId: idField("Customer"),
});

export const siteStatusSchema = z.object({
  siteId: idField("Site"),
  active: z.enum(["0", "1"]).transform((value) => value === "1"),
});
