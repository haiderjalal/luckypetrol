// The customer ledger. Every invoice, payment, cancellation and void is posted here, and the balance is the sum of it.
// Positive balance = the customer owes money. Negative balance = advance paid.

export async function insertLedgerEntry(db, values) {
  const [{ id }] = await db`insert into shop.ledger_entries ${db(values)} returning id`;
  return Number(id);
}

export async function customerBalancePaisa(db, customerId) {
  const [row] = await db`
    select coalesce(sum(debit_paisa) - sum(credit_paisa), 0) as balance
    from shop.ledger_entries where customer_id = ${customerId}`;
  return Number(row.balance);
}

export async function balanceBeforeDate(db, customerId, date) {
  const [row] = await db`
    select coalesce(sum(debit_paisa) - sum(credit_paisa), 0) as balance
    from shop.ledger_entries where customer_id = ${customerId} and entry_date < ${date}`;
  return Number(row.balance);
}

export async function customerEntriesBetween(db, customerId, from, to) {
  const rows = await db`
    select id, entry_date, entry_type, reference, description, debit_paisa, credit_paisa
    from shop.ledger_entries
    where customer_id = ${customerId} and entry_date >= ${from} and entry_date <= ${to}
    order by entry_date, id`;
  return [...rows];
}

export async function allEntriesBetween(db, from, to) {
  const rows = await db`
    select e.id, e.entry_date, e.entry_type, e.reference, e.description, e.debit_paisa, e.credit_paisa,
      c.code as customer_code, c.name as customer_name, e.customer_id
    from shop.ledger_entries e
    join shop.customers c on c.id = e.customer_id
    where e.entry_date >= ${from} and e.entry_date <= ${to}
    order by lower(c.name), e.entry_date, e.id`;
  return [...rows];
}

export async function balancesByCustomer(db) {
  const rows = await db`
    select customer_id, sum(debit_paisa) - sum(credit_paisa) as balance_paisa
    from shop.ledger_entries group by customer_id`;
  return [...rows];
}
