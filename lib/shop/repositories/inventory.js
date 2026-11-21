export async function insertDepot(db, values) {
  const [{ id }] = await db`insert into shop.depots ${db(values)} returning id`;
  return Number(id);
}

export async function listDepots(db) {
  const rows = await db`select id, code, name, location, is_active, created_at from shop.depots order by code`;
  return [...rows];
}

export async function findDepot(db, id) {
  const [row] = await db`select id, code, name, location, is_active from shop.depots where id = ${id}`;
  return row ?? null;
}

export async function insertTank(db, values) {
  const [{ id }] = await db`insert into shop.tanks ${db(values)} returning id`;
  return Number(id);
}

export async function findDepotByCode(db, code) {
  const [row] = await db`select id, code, name from shop.depots where code = ${code}`;
  return row ?? null;
}

export async function findTankByDepotAndName(db, depotId, name) {
  const [row] = await db`select id, name from shop.tanks where depot_id = ${depotId} and name = ${name}`;
  return row ?? null;
}

export async function findTank(db, id) {
  const [row] = await db`
    select t.id, t.depot_id, t.name, t.product_code, t.capacity_litres, t.is_active,
      d.code as depot_code, d.name as depot_name
    from shop.tanks t
    join shop.depots d on d.id = t.depot_id
    where t.id = ${id}`;
  return row ?? null;
}

/** Book stock = sum of all movements for the tank (receipts and returns are positive, dispatches negative). */
export async function tankBookLitres(db, tankId) {
  const [row] = await db`
    select coalesce(sum(litres), 0) as book from shop.stock_movements where tank_id = ${tankId}`;
  return Number(row.book);
}

/** Every tank with its book stock and most recent dip. Used by the inventory and dashboard screens. */
export async function listTankRows(db) {
  const rows = await db`
    select t.id, t.depot_id, t.name, t.product_code, t.capacity_litres, t.is_active,
      d.code as depot_code, d.name as depot_name,
      coalesce((select sum(m.litres) from shop.stock_movements m where m.tank_id = t.id), 0) as book_litres,
      (select dp.measured_litres from shop.dip_readings dp where dp.tank_id = t.id
        order by dp.id desc limit 1) as last_dip_litres,
      (select dp.measured_on from shop.dip_readings dp where dp.tank_id = t.id
        order by dp.id desc limit 1) as last_dip_on,
      (select dp.book_litres from shop.dip_readings dp where dp.tank_id = t.id
        order by dp.id desc limit 1) as last_dip_book_litres,
      (select dp.variance_litres from shop.dip_readings dp where dp.tank_id = t.id
        order by dp.id desc limit 1) as last_variance_litres
    from shop.tanks t
    join shop.depots d on d.id = t.depot_id
    order by d.code, t.name`;
  return [...rows];
}

/** Active tanks of one product at one depot, fullest first. Dispatch draws from them in this order. */
export async function tanksForDispatch(db, depotId, productCode) {
  const rows = await db`
    select t.id, t.name, t.capacity_litres, coalesce(sum(m.litres), 0) as book_litres
    from shop.tanks t
    left join shop.stock_movements m on m.tank_id = t.id
    where t.depot_id = ${depotId} and t.product_code = ${productCode} and t.is_active
    group by t.id
    order by book_litres desc, t.id`;
  return [...rows];
}

export async function firstActiveTankForProduct(db, depotId, productCode) {
  const [row] = await db`
    select id, name, capacity_litres from shop.tanks
    where depot_id = ${depotId} and product_code = ${productCode} and is_active
    order by id limit 1`;
  return row ?? null;
}

export async function insertMovement(db, values) {
  const [{ id }] = await db`insert into shop.stock_movements ${db(values)} returning id`;
  return Number(id);
}

export async function insertDip(db, values) {
  const [{ id }] = await db`insert into shop.dip_readings ${db(values)} returning id`;
  return Number(id);
}

export async function movementsForTank(db, tankId, limit) {
  const rows = await db`
    select id, movement_type, litres, reference, occurred_on, created_by, created_at
    from shop.stock_movements where tank_id = ${tankId}
    order by id desc limit ${limit}`;
  return [...rows];
}

export async function dipsForTank(db, tankId, limit) {
  const rows = await db`
    select id, measured_on, measured_litres, book_litres, variance_litres, adjusted, notes, created_by, created_at
    from shop.dip_readings where tank_id = ${tankId}
    order by id desc limit ${limit}`;
  return [...rows];
}

/** Book stock and capacity per product across all active tanks. */
export async function productStockTotals(db) {
  const rows = await db`
    select t.product_code, count(*) as tank_count, sum(t.capacity_litres) as capacity_litres,
      coalesce(sum(b.book_litres), 0) as book_litres
    from shop.tanks t
    left join (
      select tank_id, sum(litres) as book_litres from shop.stock_movements group by tank_id
    ) b on b.tank_id = t.id
    where t.is_active
    group by t.product_code`;
  return [...rows];
}
