import { insertInto, toCamelRow, toCamelRows } from "./rows.js";

export function insertDepot(db, values) {
  return insertInto(db, "depots", values);
}

export function listDepots(db) {
  return toCamelRows(db.prepare("SELECT id, code, name, location, is_active, created_at FROM depots ORDER BY code").all());
}

export function findDepot(db, id) {
  return toCamelRow(db.prepare("SELECT id, code, name, location, is_active FROM depots WHERE id = ?").get(id));
}

export function insertTank(db, values) {
  return insertInto(db, "tanks", values);
}

export function findDepotByCode(db, code) {
  return toCamelRow(db.prepare("SELECT id, code, name FROM depots WHERE code = ?").get(code));
}

export function findTankByDepotAndName(db, depotId, name) {
  return toCamelRow(db.prepare("SELECT id, name FROM tanks WHERE depot_id = ? AND name = ?").get(depotId, name));
}

export function findTank(db, id) {
  return toCamelRow(
    db
      .prepare(
        `SELECT t.id, t.depot_id, t.name, t.product_code, t.capacity_litres, t.is_active,
                d.code AS depot_code, d.name AS depot_name
         FROM tanks t JOIN depots d ON d.id = t.depot_id
         WHERE t.id = ?`,
      )
      .get(id),
  );
}

/** Book stock = sum of all movements for the tank (receipts and returns are positive, dispatches negative). */
export function tankBookLitres(db, tankId) {
  return Number(db.prepare("SELECT COALESCE(SUM(litres), 0) AS book FROM stock_movements WHERE tank_id = ?").get(tankId).book);
}

/** Every tank with its book stock and most recent dip. Used by the inventory and dashboard screens. */
export function listTankRows(db) {
  return toCamelRows(
    db
      .prepare(
        `SELECT t.id, t.depot_id, t.name, t.product_code, t.capacity_litres, t.is_active,
                d.code AS depot_code, d.name AS depot_name,
                COALESCE((SELECT SUM(m.litres) FROM stock_movements m WHERE m.tank_id = t.id), 0) AS book_litres,
                (SELECT dp.measured_litres FROM dip_readings dp WHERE dp.tank_id = t.id ORDER BY dp.id DESC LIMIT 1) AS last_dip_litres,
                (SELECT dp.measured_on FROM dip_readings dp WHERE dp.tank_id = t.id ORDER BY dp.id DESC LIMIT 1) AS last_dip_on,
                (SELECT dp.book_litres FROM dip_readings dp WHERE dp.tank_id = t.id ORDER BY dp.id DESC LIMIT 1) AS last_dip_book_litres,
                (SELECT dp.variance_litres FROM dip_readings dp WHERE dp.tank_id = t.id ORDER BY dp.id DESC LIMIT 1) AS last_variance_litres
         FROM tanks t
         JOIN depots d ON d.id = t.depot_id
         ORDER BY d.code, t.name`,
      )
      .all(),
  );
}

/** Active tanks of one product at one depot, fullest first. Dispatch draws from them in this order. */
export function tanksForDispatch(db, depotId, productCode) {
  return toCamelRows(
    db
      .prepare(
        `SELECT t.id, t.name, t.capacity_litres, COALESCE(SUM(m.litres), 0) AS book_litres
         FROM tanks t
         LEFT JOIN stock_movements m ON m.tank_id = t.id
         WHERE t.depot_id = ? AND t.product_code = ? AND t.is_active = 1
         GROUP BY t.id
         ORDER BY book_litres DESC, t.id`,
      )
      .all(depotId, productCode),
  );
}

export function firstActiveTankForProduct(db, depotId, productCode) {
  return toCamelRow(
    db
      .prepare("SELECT id, name, capacity_litres FROM tanks WHERE depot_id = ? AND product_code = ? AND is_active = 1 ORDER BY id LIMIT 1")
      .get(depotId, productCode),
  );
}

export function insertMovement(db, values) {
  return insertInto(db, "stock_movements", values);
}

export function insertDip(db, values) {
  return insertInto(db, "dip_readings", values);
}

export function movementsForTank(db, tankId, limit) {
  return toCamelRows(
    db
      .prepare(
        `SELECT id, movement_type, litres, reference, occurred_on, created_by, created_at
         FROM stock_movements WHERE tank_id = ? ORDER BY id DESC LIMIT ?`,
      )
      .all(tankId, limit),
  );
}

export function dipsForTank(db, tankId, limit) {
  return toCamelRows(
    db
      .prepare(
        `SELECT id, measured_on, measured_litres, book_litres, variance_litres, adjusted, notes, created_by, created_at
         FROM dip_readings WHERE tank_id = ? ORDER BY id DESC LIMIT ?`,
      )
      .all(tankId, limit),
  );
}

/** Book stock and capacity per product across all active tanks. */
export function productStockTotals(db) {
  return toCamelRows(
    db
      .prepare(
        `SELECT t.product_code, COUNT(*) AS tank_count, SUM(t.capacity_litres) AS capacity_litres,
                COALESCE(SUM(b.book_litres), 0) AS book_litres
         FROM tanks t
         LEFT JOIN (SELECT tank_id, SUM(litres) AS book_litres FROM stock_movements GROUP BY tank_id) b
           ON b.tank_id = t.id
         WHERE t.is_active = 1
         GROUP BY t.product_code`,
      )
      .all(),
  );
}
