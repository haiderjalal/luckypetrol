import { insertInto, toCamelRow, toCamelRows } from "./rows.js";

export function listProducts(db) {
  return toCamelRows(db.prepare("SELECT code, name, short_name, sort_order FROM products ORDER BY sort_order").all());
}

/**
 * The rate in force on `date` for every product: the latest rate whose effective date is on or before `date`.
 * A product with no rate yet comes back with `ratePaisa: null`.
 */
export function ratesEffectiveOn(db, date) {
  return toCamelRows(
    db
      .prepare(
        `SELECT p.code AS product_code, p.name, p.short_name, p.sort_order,
                r.rate_paisa, r.effective_from
         FROM products p
         LEFT JOIN product_rates r
           ON r.product_code = p.code
          AND r.effective_from = (
                SELECT MAX(x.effective_from) FROM product_rates x
                WHERE x.product_code = p.code AND x.effective_from <= ?)
         ORDER BY p.sort_order`,
      )
      .all(date),
  );
}

export function findRateEffectiveOn(db, productCode, date) {
  return toCamelRow(
    db
      .prepare(
        `SELECT rate_paisa, effective_from FROM product_rates
         WHERE product_code = ? AND effective_from <= ?
         ORDER BY effective_from DESC, id DESC LIMIT 1`,
      )
      .get(productCode, date),
  );
}

export function findRateOnDate(db, productCode, effectiveFrom) {
  return toCamelRow(
    db.prepare("SELECT id, rate_paisa, effective_from FROM product_rates WHERE product_code = ? AND effective_from = ?").get(productCode, effectiveFrom),
  );
}

export function insertRate(db, values) {
  return insertInto(db, "product_rates", values);
}

export function rateHistory(db, limit) {
  return toCamelRows(
    db
      .prepare(
        `SELECT r.id, r.product_code, p.short_name, r.rate_paisa, r.effective_from, r.created_by, r.created_at
         FROM product_rates r JOIN products p ON p.code = r.product_code
         ORDER BY r.effective_from DESC, r.id DESC LIMIT ?`,
      )
      .all(limit),
  );
}
