import { likePattern, whereAll } from "./rows.js";

function orderDetail(db) {
  return db`
    select o.id, o.order_no, o.customer_id, o.site_id, o.delivery_address, o.delivery_date,
      o.window_start, o.window_end, o.source, o.status, o.total_litres, o.estimated_paisa,
      o.notes, o.credit_override_note, o.cancel_reason, o.created_by, o.created_at, o.updated_at,
      c.name as customer_name, c.code as customer_code, c.customer_type, c.status as customer_status,
      c.whatsapp as customer_whatsapp, c.phone as customer_phone, c.contact_person as customer_contact,
      c.address as customer_address, c.ntn as customer_ntn, c.strn as customer_strn,
      c.credit_limit_paisa, c.payment_terms_days
    from shop.orders o
    join shop.customers c on c.id = o.customer_id`;
}

export async function findOrderRow(db, id) {
  const [row] = await db`${orderDetail(db)} where o.id = ${id}`;
  return row ?? null;
}

export async function orderItems(db, orderId) {
  const rows = await db`
    select id, order_id, product_code, ordered_litres, delivered_litres,
      list_rate_paisa, discount_paisa, rate_paisa
    from shop.order_items where order_id = ${orderId} order by id`;
  return [...rows];
}

export async function insertOrder(db, values) {
  const [{ id }] = await db`insert into shop.orders ${db(values)} returning id`;
  return Number(id);
}

export async function insertOrderItem(db, values) {
  const [{ id }] = await db`insert into shop.order_items ${db(values)} returning id`;
  return Number(id);
}

export async function setOrderStatus(db, id, status) {
  const result = await db`update shop.orders set status = ${status} where id = ${id}`;
  return result.count;
}

export async function setOrderCreditNote(db, id, note) {
  const result = await db`update shop.orders set credit_override_note = ${note} where id = ${id}`;
  return result.count;
}

export async function setOrderCancelled(db, id, reason) {
  const result = await db`update shop.orders set status = 'cancelled', cancel_reason = ${reason} where id = ${id}`;
  return result.count;
}

export async function setItemDelivered(db, itemId, deliveredLitres) {
  const result = await db`update shop.order_items set delivered_litres = ${deliveredLitres} where id = ${itemId}`;
  return result.count;
}

export async function listOrders(db, { status = "", customerId = null, search = "", from = "", to = "", limit, offset }) {
  const conditions = [];
  if (from) {
    conditions.push(db`o.delivery_date >= ${from}`);
  }
  if (to) {
    conditions.push(db`o.delivery_date <= ${to}`);
  }
  if (status) {
    conditions.push(db`o.status = ${status}`);
  }
  if (customerId) {
    conditions.push(db`o.customer_id = ${customerId}`);
  }
  if (search) {
    const pattern = likePattern(search);
    conditions.push(db`(o.order_no ilike ${pattern} or c.name ilike ${pattern})`);
  }
  const where = whereAll(db, conditions);

  const [{ total }] = await db`
    select count(*) as total from shop.orders o
    join shop.customers c on c.id = o.customer_id ${where}`;
  const rows = await db`
    select o.id, o.order_no, o.customer_id, o.delivery_date, o.window_start, o.window_end,
      o.source, o.status, o.total_litres, o.estimated_paisa, o.created_at,
      c.name as customer_name, c.customer_type,
      (select count(*) from shop.invoices i where i.order_id = o.id and i.status = 'issued') as invoice_count
    from shop.orders o
    join shop.customers c on c.id = o.customer_id
    ${where}
    order by o.created_at desc, o.id desc
    limit ${limit} offset ${offset}`;
  return { rows: [...rows], total: Number(total) };
}

/**
 * Estimated value of a customer's confirmed orders that are not yet invoiced.
 * Counted against the credit limit so that several orders cannot exceed it together.
 */
export async function openOrderExposurePaisa(db, customerId) {
  const [row] = await db`
    select coalesce(sum(o.estimated_paisa), 0) as exposure
    from shop.orders o
    where o.customer_id = ${customerId}
      and o.status in ('confirmed', 'dispatched', 'delivered')
      and not exists (select 1 from shop.invoices i where i.order_id = o.id and i.status = 'issued')`;
  return Number(row.exposure);
}
