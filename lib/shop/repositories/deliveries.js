import { insertInto, toCamelRow, toCamelRows, updateRow } from "./rows.js";

const DELIVERY_DETAIL_SQL = `
  SELECT dl.id, dl.delivery_no, dl.order_id, dl.depot_id, dl.vehicle_no, dl.driver_name, dl.driver_phone,
         dl.seal_numbers, dl.status, dl.dispatched_on, dl.dispatched_at, dl.delivered_on, dl.delivered_at,
         dl.created_by,
         d.name AS depot_name, d.location AS depot_location,
         o.order_no, o.delivery_address, o.delivery_date, o.window_start, o.window_end, o.total_litres,
         o.customer_id, c.name AS customer_name, c.phone AS customer_phone, c.whatsapp AS customer_whatsapp
  FROM deliveries dl
  JOIN depots d ON d.id = dl.depot_id
  JOIN orders o ON o.id = dl.order_id
  JOIN customers c ON c.id = o.customer_id`;

export function insertDelivery(db, values) {
  return insertInto(db, "deliveries", values);
}

export function insertDeliveryItem(db, values) {
  return insertInto(db, "delivery_items", values);
}

export function findDeliveryRow(db, id) {
  return toCamelRow(db.prepare(`${DELIVERY_DETAIL_SQL} WHERE dl.id = ?`).get(id));
}

/** Loaded litres per product, with the delivered litres recorded on the order item. */
export function deliveryItems(db, deliveryId) {
  return toCamelRows(
    db
      .prepare(
        `SELECT di.product_code, di.loaded_litres, oi.id AS order_item_id, oi.delivered_litres
         FROM delivery_items di
         JOIN deliveries dl ON dl.id = di.delivery_id
         JOIN order_items oi ON oi.order_id = dl.order_id AND oi.product_code = di.product_code
         WHERE di.delivery_id = ?
         ORDER BY di.product_code`,
      )
      .all(deliveryId),
  );
}

export function findDeliveryByOrder(db, orderId) {
  return toCamelRow(
    db.prepare("SELECT id, delivery_no, status, vehicle_no, dispatched_on, delivered_on FROM deliveries WHERE order_id = ?").get(orderId),
  );
}

export function markDeliveryCompleted(db, id, deliveredOn, deliveredAt) {
  return updateRow(db, "deliveries", id, { status: "delivered", delivered_on: deliveredOn, delivered_at: deliveredAt });
}

export function listDeliveries(db, { status = "", limit, offset }) {
  const where = status ? "WHERE dl.status = ?" : "";
  const params = status ? [status] : [];
  const total = Number(db.prepare(`SELECT COUNT(*) AS total FROM deliveries dl ${where}`).get(...params).total);
  const rows = db
    .prepare(
      `SELECT dl.id, dl.delivery_no, dl.status, dl.vehicle_no, dl.dispatched_on, dl.delivered_on,
              o.order_no, o.total_litres, c.name AS customer_name, d.name AS depot_name
       FROM deliveries dl
       JOIN orders o ON o.id = dl.order_id
       JOIN customers c ON c.id = o.customer_id
       JOIN depots d ON d.id = dl.depot_id
       ${where}
       ORDER BY dl.dispatched_at DESC, dl.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);

  return { rows: toCamelRows(rows), total };
}

/** Confirmed orders waiting to be loaded, earliest delivery first. */
export function ordersAwaitingDispatch(db) {
  return toCamelRows(
    db
      .prepare(
        `SELECT o.id, o.order_no, o.delivery_date, o.window_start, o.window_end, o.delivery_address,
                o.total_litres, o.estimated_paisa, c.name AS customer_name
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE o.status = 'confirmed'
         ORDER BY o.delivery_date, o.window_start, o.id`,
      )
      .all(),
  );
}
