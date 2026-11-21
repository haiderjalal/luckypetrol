import { likePattern, whereAll } from "./rows.js";

function customerColumns(db) {
  return db`id, code, name, customer_type, status, contact_person, phone, whatsapp, email, address, city, ntn, strn,
    credit_limit_paisa, payment_terms_days, discount_per_litre_paisa, notes, created_by, created_at, updated_at`;
}

function siteColumns(db) {
  return db`id, customer_id, label, address, city, contact_name, contact_phone, is_active, created_at, updated_at`;
}

export async function findCustomerById(db, id) {
  const [row] = await db`select ${customerColumns(db)} from shop.customers where id = ${id}`;
  return row ?? null;
}

/** Case-insensitive exact match, used to stop duplicate business names. */
export async function findCustomerByName(db, name) {
  const [row] = await db`select id, code, name from shop.customers where lower(name) = lower(${name})`;
  return row ?? null;
}

export async function insertCustomer(db, values) {
  const [{ id }] = await db`insert into shop.customers ${db(values)} returning id`;
  return Number(id);
}

export async function updateCustomer(db, id, values) {
  const result = await db`update shop.customers set ${db(values)} where id = ${id}`;
  return result.count;
}

export async function listCustomers(db, { search = "", customerType = "", status = "", limit, offset }) {
  const conditions = [];
  if (search) {
    const pattern = likePattern(search);
    conditions.push(
      db`(name ilike ${pattern} or code ilike ${pattern} or city ilike ${pattern} or phone ilike ${pattern} or whatsapp ilike ${pattern})`,
    );
  }
  if (customerType) {
    conditions.push(db`customer_type = ${customerType}`);
  }
  if (status) {
    conditions.push(db`status = ${status}`);
  }
  const where = whereAll(db, conditions);

  const [{ total }] = await db`select count(*) as total from shop.customers ${where}`;
  const rows = await db`
    select ${customerColumns(db)} from shop.customers ${where}
    order by lower(name) limit ${limit} offset ${offset}`;
  return { rows: [...rows], total: Number(total) };
}

export async function listSitesForCustomer(db, customerId) {
  const rows = await db`
    select ${siteColumns(db)} from shop.customer_sites
    where customer_id = ${customerId} order by is_active desc, label`;
  return [...rows];
}

export async function listActiveSites(db) {
  const rows = await db`select ${siteColumns(db)} from shop.customer_sites where is_active order by lower(label)`;
  return [...rows];
}

export async function findSiteById(db, id) {
  const [row] = await db`select ${siteColumns(db)} from shop.customer_sites where id = ${id}`;
  return row ?? null;
}

export async function insertSite(db, values) {
  const [{ id }] = await db`insert into shop.customer_sites ${db(values)} returning id`;
  return Number(id);
}

export async function setSiteActive(db, id, isActive) {
  const result = await db`update shop.customer_sites set is_active = ${Boolean(isActive)} where id = ${id}`;
  return result.count;
}

/** Active customers with the fields the order form needs (credit, discount, terms). */
export async function listOrderableCustomers(db) {
  const rows = await db`
    select id, code, name, customer_type, credit_limit_paisa, discount_per_litre_paisa,
      payment_terms_days, whatsapp, address, city
    from shop.customers where status = 'active' order by lower(name)`;
  return [...rows];
}
