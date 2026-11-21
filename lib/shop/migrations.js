// Database schema. Each migration runs once, in order, and is recorded in PRAGMA user_version.
// Conventions:
// - Money columns end in _paisa and hold whole numbers (1 rupee = 100 paisa).
// - Litres are whole numbers.
// - Business dates are YYYY-MM-DD (Pakistan time); created_at and updated_at are ISO UTC timestamps.
// - Records are never hard-deleted. Use status columns, and void or cancel instead.

const CUSTOMER_TYPE_CHECK = [
  "dealer", "shop_owner", "bank", "restaurant", "fast_food_chain", "logistics", "industrial",
  "textile", "construction", "healthcare", "education", "government", "other",
]
  .map((value) => `'${value}'`)
  .join(", ");

const SCHEMA_V1 = `
CREATE TABLE counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

INSERT INTO products (code, name, short_name, sort_order) VALUES
  ('PMG', 'Premium Motor Gasoline (Petrol)', 'Petrol', 1),
  ('HSD', 'High Speed Diesel', 'Diesel', 2),
  ('HOBC', 'High Octane Blending Component', 'HOBC', 3);

CREATE TABLE product_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT NOT NULL REFERENCES products(code),
  rate_paisa INTEGER NOT NULL CHECK (rate_paisa > 0),
  effective_from TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (product_code, effective_from)
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN (${CUSTOMER_TYPE_CHECK})),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  contact_person TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  ntn TEXT,
  strn TEXT,
  credit_limit_paisa INTEGER NOT NULL DEFAULT 0 CHECK (credit_limit_paisa >= 0),
  payment_terms_days INTEGER NOT NULL DEFAULT 7 CHECK (payment_terms_days BETWEEN 0 AND 365),
  discount_per_litre_paisa INTEGER NOT NULL DEFAULT 0 CHECK (discount_per_litre_paisa >= 0),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX uniq_customers_name ON customers (name COLLATE NOCASE);
CREATE INDEX idx_customers_type_status ON customers (customer_type, status);

CREATE TABLE customer_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_sites_customer ON customer_sites (customer_id);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  site_id INTEGER REFERENCES customer_sites(id),
  delivery_address TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  window_start TEXT,
  window_end TEXT,
  source TEXT NOT NULL CHECK (source IN ('shop', 'phone', 'whatsapp', 'email', 'website')),
  status TEXT NOT NULL CHECK (status IN ('received', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
  total_litres INTEGER NOT NULL CHECK (total_litres > 0),
  estimated_paisa INTEGER NOT NULL CHECK (estimated_paisa > 0),
  notes TEXT,
  credit_override_note TEXT,
  cancel_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_orders_status_date ON orders (status, delivery_date);
CREATE INDEX idx_orders_customer ON orders (customer_id);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_code TEXT NOT NULL REFERENCES products(code),
  ordered_litres INTEGER NOT NULL CHECK (ordered_litres > 0),
  delivered_litres INTEGER CHECK (delivered_litres IS NULL OR delivered_litres >= 0),
  list_rate_paisa INTEGER NOT NULL CHECK (list_rate_paisa > 0),
  discount_paisa INTEGER NOT NULL DEFAULT 0 CHECK (discount_paisa >= 0),
  rate_paisa INTEGER NOT NULL CHECK (rate_paisa > 0),
  UNIQUE (order_id, product_code)
);

CREATE TABLE depots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE tanks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  depot_id INTEGER NOT NULL REFERENCES depots(id),
  name TEXT NOT NULL,
  product_code TEXT NOT NULL REFERENCES products(code),
  capacity_litres INTEGER NOT NULL CHECK (capacity_litres > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (depot_id, name)
);
CREATE INDEX idx_tanks_depot_product ON tanks (depot_id, product_code);

CREATE TABLE stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tank_id INTEGER NOT NULL REFERENCES tanks(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'dispatch', 'return', 'adjustment')),
  litres INTEGER NOT NULL CHECK (litres <> 0),
  reference TEXT,
  occurred_on TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_movements_tank ON stock_movements (tank_id, id);

CREATE TABLE dip_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tank_id INTEGER NOT NULL REFERENCES tanks(id),
  measured_on TEXT NOT NULL,
  measured_litres INTEGER NOT NULL CHECK (measured_litres >= 0),
  book_litres INTEGER NOT NULL,
  variance_litres INTEGER NOT NULL,
  adjusted INTEGER NOT NULL DEFAULT 0 CHECK (adjusted IN (0, 1)),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_dips_tank ON dip_readings (tank_id, id);

CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_no TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  depot_id INTEGER NOT NULL REFERENCES depots(id),
  vehicle_no TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  seal_numbers TEXT,
  status TEXT NOT NULL CHECK (status IN ('in_transit', 'delivered')),
  dispatched_on TEXT NOT NULL,
  dispatched_at TEXT NOT NULL,
  delivered_on TEXT,
  delivered_at TEXT,
  created_by TEXT NOT NULL
);

CREATE TABLE delivery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id),
  product_code TEXT NOT NULL REFERENCES products(code),
  loaded_litres INTEGER NOT NULL CHECK (loaded_litres > 0),
  UNIQUE (delivery_id, product_code)
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  bill_to_name TEXT NOT NULL,
  bill_to_address TEXT,
  bill_to_ntn TEXT,
  bill_to_strn TEXT,
  tax_mode TEXT NOT NULL CHECK (tax_mode IN ('inclusive', 'exclusive')),
  tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps >= 0),
  total_litres INTEGER NOT NULL CHECK (total_litres > 0),
  subtotal_paisa INTEGER NOT NULL CHECK (subtotal_paisa >= 0),
  tax_paisa INTEGER NOT NULL CHECK (tax_paisa >= 0),
  total_paisa INTEGER NOT NULL CHECK (total_paisa > 0),
  status TEXT NOT NULL CHECK (status IN ('issued', 'cancelled')),
  share_token TEXT NOT NULL UNIQUE,
  cancel_reason TEXT,
  cancelled_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX uniq_issued_invoice_per_order ON invoices (order_id) WHERE status = 'issued';
CREATE INDEX idx_invoices_customer_status ON invoices (customer_id, status);
CREATE INDEX idx_invoices_due ON invoices (status, due_date);
CREATE INDEX idx_invoices_date ON invoices (invoice_date);

CREATE TABLE invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  product_code TEXT NOT NULL REFERENCES products(code),
  litres INTEGER NOT NULL CHECK (litres > 0),
  rate_paisa INTEGER NOT NULL CHECK (rate_paisa > 0),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0)
);
CREATE INDEX idx_invoice_lines_invoice ON invoice_lines (invoice_id);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
  method TEXT NOT NULL CHECK (method IN ('cash', 'cheque', 'bank_transfer', 'online', 'card', 'other')),
  reference TEXT,
  bank_name TEXT,
  received_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('posted', 'voided')),
  notes TEXT,
  void_reason TEXT,
  voided_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_payments_customer_status ON payments (customer_id, status);
CREATE INDEX idx_payments_received ON payments (received_on);

CREATE TABLE payment_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_allocations_invoice ON payment_allocations (invoice_id);
CREATE INDEX idx_allocations_payment ON payment_allocations (payment_id);

CREATE TABLE ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  entry_date TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('invoice', 'invoice_cancel', 'payment', 'payment_void')),
  reference TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_paisa INTEGER NOT NULL DEFAULT 0 CHECK (debit_paisa >= 0),
  credit_paisa INTEGER NOT NULL DEFAULT 0 CHECK (credit_paisa >= 0),
  created_at TEXT NOT NULL,
  CHECK ((debit_paisa > 0 AND credit_paisa = 0) OR (credit_paisa > 0 AND debit_paisa = 0))
);
CREATE INDEX idx_ledger_customer_date ON ledger_entries (customer_id, entry_date, id);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_created ON audit_log (created_at, id);
`;

export const MIGRATIONS = [{ version: 1, sql: SCHEMA_V1 }];
