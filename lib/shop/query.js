// Small helpers that turn URL search parameters into safe filter values.

import { isIsoDate } from "./dates.js";

/** Returns a positive integer id, or null when the value is not one. */
export function parseOptionalId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Returns the value only if it is a key of `allowed`; otherwise an empty string (meaning "all"). */
export function pickAllowed(value, allowed) {
  return typeof value === "string" && Object.hasOwn(allowed, value) ? value : "";
}

export function cleanSearch(value, max = 80) {
  return String(value ?? "").trim().slice(0, max);
}

export function cleanDate(value, fallback = "") {
  return isIsoDate(value) ? value : fallback;
}

/** Reads one URL search parameter. A repeated parameter uses its first value. */
export function readParam(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

/** Converts paisa to a rupee number for CSV files, e.g. 1234567 becomes 12345.67. */
export function paisaToRupees(paisa) {
  return Number((paisa / 100).toFixed(2));
}
