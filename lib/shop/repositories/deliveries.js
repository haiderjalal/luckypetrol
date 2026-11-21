import { whereAll } from "./rows.js";

function deliveryDetail(db) {
  return db`
    select dl.id, dl.delivery_no, dl.order_id, dl.depot_id, dl.vehicle_no, dl.driver_name, dl.driver_phone,
      dl.seal_numbers, dl.status, dl.dispatched_on, dl.dispatched_at, dl.delivered_on, dl.delivered_at,
      dl.created_by,
      d.name as depot_name, d.location as depot_location,
      o.order_no, o.delivery_address, o.delivery_date, o.window_start, o.window_end, o.total_litres,
      o.customer_id, c.name as customer_name, c.phone as customer_phone, c.whatsapp as customer_whatsapp
    from shop.deliveries dl
    join shop.depots d on d.id = dl.depot_id
    join shop.orders o on o.id = dl.order_id
    join shop.customers c on c.id = o.customer_id`;
}

export async function insertDelivery(db, values) {
  const [{ id }] = await db`insert into shop.deliveries ${db(values)} returning id`;
  return Number(id);
}

export async function insertDeliveryItem(db, values) {
  const [{ id }] = await db`insert into shop.delivery_items ${db(values)} returning id`;
  return Number(id);
}

export async function findDeliveryRow(db, id) {
  const [row] = await db`${deliveryDetail(db)} where dl.id = ${id}`;
  return row ?? null;
}

/** Loaded litres per product, with the delivered litres recorded on the order item. */
export async function deliveryItems(db, deliveryId) {
  const rows = await db`
    select di.product_code, di.loaded_litres, oi.id as order_item_id, oi.delivered_litres
    from shop.delivery_items di
    join shop.deliveries dl on dl.id = di.delivery_id
    join shop.order_items oi on oi.order_id = dl.order_id and oi.product_code = di.product_code
    where di.delivery_id = ${deliveryId}
    order by di.product_code`;
  return [...rows];
}

export async function findDeliveryByOrder(db, orderId) {
  const [row] = await db`
    select id, delivery_no, status, vehicle_no, dispatched_on, delivered_on
    from shop.deliveries where order_id = ${orderId}`;
  return row ?? null;
}

export async function markDeliveryCompleted(db, id, deliveredOn, deliveredAt) {
  const result = await db`
    update shop.deliveries
    set status = 'delivered', delivered_on = ${deliveredOn}, delivered_at = ${deliveredAt}
    where id = ${id}`;
  return result.count;
}

export async function listDeliveries(db, { status = "", limit, offset }) {
  const conditions = status ? [db`dl.status = ${status}`] : [];
  const where = whereAll(db, conditions);

  const [{ total }] = await db`select count(*) as total from shop.deliveries dl ${where}`;
  const rows = await db`
    select dl.id, dl.delivery_no, dl.status, dl.vehicle_no, dl.dispatched_on, dl.delivered_on,
      o.order_no, o.total_litres, c.name as customer_name, d.name as depot_name
    from shop.deliveries dl
    join shop.orders o on o.id = dl.order_id
    join shop.customers c on c.id = o.customer_id
    join shop.depots d on d.id = dl.depot_id
    ${where}
    order by dl.dispatched_at desc, dl.id desc
    limit ${limit} offset ${offset}`;
  return { rows: [...rows], total: Number(total) };
}

/** Confirmed orders waiting to be loaded, earliest delivery first. Orders without a window come first in their day. */
export async function ordersAwaitingDispatch(db) {
  const rows = await db`
    select o.id, o.order_no, o.delivery_date, o.window_start, o.window_end, o.delivery_address,
      o.total_litres, o.estimated_paisa, c.name as customer_name
    from shop.orders o
    join shop.customers c on c.id = o.customer_id
    where o.status = 'confirmed'
    order by o.delivery_date, o.window_start nulls first, o.id`;
  return [...rows];
}
