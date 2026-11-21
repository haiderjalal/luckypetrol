// Invoice totals. All arithmetic is integer paisa; percentages are basis points (1800 = 18%).

export const MAX_TAX_RATE_BPS = 5000;

/**
 * Splits the gross value of invoice lines into taxable value, sales tax and total.
 * - inclusive: line rates already contain sales tax, so tax is backed out of the total.
 * - exclusive: line rates are net, so tax is added on top.
 * @param {{ linesTotalPaisa: number, taxMode: "inclusive" | "exclusive", taxRateBps: number }} input
 * @returns {{ subtotalPaisa: number, taxPaisa: number, totalPaisa: number }}
 */
export function computeInvoiceTotals({ linesTotalPaisa, taxMode, taxRateBps }) {
  if (!Number.isSafeInteger(linesTotalPaisa) || linesTotalPaisa < 0) {
    throw new RangeError("linesTotalPaisa must be a non-negative integer.");
  }
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > MAX_TAX_RATE_BPS) {
    throw new RangeError("taxRateBps is out of range.");
  }
  if (taxMode !== "inclusive" && taxMode !== "exclusive") {
    throw new RangeError("taxMode must be inclusive or exclusive.");
  }

  if (taxRateBps === 0) {
    return { subtotalPaisa: linesTotalPaisa, taxPaisa: 0, totalPaisa: linesTotalPaisa };
  }

  if (taxMode === "exclusive") {
    const taxPaisa = Math.round((linesTotalPaisa * taxRateBps) / 10000);
    return { subtotalPaisa: linesTotalPaisa, taxPaisa, totalPaisa: linesTotalPaisa + taxPaisa };
  }

  const subtotalPaisa = Math.round((linesTotalPaisa * 10000) / (10000 + taxRateBps));
  return { subtotalPaisa, taxPaisa: linesTotalPaisa - subtotalPaisa, totalPaisa: linesTotalPaisa };
}

/** Converts a percentage typed by staff (e.g. 18 or 17.5) into basis points. Returns null when invalid. */
export function percentToBasisPoints(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const bps = Math.round(Number(text) * 100);
  return bps <= MAX_TAX_RATE_BPS ? bps : null;
}

export function basisPointsToPercent(bps) {
  return (bps / 100).toFixed(2).replace(/\.?0+$/, "");
}
