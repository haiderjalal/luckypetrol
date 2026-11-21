import { PRODUCT_LABELS } from "../constants.js";
import { formatDate, todayIso } from "../dates.js";
import { currentDb, transaction } from "../db.js";
import { ShopError } from "../errors.js";
import { formatRupees } from "../money.js";
import { findRateOnDate, insertRate, rateHistory, ratesEffectiveOn } from "../repositories/prices.js";
import { recordAudit } from "./audit.js";

/** The rate card in force on `today`. A product with no rate yet is returned with `ratePaisa: null`. */
export async function getRateCard(today = todayIso()) {
  const db = currentDb();
  const rows = await ratesEffectiveOn(db, today);
  return {
    date: today,
    products: rows.map((row) => ({
      productCode: row.productCode,
      label: PRODUCT_LABELS[row.productCode] ?? row.productCode,
      ratePaisa: row.ratePaisa,
      effectiveFrom: row.effectiveFrom,
    })),
  };
}

export async function getRateHistory(limit = 60) {
  const db = currentDb();
  return rateHistory(db, limit);
}

/**
 * Sets the rate from a date. Past dates are refused, so the history matches what was charged.
 * Orders and invoices keep the rate they were made with.
 */
export async function setRate(input, actor) {
  return transaction(async (db) => {
    const today = todayIso();
    if (input.effectiveFrom < today) {
      throw new ShopError("Rates cannot be back-dated. Choose today or a later date.", {
        fieldErrors: { effectiveFrom: "Choose today or a later date." },
      });
    }

    const label = PRODUCT_LABELS[input.productCode] ?? input.productCode;
    if (await findRateOnDate(db, input.productCode, input.effectiveFrom)) {
      throw new ShopError(`A ${label} rate already starts on ${formatDate(input.effectiveFrom)}. Choose another date.`, {
        fieldErrors: { effectiveFrom: "A rate already starts on this date." },
      });
    }

    await insertRate(db, {
      product_code: input.productCode,
      rate_paisa: input.rate,
      effective_from: input.effectiveFrom,
      created_by: actor,
    });

    await recordAudit(db, {
      actor,
      action: "rate.set",
      entityType: "product",
      entityId: input.productCode,
      summary: `${label} set to ${formatRupees(input.rate)} per litre from ${formatDate(input.effectiveFrom)}`,
    });

    return {
      message: `${label} set to ${formatRupees(input.rate)} per litre from ${formatDate(input.effectiveFrom)}.`,
    };
  });
}
