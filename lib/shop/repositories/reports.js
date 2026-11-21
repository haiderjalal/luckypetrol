// Read-only aggregates for the dashboard and reports. Only issued invoices count as sales.

export async function salesSummary(db, from, to) {
  const [row] = await db`
    select count(*) as invoices, coalesce(sum(total_litres), 0) as litres,
      coalesce(sum(total_paisa), 0) as total_paisa, coalesce(sum(tax_paisa), 0) as tax_paisa
    from shop.invoices
    where status = 'issued' and invoice_date between ${from} and ${to}`;

  return {
    invoices: Number(row.invoices),
    litres: Number(row.litres),
    totalPaisa: Number(row.totalPaisa),
    taxPaisa: Number(row.taxPaisa),
  };
}

export async function salesDaily(db, from, to) {
  const rows = await db`
    select invoice_date as date, sum(total_paisa) as total_paisa, sum(total_litres) as litres
    from shop.invoices
    where status = 'issued' and invoice_date between ${from} and ${to}
    group by invoice_date
    order by invoice_date`;
  return [...rows];
}

export async function litresByProduct(db, from, to) {
  const rows = await db`
    select l.product_code, sum(l.litres) as litres, sum(l.amount_paisa) as amount_paisa
    from shop.invoice_lines l
    join shop.invoices i on i.id = l.invoice_id
    join shop.products p on p.code = l.product_code
    where i.status = 'issued' and i.invoice_date between ${from} and ${to}
    group by l.product_code, p.sort_order
    order by p.sort_order`;
  return [...rows];
}

export async function salesByCustomerType(db, from, to) {
  const rows = await db`
    select c.customer_type, count(i.id) as invoices, sum(i.total_litres) as litres, sum(i.total_paisa) as total_paisa
    from shop.invoices i
    join shop.customers c on c.id = i.customer_id
    where i.status = 'issued' and i.invoice_date between ${from} and ${to}
    group by c.customer_type
    order by total_paisa desc`;
  return [...rows];
}

export async function topCustomers(db, from, to, limit) {
  const rows = await db`
    select c.id as customer_id, c.code, c.name, sum(i.total_litres) as litres, sum(i.total_paisa) as total_paisa
    from shop.invoices i
    join shop.customers c on c.id = i.customer_id
    where i.status = 'issued' and i.invoice_date between ${from} and ${to}
    group by c.id
    order by total_paisa desc
    limit ${limit}`;
  return [...rows];
}

export async function collectionsByMethod(db, from, to) {
  const rows = await db`
    select method, count(*) as receipts, sum(amount_paisa) as amount_paisa
    from shop.payments
    where status = 'posted' and received_on between ${from} and ${to}
    group by method
    order by amount_paisa desc`;
  return [...rows];
}

/** Delivered orders with no issued invoice yet: earned but not billed. */
export async function deliveredNotInvoicedCount(db) {
  const [row] = await db`
    select count(*) as total from shop.orders o
    where o.status = 'delivered'
      and not exists (select 1 from shop.invoices i where i.order_id = o.id and i.status = 'issued')`;
  return Number(row.total);
}

export async function orderStatusCounts(db) {
  const rows = await db`select status, count(*) as total from shop.orders group by status`;
  return [...rows];
}
