export async function listProducts(db) {
  const rows = await db`select code, name, short_name, sort_order from shop.products order by sort_order`;
  return [...rows];
}

/**
 * The rate in force on `date` for every product: the latest rate whose effective date is on or before `date`.
 * A product with no rate yet comes back with `rate_paisa` null.
 */
export async function ratesEffectiveOn(db, date) {
  const rows = await db`
    select p.code as product_code, p.name, p.short_name, p.sort_order, r.rate_paisa, r.effective_from
    from shop.products p
    left join shop.product_rates r
      on r.product_code = p.code
     and r.effective_from = (
       select max(x.effective_from) from shop.product_rates x
       where x.product_code = p.code and x.effective_from <= ${date}
     )
    order by p.sort_order`;
  return [...rows];
}

export async function findRateEffectiveOn(db, productCode, date) {
  const [row] = await db`
    select rate_paisa, effective_from from shop.product_rates
    where product_code = ${productCode} and effective_from <= ${date}
    order by effective_from desc, id desc limit 1`;
  return row ?? null;
}

export async function findRateOnDate(db, productCode, effectiveFrom) {
  const [row] = await db`
    select id, rate_paisa, effective_from from shop.product_rates
    where product_code = ${productCode} and effective_from = ${effectiveFrom}`;
  return row ?? null;
}

export async function insertRate(db, values) {
  const [{ id }] = await db`insert into shop.product_rates ${db(values)} returning id`;
  return Number(id);
}

export async function rateHistory(db, limit) {
  const rows = await db`
    select r.id, r.product_code, p.short_name, r.rate_paisa, r.effective_from, r.created_by, r.created_at
    from shop.product_rates r
    join shop.products p on p.code = r.product_code
    order by r.effective_from desc, r.id desc
    limit ${limit}`;
  return [...rows];
}
