import { likePattern, whereAll } from "./rows.js";

// Invoices with the amount already paid and the payment state, as a derived table.
function invoiceState(db) {
  return db`
    select i.id, i.invoice_no, i.order_id, i.customer_id, i.invoice_date, i.due_date, i.status,
      i.total_litres, i.subtotal_paisa, i.tax_paisa, i.total_paisa, i.created_at,
      c.name as customer_name, c.customer_type,
      coalesce(a.paid_paisa, 0) as paid_paisa,
      case
        when i.status = 'cancelled' then 'cancelled'
        when coalesce(a.paid_paisa, 0) = 0 then 'unpaid'
        when coalesce(a.paid_paisa, 0) < i.total_paisa then 'partial'
        else 'paid'
      end as payment_state
    from shop.invoices i
    join shop.customers c on c.id = i.customer_id
    left join (
      select invoice_id, sum(amount_paisa) as paid_paisa from shop.payment_allocations group by invoice_id
    ) a on a.invoice_id = i.id`;
}

function invoiceDetail(db) {
  return db`
    select i.id, i.invoice_no, i.order_id, i.customer_id, i.invoice_date, i.due_date,
      i.bill_to_name, i.bill_to_address, i.bill_to_ntn, i.bill_to_strn, i.tax_mode, i.tax_rate_bps,
      i.total_litres, i.subtotal_paisa, i.tax_paisa, i.total_paisa, i.status, i.share_token,
      i.cancel_reason, i.cancelled_at, i.created_by, i.created_at,
      c.name as customer_name, c.customer_type, c.whatsapp as customer_whatsapp,
      c.contact_person as customer_contact, c.phone as customer_phone,
      o.order_no, o.delivery_address, o.delivery_date,
      coalesce((select sum(a.amount_paisa) from shop.payment_allocations a where a.invoice_id = i.id), 0) as paid_paisa
    from shop.invoices i
    join shop.customers c on c.id = i.customer_id
    join shop.orders o on o.id = i.order_id`;
}

export async function insertInvoice(db, values) {
  const [{ id }] = await db`insert into shop.invoices ${db(values)} returning id`;
  return Number(id);
}

export async function insertInvoiceLine(db, values) {
  const [{ id }] = await db`insert into shop.invoice_lines ${db(values)} returning id`;
  return Number(id);
}

export async function findInvoiceRow(db, id) {
  const [row] = await db`${invoiceDetail(db)} where i.id = ${id}`;
  return row ?? null;
}

export async function findInvoiceByToken(db, token) {
  const [row] = await db`${invoiceDetail(db)} where i.share_token = ${token}`;
  return row ?? null;
}

export async function invoiceLines(db, invoiceId) {
  const rows = await db`
    select id, product_code, litres, rate_paisa, amount_paisa
    from shop.invoice_lines where invoice_id = ${invoiceId} order by id`;
  return [...rows];
}

export async function invoiceAllocations(db, invoiceId) {
  const rows = await db`
    select a.id, a.amount_paisa, a.payment_id, p.receipt_no, p.received_on, p.method, p.reference
    from shop.payment_allocations a
    join shop.payments p on p.id = a.payment_id
    where a.invoice_id = ${invoiceId}
    order by p.received_on, a.id`;
  return [...rows];
}

export async function invoicesForOrder(db, orderId) {
  const rows = await db`
    select id, invoice_no, invoice_date, status, total_paisa, cancel_reason
    from shop.invoices where order_id = ${orderId} order by id`;
  return [...rows];
}

export async function activeInvoiceForOrder(db, orderId) {
  const [row] = await db`
    select id, invoice_no, total_paisa from shop.invoices
    where order_id = ${orderId} and status = 'issued'`;
  return row ?? null;
}

/** Issued invoices that still have money owing, oldest due date first. Used to allocate payments (FIFO). */
export async function openInvoicesForCustomer(db, customerId) {
  const rows = await db`
    select x.id, x.invoice_no, x.invoice_date, x.due_date, x.total_paisa, x.paid_paisa,
      x.total_paisa - x.paid_paisa as outstanding_paisa
    from (${invoiceState(db)}) x
    where x.customer_id = ${customerId} and x.status = 'issued' and x.payment_state in ('unpaid', 'partial')
    order by x.due_date, x.invoice_date, x.id`;
  return [...rows];
}

/** Every open invoice across customers, for aging reports. */
export async function openInvoicesForAging(db) {
  const rows = await db`
    select x.id, x.invoice_no, x.customer_id, x.customer_name, x.customer_type, x.due_date,
      x.total_paisa - x.paid_paisa as outstanding_paisa
    from (${invoiceState(db)}) x
    where x.status = 'issued' and x.payment_state in ('unpaid', 'partial')`;
  return [...rows];
}

export async function listInvoiceRows(db, {
  customerId = null,
  status = "",
  paymentState = "",
  from = "",
  to = "",
  search = "",
  limit,
  offset,
}) {
  const conditions = [];
  if (customerId) {
    conditions.push(db`x.customer_id = ${customerId}`);
  }
  if (status) {
    conditions.push(db`x.status = ${status}`);
  }
  if (paymentState) {
    conditions.push(db`x.payment_state = ${paymentState}`);
  }
  if (from) {
    conditions.push(db`x.invoice_date >= ${from}`);
  }
  if (to) {
    conditions.push(db`x.invoice_date <= ${to}`);
  }
  if (search) {
    const pattern = likePattern(search);
    conditions.push(db`(x.invoice_no ilike ${pattern} or x.customer_name ilike ${pattern})`);
  }
  const where = whereAll(db, conditions);

  const [{ total }] = await db`select count(*) as total from (${invoiceState(db)}) x ${where}`;
  const rows = await db`
    select x.id, x.invoice_no, x.order_id, x.customer_id, x.invoice_date, x.due_date, x.status,
      x.total_litres, x.subtotal_paisa, x.tax_paisa, x.total_paisa, x.created_at,
      x.customer_name, x.customer_type, x.paid_paisa, x.payment_state
    from (${invoiceState(db)}) x ${where}
    order by x.invoice_date desc, x.id desc
    limit ${limit} offset ${offset}`;
  return { rows: [...rows], total: Number(total) };
}

export async function setInvoiceCancelled(db, id, reason, cancelledAt) {
  const result = await db`
    update shop.invoices set status = 'cancelled', cancel_reason = ${reason}, cancelled_at = ${cancelledAt}
    where id = ${id}`;
  return result.count;
}
