// Money is stored as whole paisa (1 rupee = 100 paisa). Stored amounts are never floats.

const RUPEE_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const LITRE_PATTERN = /^\d{1,9}$/;

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/**
 * Parses an amount such as "1,234.5", "Rs. 377.71" or 377.71 into whole paisa.
 * Returns null unless the input is a non-negative amount with at most two decimals.
 * @returns {number | null}
 */
export function parseRupeesToPaisa(value) {
  const text = typeof value === "number" ? numberToText(value) : String(value ?? "");
  const cleaned = text.trim().replace(/,/g, "").replace(/^rs\.?\s*/i, "");
  if (!RUPEE_PATTERN.test(cleaned)) {
    return null;
  }

  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function numberToText(value) {
  return Number.isFinite(value) && value >= 0 ? value.toFixed(2) : "";
}

/**
 * Parses a whole number of litres such as "5,000". Blank, decimal, negative or non-numeric input returns null.
 * @returns {number | null}
 */
export function parseLitres(value) {
  const cleaned = String(value ?? "").trim().replace(/,/g, "");
  if (!LITRE_PATTERN.test(cleaned)) {
    return null;
  }

  return Number(cleaned);
}

/** Paisa as typed in a form: 1234567 becomes "12345.67". */
export function paisaToInput(paisa) {
  return (paisa / 100).toFixed(2);
}

/** Formats paisa as "12,34,567.50" (lakh grouping, no currency symbol). */
export function formatPaisa(paisa) {
  const sign = paisa < 0 ? "-" : "";
  const absolute = Math.abs(paisa);
  const rupees = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, "0");
  return `${sign}${groupDigits(rupees)}.${cents}`;
}

/** Formats paisa with the rupee prefix used on invoices and receipts: "Rs. 12,34,567.50". */
export function formatRupees(paisa) {
  return `Rs. ${formatPaisa(paisa)}`;
}

/** Formats a whole number of litres, e.g. 5000 becomes "5,000". */
export function formatLitres(litres) {
  const sign = litres < 0 ? "-" : "";
  return `${sign}${groupDigits(Math.abs(litres))}`;
}

/** Groups digits the way Pakistani documents do: 1234567 becomes "12,34,567". */
export function groupDigits(value) {
  const digits = String(Math.trunc(value));
  if (digits.length <= 3) {
    return digits;
  }

  let rest = digits.slice(0, -3);
  const groups = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) {
    groups.unshift(rest);
  }

  return `${groups.join(",")},${digits.slice(-3)}`;
}

/** Spells out an amount for invoices, e.g. "Rupees Five Thousand Only". */
export function amountInWords(paisa) {
  if (paisa < 0) {
    return `Minus ${amountInWords(-paisa)}`;
  }

  const rupees = Math.floor(paisa / 100);
  const cents = paisa % 100;
  const rupeeText = rupees === 0 ? "Zero" : integerToWords(rupees);
  const base = `Rupees ${rupeeText}`;
  return cents > 0 ? `${base} and ${integerToWords(cents)} Paisa Only` : `${base} Only`;
}

function belowThousand(value) {
  const parts = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;

  if (hundreds) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }

  if (remainder) {
    if (remainder < 20) {
      parts.push(ONES[remainder]);
    } else {
      const ones = remainder % 10;
      parts.push(ones ? `${TENS[Math.floor(remainder / 10)]} ${ONES[ones]}` : TENS[Math.floor(remainder / 10)]);
    }
  }

  return parts.join(" ");
}

function integerToWords(value) {
  if (value === 0) {
    return "";
  }

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  const parts = [];

  if (crore) {
    parts.push(`${integerToWords(crore)} Crore`);
  }
  if (lakh) {
    parts.push(`${belowThousand(lakh)} Lakh`);
  }
  if (thousand) {
    parts.push(`${belowThousand(thousand)} Thousand`);
  }
  if (rest) {
    parts.push(belowThousand(rest));
  }

  return parts.join(" ");
}
