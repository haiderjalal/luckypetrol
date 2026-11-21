// Pakistani mobile numbers, normalised to international digits (92 3XX XXXXXXX) for WhatsApp links.

const MOBILE_DIGITS_PATTERN = /^923\d{9}$/;

/**
 * Accepts 03XX XXXXXXX, +92 3XX XXXXXXX, 00923XX... or 3XX XXXXXXX and returns "923XXXXXXXXX".
 * Returns null when the input is not a Pakistani mobile number.
 * @returns {string | null}
 */
export function normalisePakistaniMobile(value) {
  if (typeof value !== "string") {
    return null;
  }

  let digits = value.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (/^03\d{9}$/.test(digits)) {
    digits = `92${digits.slice(1)}`;
  } else if (/^3\d{9}$/.test(digits)) {
    digits = `92${digits}`;
  }

  return MOBILE_DIGITS_PATTERN.test(digits) ? digits : null;
}

/** "923347266695" becomes "+92 334 7266695". Other input is returned unchanged. */
export function formatMobileForDisplay(digits) {
  if (!MOBILE_DIGITS_PATTERN.test(digits)) {
    return digits;
  }

  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}
