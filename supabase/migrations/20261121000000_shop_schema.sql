-- Lucky Petroleum shop: Postgres schema for Supabase.
--
-- All tables live in the "shop" schema. The Data API exposes only "public" by default, so these tables
-- are not reachable from the browser. Keep "shop" out of the exposed schemas (dashboard: Settings > Data API).
-- Three layers protect the data:
--   1. "shop" is not an exposed schema.
--   2. anon, authenticated and PUBLIC hold no privileges on the schema, its tables, sequences or functions.
--   3. Row Level Security is on for every table and there are no policies, so a role other than the owner sees nothing.
-- The app connects with SHOP_DATABASE_URL as the owner (postgres). Owners are not affected by these revokes.
--
-- Conventions:
-- - Money is whole paisa (bigint). Litres are whole numbers (integer).
-- - Business dates are date values (Pakistan time). Created and updated times are timestamptz, set by the database.
-- - Window times are 24-hour HH:MM text, zero-padded, the same rule as isTimeOfDay in lib/shop/dates.js.
-- - Nothing is deleted. Records are voided or cancelled through status columns, so foreign keys have no ON DELETE clause.

create schema if not exists shop;

-- Document numbering: one row per sequence, for example 'order' or 'invoice:2026-27'.
create table shop.counters (
  key text primary key,
  value bigint not null
);

-- Company, billing and operations settings: one JSON document per group.
create table shop.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table shop.products (
  code text primary key,
  name text not null,
  short_name text not null,
  sort_order integer not null
);

insert into shop.products (code, name, short_name, sort_order) values
  ('PMG', 'Premium Motor Gasoline (Petrol)', 'Petrol', 1),
  ('HSD', 'High Speed Diesel', 'Diesel', 2),
  ('HOBC', 'High Octane Blending Component', 'HOBC', 3)
on conflict (code) do nothing;

-- Rate card: each rate applies from its effective date until the next one.
create table shop.product_rates (
  id bigint generated always as identity primary key,
  product_code text not null references shop.products (code),
  rate_paisa bigint not null check (rate_paisa > 0),
  effective_from date not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (product_code, effective_from)
);

