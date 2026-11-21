import { likePattern, whereAll } from "./rows.js";

function paymentSelect(db) {
  return db`
    select p.id, p.receipt_no, p.customer_id, p.amount_paisa, p.method, p.reference, p.bank_name,
      p.received_on, p.status, p.notes, p.void_reason, p.voided_at, p.created_by, p.created_at,
      c.name as customer_name, c.code as customer_code,
      coalesce((select sum(a.amount_paisa) from shop.payment_allocations a where a.payment_id = p.id), 0)
        as allocated_paisa
    from shop.payments p
    join shop.customers c on c.id = p.customer_id`;
}

export async function insertPayment(db, values) {
  const [{ id }] = await db`insert into shop.payments ${db(values)} returning id`;
  return Number(id);
}

export async function insertAllocation(db, values) {
  const [{ id }] = await db`insert into shop.payment_allocations ${db(values)} returning id`;
  return Number(id);
}

export async function findPaymentRow(db, id) {
  const [row] = await db`${paymentSelect(db)} where p.id = ${id}`;
  return row ?? null;
}

export async function paymentAllocations(db, paymentId) {
  const rows = await db`
    select a.id, a.invoice_id, a.amount_paisa, i.invoice_no, i.invoice_date
    from shop.payment_allocations a
    join shop.invoices i on i.id = a.invoice_id
    where a.payment_id = ${paymentId}
    order by a.id`;
  return [...rows];
}

export async function allocatedForPayment(db, paymentId) {
  const [row] = await db`
    select coalesce(sum(amount_paisa), 0) as allocated from shop.payment_allocations
    where payment_id = ${paymentId}`;
  return Number(row.allocated);
}

export async function deleteAllocationsForPayment(db, paymentId) {
  const result = await db`delete from shop.payment_allocations where payment_id = ${paymentId}`;
  return result.count;
}

export async function setPaymentVoided(db, id, reason, voidedAt) {
  const result = await db`
    update shop.payments set status = 'voided', void_reason = ${reason}, voided_at = ${voidedAt}
    where id = ${id}`;
  return result.count;
}

export async function listPaymentRows(db, {
  customerId = null,
  method = "",
  status = "",
  from = "",
  to = "",
  search = "",
  limit,
  offset,
}) {
  const conditions = [];
  if (customerId) {
    conditions.push(db`p.customer_id = ${customerId}`);
  }
  if (method) {
    conditions.push(db`p.method = ${method}`);
  }
  if (status) {
    conditions.push(db`p.status = ${status}`);
  }
  if (from) {
    conditions.push(db`p.received_on >= ${from}`);
  }
  if (to) {
    conditions.push(db`p.received_on <= ${to}`);
  }
  if (search) {
    const pattern = likePattern(search);
    conditions.push(db`(p.receipt_no ilike ${pattern} or p.reference ilike ${pattern} or c.name ilike ${pattern})`);
  }
  const where = whereAll(db, conditions);

  const [{ total }] = await db`
    select count(*) as total from shop.payments p
    join shop.customers c on c.id = p.customer_id ${where}`;
  const rows = await db`
    ${paymentSelect(db)} ${where}
    order by p.received_on desc, p.id desc
    limit ${limit} offset ${offset}`;
  return { rows: [...rows], total: Number(total) };
}

/** Posted payments that still have money not applied to an invoice (advances), oldest first. */
export async function unallocatedPaymentsForCustomer(db, customerId) {
  const rows = await db`
    select p.id, p.receipt_no, p.received_on, p.amount_paisa,
      p.amount_paisa - coalesce(sum(a.amount_paisa), 0) as unallocated_paisa
    from shop.payments p
    left join shop.payment_allocations a on a.payment_id = p.id
    where p.customer_id = ${customerId} and p.status = 'posted'
    group by p.id
    having p.amount_paisa - coalesce(sum(a.amount_paisa), 0) > 0
    order by p.received_on, p.id`;
  return [...rows];
}

/** Unapplied advances for every customer, used by the aging report. */
export async function unallocatedTotalsByCustomer(db) {
  const rows = await db`
    select p.customer_id, sum(p.amount_paisa - coalesce(x.allocated, 0)) as unallocated_paisa
    from shop.payments p
    left join (
      select payment_id, sum(amount_paisa) as allocated from shop.payment_allocations group by payment_id
    ) x on x.payment_id = p.id
    where p.status = 'posted'
    group by p.customer_id`;
  return [...rows];
}
