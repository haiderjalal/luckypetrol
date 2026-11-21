// Validation building blocks. Services only receive clean values because checks and conversions happen here:
// money arrives as whole paisa, percentages as basis points, litres as whole numbers, and ids as integers.
// Form field names match the keys these schemas return.

import { z } from "zod";

import { MAX_LITRES_PER_PRODUCT } from "../constants.js";
import { isIsoDate, isTimeOfDay } from "../dates.js";
import { parseLitres, parseRupeesToPaisa } from "../money.js";
import { normalisePakistaniMobile } from "../phone.js";
import { percentToBasisPoints } from "../totals.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-()./]{7,20}$/;
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export function requiredText(label, max = 200) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
}

export function optionalText(label, max = 200) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .default("");
}

export function emailField(label = "Email") {
  return z
    .string()
    .trim()
    .max(120, `${label} is too long.`)
    .default("")
    .refine((value) => value === "" || EMAIL_PATTERN.test(value), `${label} must be a valid email address.`);
}

export function phoneField(label = "Phone") {
  return z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || PHONE_PATTERN.test(value), `${label} must be a valid phone number.`);
}

/** Optional Pakistani mobile number. Returns the normalised digits (92XXXXXXXXXX) or "". */
export function mobileField(label = "WhatsApp number") {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (value === "") {
        return "";
      }

      const digits = normalisePakistaniMobile(value);
      if (!digits) {
        ctx.addIssue({ code: "custom", message: `${label} must be a Pakistani mobile number, such as 0334 7266695.` });
        return z.NEVER;
      }
      return digits;
    });
}

/** NTN or STRN: digits only (spaces and hyphens are removed). Blank is allowed. */
export function taxNumberField(label, allowedLengths) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (value === "") {
        return "";
      }

      const digits = value.replace(/[\s-]/g, "");
      if (!/^\d+$/.test(digits) || !allowedLengths.includes(digits.length)) {
        ctx.addIssue({ code: "custom", message: `${label} must be ${allowedLengths.join(" or ")} digits.` });
        return z.NEVER;
      }
      return digits;
    });
}

export function isoDateField(label) {
  return z.string().trim().refine(isIsoDate, `${label} must be a valid date.`);
}

export function timeField(label) {
  return z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || isTimeOfDay(value), `${label} must be a time such as 09:30.`);
}

export function selectField(values, label) {
  return z.enum(values, `Choose a valid ${label}.`);
}

/** Record ids from forms (strings) or actions (numbers). */
export function idField(label) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const id = Number(String(value).trim());
    if (!Number.isSafeInteger(id) || id <= 0) {
      ctx.addIssue({ code: "custom", message: `${label} is not valid.` });
      return z.NEVER;
    }
    return id;
  });
}

/** Optional id: blank becomes null. */
export function optionalIdField(label) {
  return z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((value, ctx) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }

    const id = Number(String(value).trim());
    if (!Number.isSafeInteger(id) || id <= 0) {
      ctx.addIssue({ code: "custom", message: `${label} is not valid.` });
      return z.NEVER;
    }
    return id;
  });
}

/**
 * Money typed in rupees ("377.71", "1,200") converted to whole paisa.
 * @param {{ required?: boolean, allowZero?: boolean }} [options]
 */
export function moneyField(label, { required = true, allowZero = false } = {}) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (value === "") {
        if (required) {
          ctx.addIssue({ code: "custom", message: `${label} is required.` });
          return z.NEVER;
        }
        return 0;
      }

      const paisa = parseRupeesToPaisa(value);
      if (paisa === null) {
        ctx.addIssue({ code: "custom", message: `${label} must be an amount such as 377.71.` });
        return z.NEVER;
      }
      if (paisa === 0 && !allowZero) {
        ctx.addIssue({ code: "custom", message: `${label} must be more than zero.` });
        return z.NEVER;
      }
      return paisa;
    });
}

/**
 * Whole litres. Blank means 0 unless `required` is set.
 * @param {{ required?: boolean, allowZero?: boolean }} [options]
 */
export function litresField(label, { required = false, allowZero = true } = {}) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (value === "") {
        if (required) {
          ctx.addIssue({ code: "custom", message: `${label} is required.` });
          return z.NEVER;
        }
        return 0;
      }

      const litres = parseLitres(value);
      if (litres === null) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number of litres.` });
        return z.NEVER;
      }
      if (litres > MAX_LITRES_PER_PRODUCT) {
        ctx.addIssue({
          code: "custom",
          message: `${label} cannot be more than ${MAX_LITRES_PER_PRODUCT.toLocaleString("en-US")} litres.`,
        });
        return z.NEVER;
      }
      if (litres === 0 && !allowZero) {
        ctx.addIssue({ code: "custom", message: `${label} must be more than zero.` });
        return z.NEVER;
      }
      return litres;
    });
}

export function wholeNumberField(label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (!/^\d{1,9}$/.test(value)) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number.` });
        return z.NEVER;
      }

      const number = Number(value);
      if (number < min || number > max) {
        ctx.addIssue({ code: "custom", message: `${label} must be between ${min} and ${max}.` });
        return z.NEVER;
      }
      return number;
    });
}

/** Sales tax percentage typed as "18" or "17.5", converted to basis points. Blank means 0%. */
export function taxPercentField(label) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (value === "") {
        return 0;
      }

      const bps = percentToBasisPoints(value);
      if (bps === null) {
        ctx.addIssue({ code: "custom", message: `${label} must be a percentage between 0 and 50, such as 18.` });
        return z.NEVER;
      }
      return bps;
    });
}

/** A percentage with up to two decimals, e.g. 0.5. Returned as a number. */
export function decimalPercentField(label, max) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (!/^\d{1,2}(\.\d{1,2})?$/.test(value) || Number(value) > max) {
        ctx.addIssue({ code: "custom", message: `${label} must be a percentage from 0 to ${max}.` });
        return z.NEVER;
      }
      return Number(value);
    });
}

/** Bank IBAN. Spaces are removed and letters upper-cased. Blank is allowed. */
export function ibanField(label = "IBAN") {
  return z
    .string()
    .trim()
    .default("")
    .transform((value) => value.replace(/\s/g, "").toUpperCase())
    .refine((value) => value === "" || IBAN_PATTERN.test(value), `${label} must look like PK36SCBL0000001123456702.`);
}

export function booleanFlag() {
  return z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true" || value === "1");
}
