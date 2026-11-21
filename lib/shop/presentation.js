// Display helpers: colour tones for status badges and option lists for selects. Pure, so both server and client code can use it.

import { CUSTOMER_STATUS_LABELS } from "./constants.js";

export const ORDER_STATUS_TONE = {
  received: "amber",
  confirmed: "blue",
  dispatched: "blue",
  delivered: "green",
  cancelled: "grey",
};

export const INVOICE_STATUS_TONE = {
  issued: "green",
  cancelled: "grey",
};

export const PAYMENT_STATE_TONE = {
  unpaid: "red",
  partial: "amber",
  paid: "green",
  cancelled: "grey",
};

export const PAYMENT_STATUS_TONE = {
  posted: "green",
  voided: "grey",
};

export const DELIVERY_STATUS_TONE = {
  in_transit: "blue",
  delivered: "green",
};

export const CUSTOMER_STATUS_TONE = {
  active: "green",
  inactive: "grey",
  blocked: "red",
};

export function toneFor(toneMap, key) {
  return toneMap[key] ?? "grey";
}

/** Options for a filter select: an "all" entry followed by every label. */
export function filterOptions(labels, allLabel) {
  return [{ value: "", label: allLabel }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))];
}

/** Options for a form select with a placeholder first. */
export function selectOptions(labels, placeholder = "Choose…") {
  return [{ value: "", label: placeholder }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))];
}

export const CUSTOMER_STATUS_OPTIONS = Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => ({ value, label }));
