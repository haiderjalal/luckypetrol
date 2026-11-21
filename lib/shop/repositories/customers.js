import { insertInto, likePattern, toCamelRow, toCamelRows, updateRow } from "./rows.js";

const CUSTOMER_COLUMNS = `id, code, name, customer_type, status, contact_person, phone, whatsapp, email,
  address, city, ntn, strn, credit_limit_paisa, payment_terms_days, discount_per_litre_paisa,
  notes, created_by, created_at, updated_at`;

const SITE_COLUMNS = "id, customer_id, label, address, city, contact_name, contact_phone, is_active, created_at, updated_at";

export function findCustomerById(db, id) {
  return toCamelRow(db.prepare(`SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = ?`).get(id));
}

/** Case-insensitive exact match, used to stop duplicate business names. */
export function findCustomerByName(db, name) {
  return toCamelRow(db.prepare("SELECT id, code, name FROM customers WHERE name = ? COLLATE NOCASE").get(name));
}

export function insertCustomer(db, values) {
  return insertInto(db, "customers", values);
}

export function updateCustomer(db, id, values) {
  return updateRow(db, "customers", id, values);
}

export function listCustomers(db, { search = "", customerType = "", status = "", limit, offset }) {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push(
      "(name LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR whatsapp LIKE ? ESCAPE '\\')",
    );
    const pattern = likePattern(search);
    params.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (customerType) {
    clauses.push("customer_type = ?");
    params.push(customerType);
  }
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = Number(db.prepare(`SELECT COUNT(*) AS total FROM customers ${where}`).get(...params).total);
  const rows = db
    .prepare(`SELECT ${CUSTOMER_COLUMNS} FROM customers ${where} ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return { rows: toCamelRows(rows), total };
}

export function listSitesForCustomer(db, customerId) {
  return toCamelRows(
    db.prepare(`SELECT ${SITE_COLUMNS} FROM customer_sites WHERE customer_id = ? ORDER BY is_active DESC, label`).all(customerId),
  );
}

export function listActiveSites(db) {
  return toCamelRows(
    db.prepare(`SELECT ${SITE_COLUMNS} FROM customer_sites WHERE is_active = 1 ORDER BY label COLLATE NOCASE`).all(),
  );
}

export function findSiteById(db, id) {
  return toCamelRow(db.prepare(`SELECT ${SITE_COLUMNS} FROM customer_sites WHERE id = ?`).get(id));
}

export function insertSite(db, values) {
  return insertInto(db, "customer_sites", values);
}

export function setSiteActive(db, id, isActive, updatedAt) {
  return updateRow(db, "customer_sites", id, { is_active: isActive ? 1 : 0, updated_at: updatedAt });
}

/** Active customers with the fields the order form needs (credit, discount, terms). */
export function listOrderableCustomers(db) {
  return toCamelRows(
    db
      .prepare(
        `SELECT id, code, name, customer_type, credit_limit_paisa, discount_per_litre_paisa,
                payment_terms_days, whatsapp, address, city
         FROM customers WHERE status = 'active' ORDER BY name COLLATE NOCASE`,
      )
      .all(),
  );
}
