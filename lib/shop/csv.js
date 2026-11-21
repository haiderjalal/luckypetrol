// CSV export. Text cells that start with = + - @ get a leading apostrophe so spreadsheets do not run them as formulas.
// A UTF-8 byte-order mark lets Excel read Urdu and other non-ASCII text correctly.

const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  let text = String(value);
  if (FORMULA_START.test(text)) {
    text = `'${text}`;
  }

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** @param {string[]} headers @param {Array<Array<string | number | null>>} rows */
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
