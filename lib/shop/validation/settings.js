import { z } from "zod";

import { TAX_MODE_VALUES } from "../constants.js";
import {
  decimalPercentField,
  emailField,
  ibanField,
  mobileField,
  optionalText,
  phoneField,
  requiredText,
  selectField,
  taxNumberField,
  taxPercentField,
  wholeNumberField,
} from "./common.js";

export const settingsSchema = z.object({
  companyName: requiredText("Company name", 120),
  companyLegalName: optionalText("Legal name", 150),
  companyAddress: requiredText("Company address", 300),
  companyPhone: phoneField("Phone"),
  companyOfficePhone: phoneField("Office phone"),
  companyEmail: emailField("Email"),
  companyNtn: taxNumberField("NTN", [7, 13]),
  companyStrn: taxNumberField("STRN", [13]),
  companyWhatsapp: mobileField("Business WhatsApp number"),
  invoicePrefix: z
    .string()
    .trim()
    .default("")
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z0-9]{1,6}$/.test(value), "Invoice prefix must be 1 to 6 letters or numbers."),
  paymentTermsDays: wholeNumberField("Default payment terms (days)", { min: 0, max: 365 }),
  taxRateBps: taxPercentField("Sales tax rate"),
  taxMode: selectField(TAX_MODE_VALUES, "tax mode"),
  invoiceFooter: optionalText("Invoice footer", 300),
  bank1Name: optionalText("Bank name", 80),
  bank1Title: optionalText("Account title", 120),
  bank1Account: optionalText("Account number", 40),
  bank1Iban: ibanField("IBAN"),
  bank2Name: optionalText("Bank name", 80),
  bank2Title: optionalText("Account title", 120),
  bank2Account: optionalText("Account number", 40),
  bank2Iban: ibanField("IBAN"),
  varianceTolerancePercent: decimalPercentField("Variance tolerance", 10),
  lowStockPercent: wholeNumberField("Low-stock warning", { min: 1, max: 50 }),
});