create table shop.customers (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  customer_type text not null check (customer_type in (
    'dealer', 'shop_owner', 'bank', 'restaurant', 'fast_food_chain', 'logistics', 'industrial',
    'textile', 'construction', 'healthcare', 'education', 'government', 'other'
  )),
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  contact_person text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  ntn text,
  strn text,
  credit_limit_paisa bigint not null default 0 check (credit_limit_paisa >= 0),
  payment_terms_days integer not null default 7 check (payment_terms_days between 0 and 365),
  discount_per_litre_paisa bigint not null default 0 check (discount_per_litre_paisa >= 0),
  notes text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Customer names are unique regardless of letter case.
create unique index uniq_customers_name on shop.customers (lower(name));
create index idx_customers_type_status on shop.customers (customer_type, status);

create table shop.customer_sites (
  id bigint generated always as identity primary key,
  customer_id bigint not null references shop.customers (id),
  label text not null,
  address text not null,
  city text,
  contact_name text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sites_customer on shop.customer_sites (customer_id);

create table shop.orders (
  id bigint generated always as identity primary key,
  order_no text not null unique,
  customer_id bigint not null references shop.customers (id),
  site_id bigint references shop.customer_sites (id),
  delivery_address text not null,
  delivery_date date not null,
  window_start text check (window_start is null or window_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  window_end text check (window_end is null or window_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  source text not null check (source in ('shop', 'phone', 'whatsapp', 'email', 'website')),
  status text not null check (status in ('received', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
  total_litres integer not null check (total_litres > 0),
  estimated_paisa bigint not null check (estimated_paisa > 0),
  notes text,
  credit_override_note text,
  cancel_reason text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A delivery window is both times or neither, and it must end after it starts.
  check ((window_start is null) = (window_end is null)),
  check (window_start is null or window_start < window_end)
);
create index idx_orders_status_date on shop.orders (status, delivery_date);
create index idx_orders_customer on shop.orders (customer_id);
create index idx_orders_site on shop.orders (site_id);

-- Rate and discount are copied onto the line when the order is taken, so later rate changes do not alter it.
create table shop.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references shop.orders (id),
  product_code text not null references shop.products (code),
  ordered_litres integer not null check (ordered_litres > 0),
  delivered_litres integer check (delivered_litres is null or delivered_litres >= 0),
  list_rate_paisa bigint not null check (list_rate_paisa > 0),
  discount_paisa bigint not null default 0 check (discount_paisa >= 0),
  rate_paisa bigint not null check (rate_paisa > 0),
  unique (order_id, product_code)
);

create table shop.depots (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table shop.tanks (
  id bigint generated always as identity primary key,
  depot_id bigint not null references shop.depots (id),
  name text not null,
  product_code text not null references shop.products (code),
  capacity_litres integer not null check (capacity_litres > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (depot_id, name)
);
create index idx_tanks_depot_product on shop.tanks (depot_id, product_code);

-- Book stock of a tank is the sum of its movements.
create table shop.stock_movements (
  id bigint generated always as identity primary key,
  tank_id bigint not null references shop.tanks (id),
  movement_type text not null check (movement_type in ('receipt', 'dispatch', 'return', 'adjustment')),
  litres integer not null check (litres <> 0),
  reference text,
  occurred_on date not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index idx_movements_tank on shop.stock_movements (tank_id, id);

create table shop.dip_readings (
  id bigint generated always as identity primary key,
  tank_id bigint not null references shop.tanks (id),
  measured_on date not null,
  measured_litres integer not null check (measured_litres >= 0),
  book_litres integer not null,
  variance_litres integer not null,
  adjusted boolean not null default false,
  notes text,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index idx_dips_tank on shop.dip_readings (tank_id, id);

-- One delivery per order.
create table shop.deliveries (
  id bigint generated always as identity primary key,
  delivery_no text not null unique,
  order_id bigint not null unique references shop.orders (id),
  depot_id bigint not null references shop.depots (id),
  vehicle_no text not null,
  driver_name text,
  driver_phone text,
  seal_numbers text,
  status text not null check (status in ('in_transit', 'delivered')),
  dispatched_on date not null,
  dispatched_at timestamptz not null,
  delivered_on date,
  delivered_at timestamptz,
  created_by text not null
);
create index idx_deliveries_depot on shop.deliveries (depot_id);

create table shop.delivery_items (
  id bigint generated always as identity primary key,
  delivery_id bigint not null references shop.deliveries (id),
  product_code text not null references shop.products (code),
  loaded_litres integer not null check (loaded_litres > 0),
  unique (delivery_id, product_code)
);

create table shop.invoices (
  id bigint generated always as identity primary key,
  invoice_no text not null unique,
  order_id bigint not null references shop.orders (id),
  customer_id bigint not null references shop.customers (id),
  invoice_date date not null,
  due_date date not null,
  bill_to_name text not null,
  bill_to_address text,
  bill_to_ntn text,
  bill_to_strn text,
  tax_mode text not null check (tax_mode in ('inclusive', 'exclusive')),
  tax_rate_bps integer not null check (tax_rate_bps >= 0),
  total_litres integer not null check (total_litres > 0),
  subtotal_paisa bigint not null check (subtotal_paisa >= 0),
  tax_paisa bigint not null check (tax_paisa >= 0),
  total_paisa bigint not null check (total_paisa > 0),
  status text not null check (status in ('issued', 'cancelled')),
  share_token text not null unique,
  cancel_reason text,
  cancelled_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);
-- At most one issued invoice per order. Cancelled invoices keep their numbers and do not count.
create unique index uniq_issued_invoice_per_order on shop.invoices (order_id) where status = 'issued';
create index idx_invoices_order on shop.invoices (order_id);
create index idx_invoices_customer_status on shop.invoices (customer_id, status);
create index idx_invoices_due on shop.invoices (status, due_date);
create index idx_invoices_date on shop.invoices (invoice_date);

create table shop.invoice_lines (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references shop.invoices (id),
  product_code text not null references shop.products (code),
  litres integer not null check (litres > 0),
  rate_paisa bigint not null check (rate_paisa > 0),
  amount_paisa bigint not null check (amount_paisa > 0)
);
create index idx_invoice_lines_invoice on shop.invoice_lines (invoice_id);
create index idx_invoice_lines_product on shop.invoice_lines (product_code);

create table shop.payments (
  id bigint generated always as identity primary key,
  receipt_no text not null unique,
  customer_id bigint not null references shop.customers (id),
  amount_paisa bigint not null check (amount_paisa > 0),
  method text not null check (method in ('cash', 'cheque', 'bank_transfer', 'online', 'card', 'other')),
  reference text,
  bank_name text,
  received_on date not null,
  status text not null check (status in ('posted', 'voided')),
  notes text,
  void_reason text,
  voided_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index idx_payments_customer_status on shop.payments (customer_id, status);
create index idx_payments_received on shop.payments (received_on);

create table shop.payment_allocations (
  id bigint generated always as identity primary key,
  payment_id bigint not null references shop.payments (id),
  invoice_id bigint not null references shop.invoices (id),
  amount_paisa bigint not null check (amount_paisa > 0),
  created_at timestamptz not null default now()
);
create index idx_allocations_invoice on shop.payment_allocations (invoice_id);
create index idx_allocations_payment on shop.payment_allocations (payment_id);

-- The ledger records what each customer owes. Each entry has exactly one side.
create table shop.ledger_entries (
  id bigint generated always as identity primary key,
  customer_id bigint not null references shop.customers (id),
  entry_date date not null,
  entry_type text not null check (entry_type in ('invoice', 'invoice_cancel', 'payment', 'payment_void')),
  reference text not null,
  description text not null,
  debit_paisa bigint not null default 0 check (debit_paisa >= 0),
  credit_paisa bigint not null default 0 check (credit_paisa >= 0),
  created_at timestamptz not null default now(),
  check ((debit_paisa > 0 and credit_paisa = 0) or (credit_paisa > 0 and debit_paisa = 0))
);
create index idx_ledger_customer_date on shop.ledger_entries (customer_id, entry_date, id);

create table shop.audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  created_at timestamptz not null default now()
);
create index idx_audit_created on shop.audit_log (created_at, id);

-- Failed sign-in attempts, used for the lockout. client_key is a SHA-256 hex digest of the client address and
-- username. The check stops raw addresses or usernames from being stored.
create table shop.login_attempts (
  id bigint generated always as identity primary key,
  client_key text not null check (client_key ~ '^[0-9a-f]{64}$'),
  failed_at timestamptz not null default now()
);
create index idx_login_attempts_key_time on shop.login_attempts (client_key, failed_at);

-- The database sets updated_at. The app never sends timestamps.
create function shop.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger settings_set_updated_at before update on shop.settings
  for each row execute function shop.set_updated_at();
create trigger customers_set_updated_at before update on shop.customers
  for each row execute function shop.set_updated_at();
create trigger customer_sites_set_updated_at before update on shop.customer_sites
  for each row execute function shop.set_updated_at();
create trigger orders_set_updated_at before update on shop.orders
  for each row execute function shop.set_updated_at();

-- Row Level Security: on for every table in the shop schema, with no policies (layer 3 above).
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'shop' loop
    execute format('alter table shop.%I enable row level security', t.tablename);
  end loop;
end
$$;

-- Least privilege (layer 2 above). The owner keeps its access; these revokes cover PUBLIC and the Supabase roles.
revoke all on schema shop from public;
revoke all on all tables in schema shop from public;
revoke all on all sequences in schema shop from public;
revoke all on all functions in schema shop from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke usage on schema shop from anon;
    revoke all on all tables in schema shop from anon;
    revoke all on all sequences in schema shop from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke usage on schema shop from authenticated;
    revoke all on all tables in schema shop from authenticated;
    revoke all on all sequences in schema shop from authenticated;
  end if;
end
$$;
