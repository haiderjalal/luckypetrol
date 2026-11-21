# Supabase setup and implementation guide

**Status:** the schema and the app are converted to Postgres in the working tree. Nothing is committed. The app passes its tests against a Postgres-protocol server, but it has not run against Supabase yet.

- Schema: [`supabase/migrations/20261121000000_shop_schema.sql`](../supabase/migrations/20261121000000_shop_schema.sql). It creates 21 tables in the `shop` schema.
- Tested in PGlite (PostgreSQL 18.7 compiled to WebAssembly). All 35 checks pass: structure, privileges, constraints, triggers, indexes and the ledger.
- Not yet run on a Supabase project. Section 7 describes the code as first drafted. The shipped code is in `lib/shop/`, and the notes below say where it differs.

## 1. What changes and what stays

**Changes**
- The data moves from a SQLite file to Supabase Postgres.
- The server reaches the database through one connection string, `SHOP_DATABASE_URL`. The browser never connects to Supabase.
- The login lockout moves from memory into the database, because Vercel instances do not share memory.

**Stays**
- Our staff sign-in (`SHOP_USERNAME`, `SHOP_PASSWORD`, `SHOP_SESSION_SECRET`).
- The pure modules: money, dates, totals, phone, WhatsApp, CSV, session, credentials, validation, presentation, navigation and address. They do not touch the database.

**Not used:** Supabase Auth, Storage, Realtime, Edge Functions and the Data API.

## 2. Decisions and approvals

| # | Item | Recommendation | Status |
|---|------|----------------|--------|
| 1 | Move the shop to Supabase Postgres | Go ahead. Confirm this counts as the stack-change approval | Needs you |
| 2 | Add the `postgres` npm package (postgres.js) | Approved 2026-11-21 and installed at exactly 4.1.1 (Unlicense) | Done |
| 3 | Primary key type | The schema uses `bigint generated always as identity`. The project rules (CLAUDE.md) say UUID unless another format is required. Supabase's Postgres guidance recommends identity for a single database. Approved 2026-11-21: keep bigint identity. | Done |
| 4 | Region | Mumbai (`ap-south-1`), with Vercel functions in `bom1`. Changing the region later means moving the data | Needs you |
| 5 | Plan | Pro before live data. Free projects have no backups and pause after one week of inactivity | Needs you |
| 6 | The Vercel gate (`SHOP_ENABLED` and `middleware.js`) | Remove it once Supabase works on Vercel | Needs you |
| 7 | Delete `lib/shop/migrations.js` and `data/shop.sqlite` | Delete after the Supabase version is verified. Project rules require approval for deletions | Needs you |
| 8 | Environment variable names: add `SHOP_DATABASE_URL`, remove `SHOP_DB_PATH` | Change `.env.example` only after approval | Needs you |
| 9 | `.env.example` working copy | It holds the real shop password. Restore the blank value before any commit | Needs you |

## 3. Create the Supabase project

1. Create a project in the Mumbai region (`ap-south-1`). Choose the plan from decision 5.
2. Generate the database password and store it in a password manager. Letters and digits only is simplest. If you use symbols, URL-encode them in the connection string.
3. Wait for provisioning to finish.
4. In the Data API settings, check that `shop` is not in the exposed schemas. Only `public` should be listed.
5. Click **Connect** and copy the **Transaction pooler** URI (port 6543). The app uses this one. Copy the host exactly as shown. It has the form `aws-<index>-ap-south-1.pooler.supabase.com`.
6. Copy the **Session pooler** URI (port 5432) for `pg_dump` and other long-running tools.
7. Do not use the direct connection from Vercel. It uses IPv6 by default. The IPv4 add-on is a paid-plan feature.

Pooler usernames have the form `postgres.<project-ref>`. The Connect dialog fills this in.

## 4. Environment variables

Names only. Values live in `.env.local`, the Vercel dashboard and your password manager.

| Where | Name | Notes |
|-------|------|-------|
| `.env.local` (git-ignored) | `SHOP_DATABASE_URL` | Transaction pooler URI with the password filled in |
| Vercel, Production | `SHOP_DATABASE_URL` | The live project. Mark as Sensitive |
| Vercel, Preview | `SHOP_DATABASE_URL` | Recommended: a test project, never the live one |
| Vercel, Production and Preview | `SHOP_USERNAME`, `SHOP_PASSWORD`, `SHOP_SESSION_SECRET`, `SHOP_PUBLIC_URL` | Already set. Keep |
| Vercel, Production and Preview | `SHOP_DB_PATH` | Remove after the switch |
| Vercel, Production and Preview | `SHOP_ENABLED` | Decision 6 |
| Dev machine only | `SHOP_TEST_DATABASE_URL` | A test project or a local Supabase. Never production |

Rules:
- Never put any of these in `NEXT_PUBLIC_*` variables.
- Never paste the password or a URI into chat, a commit or a document.
- Redeploy after changing variables. Existing deployments keep the old values.
- Set the function region to `bom1`, so functions run next to the database. Use Project settings > Functions, or `"regions": ["bom1"]` in `vercel.json`. New Vercel projects may default to `iad1` (US East).

The driver sets `ssl: "require"` and `prepare: false` in code, so the URI needs no extra parameters.

## 5. Apply the schema

Use the CLI for every migration, so Supabase keeps one history. If you run the SQL in the SQL editor instead, the CLI does not know it was applied, and a later `db push` will try to run it again.

The CLI v3 changelog entry (2026-11-04) changed the defaults: database commands target the local stack unless you pass `--remote`. Check the help output before running anything.

```bash
# 1. Install the Supabase CLI (v3 or later) using Supabase's install instructions.
supabase --version

# 2. Run once, in the repository root. Adds supabase/config.toml and leaves the migration file alone.
supabase init

# 3. Link to the project. The CLI asks for the database password. Do not paste it into chat.
supabase link --project-ref <project-ref>

# 4. Check the flags, then push to the hosted database.
supabase db push --help
supabase db push --remote
```

Notes:
- The migration file was written by hand, because the CLI is not installed on the machine used to write it. If `supabase migration list` does not show the file, rename it to the format the CLI expects: a 14-digit timestamp, an underscore, then the name.
- The file has no `BEGIN` or `COMMIT`, so Postgres runs it as one transaction. If a push fails, run the checks in section 6 before you retry.
- Unattended pushes need `--yes`, according to the changelog. Do not add it to manual pushes.
- For CI, use a scoped access token (`SUPABASE_ACCESS_TOKEN`), not your login. Commands that use the database password are not limited by the token.

## 6. Check the result

Run these in the Supabase SQL editor. The comments give the expected result.

```sql
-- 21 tables
select count(*) as shop_tables from pg_tables where schemaname = 'shop';

-- no rows: row level security is on for every shop table
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'shop' and c.relkind = 'r' and not c.relrowsecurity;

-- all false: anon and authenticated have no access
select
  has_schema_privilege('anon', 'shop', 'USAGE') as anon_schema,
  has_schema_privilege('authenticated', 'shop', 'USAGE') as authenticated_schema,
  has_table_privilege('anon', 'shop.customers', 'SELECT') as anon_select,
  has_table_privilege('authenticated', 'shop.customers', 'SELECT') as authenticated_select;

-- one row: postgres (the app connects as this owner)
select distinct tableowner from pg_tables where schemaname = 'shop';

-- PMG, HSD, HOBC
select code from shop.products order by sort_order;
```

From outside the database, the `shop` schema must not be reachable through the Data API. Send a request to `https://<project-ref>.supabase.co/rest/v1/customers` with the header `Accept-Profile: shop` and your publishable key. The response should be an error saying the schema is not allowed. If it returns rows, remove `shop` from the exposed schemas.

Run these checks again after every migration.

## 7. Application changes

Written in the working tree, uncommitted. The `postgres` package is pinned at 4.1.1 (decision 2). The notes below say where the shipped code differs from the first draft.

### 7.1 Install the driver

```bash
npm install postgres@4.1.1 --save-exact
```

Commit the lockfile with the change. Check the option names in section 7.2 against the README of the version you install. I checked them against the installed 4.1.1 source and type definitions on 2026-11-21. Every option in section 7.2 exists, and the client builds without connecting.

### 7.2 `lib/shop/db.js` (first draft)

The shipped module keeps this design and adds two things. Every shop write runs under one advisory lock, so writes run one at a time, as they did on SQLite. `snapshot()` reads several queries in one repeatable-read transaction, so the dashboard and the reports agree with themselves. Read the file for the current code.

```js
import postgres from "postgres";

const GLOBAL_KEY = "__lpShopSql";

/**
 * One connection pool per server instance, created on first use.
 * Each serverless instance has its own pool, so the pool stays small.
 */
export function getSql() {
  if (!globalThis[GLOBAL_KEY]) {
    const url = process.env.SHOP_DATABASE_URL;
    if (!url) throw new Error("SHOP_DATABASE_URL is not set.");

    globalThis[GLOBAL_KEY] = postgres(url, {
      ssl: "require",
      // The transaction pooler (port 6543) does not support prepared statements.
      prepare: false,
      max: 3,
      idle_timeout: 20,
      transform: {
        undefined: null,
        column: { to: postgres.fromCamel, from: postgres.toCamel },
      },
      types: {
        // Counts and sums come back as bigint or numeric. Paisa totals fit in a JavaScript number.
        bigint: { to: 20, from: [20], serialize: (value) => String(value), parse: (value) => Number(value) },
        numeric: { to: 1700, from: [1700], serialize: (value) => String(value), parse: (value) => Number(value) },
        // Business dates stay as YYYY-MM-DD strings, not Date objects in server time.
        date: { to: 1082, from: [1082], serialize: (value) => value, parse: (value) => value },
      },
    });
  }
  return globalThis[GLOBAL_KEY];
}

/** Runs work in one transaction. Use the `tx` passed to the callback for every query inside it. */
export function transaction(work) {
  return getSql().begin((tx) => work(tx));
}
```

Notes:
- Outside a transaction, use `getSql()`. Inside one, use `tx`. Calling `getSql()` inside a transaction can deadlock when the pool is full.
- If your pooler is Supavisor older than 2.10, also set `max_pipeline: 1`. The option exists in 4.1.1, with a default of 100. Check the pooler version in the dashboard.
- `timestamptz` values use the driver's default, which gives `Date` objects. Call `toISOString()` where the app needs text.
- With `transform`, camelCase keys in `tx(object)` inserts become snake_case columns, and result columns come back in camelCase.

### 7.3 Query examples

```js
// Read one row. Name the columns; do not use select *.
export async function findCustomerById(sql, id) {
  const [row] = await sql`
    select id, code, name, customer_type, status, credit_limit_paisa
    from shop.customers where id = ${id}`;
  return row ?? null;
}

// Next document number. Runs inside the caller's transaction.
export async function nextSequence(tx, key) {
  const [row] = await tx`
    insert into shop.counters (key, value) values (${key}, 1)
    on conflict (key) do update set value = shop.counters.value + 1
    returning value`;
  return row.value;
}

// Create a customer and its audit entry in one transaction.
export function createCustomer(input, actor) {
  return transaction(async (tx) => {
    const code = `CU-${String(await nextSequence(tx, "customer")).padStart(4, "0")}`;
    const [{ id }] = await tx`insert into shop.customers ${tx(customerRecord(input, code, actor))} returning id`;
    await recordAudit(tx, {
      actor,
      action: "customer.created",
      entityType: "customer",
      entityId: String(id),
      summary: `Added ${code} ${input.name}`,
    });
    return { id, code };
  });
}
```

`customerRecord` and `recordAudit` are the app's own helpers. They build the camelCase row and write the audit entry.

### 7.4 Conversion rules (SQLite to Postgres)

1. Qualify every table name: `shop.customers`. Do not rely on `search_path`.
2. Queries are tagged templates. Values go in as `${value}` parameters. Optional filters are nested fragments. Never build SQL from user text.
3. Repositories, services, pages, actions, the seed and the tests become async, and every call is awaited.
4. `insert ... returning id` replaces `lastInsertRowid`.
5. Booleans: `is_active` and `adjusted` take `true` and `false`. Change the places that write or compare `1` and `0`.
6. `settings.value` is `jsonb`. Pass objects, not `JSON.stringify` strings, and read objects back.
7. Optional times must be `null`, not `''`. The window check rejects an empty string. The existing `nullable()` helper already does this.
8. Search uses `ilike` with the escaped pattern from `likePattern()`. Name matching is case-insensitive through `lower(name)`.
9. Pagination: `limit ${n} offset ${m}`.
10. Timestamps: stop sending `created_at` and `updated_at` from the app. The database sets `created_at` by default, and a trigger sets `updated_at` on the four tables that have it.
11. Counters: call `nextSequence` inside the same transaction as the record it numbers.
12. `lib/shop/migrations.js` and the `PRAGMA` code go away (decision 7).

### 7.5 Login lockout in the database

This replaces `lib/shop/rateLimit.js`. The rule stays the same. Five failures in 15 minutes lock the key until the oldest of those five is 15 minutes old. A successful sign-in clears the key.

```js
import { createHash } from "node:crypto";

/** The key is a hash, so no raw address or username is stored. */
export function hashClientKey(address, username) {
  return createHash("sha256").update(`${address}|${username.toLowerCase()}`).digest("hex");
}
```

```js
// Record a failure, then drop rows older than a day.
await sql`insert into shop.login_attempts (client_key) values (${clientKey})`;
await sql`delete from shop.login_attempts where failed_at < now() - interval '1 day'`;

// Recent failures, newest first. Five rows means locked until the fifth-newest is 15 minutes old.
const recent = await sql`
  select failed_at from shop.login_attempts
  where client_key = ${clientKey} and failed_at > now() - interval '15 minutes'
  order by failed_at desc limit 5`;

// On a successful sign-in.
await sql`delete from shop.login_attempts where client_key = ${clientKey}`;
```

### 7.6 Files to change

| File | Change |
|------|--------|
| `lib/shop/db.js` | Replace with the module in 7.2 |
| `lib/shop/migrations.js` | Delete after cutover (decision 7) |
| `lib/shop/repositories/*.js` | Async, qualified names, booleans, `returning` |
| `lib/shop/services/*.js` | Await repositories, wrap writes in `transaction`, pass `tx` to the audit helper |
| `lib/shop/numbering.js` | Counter upsert inside the caller's transaction (7.3) |
| `lib/shop/rateLimit.js` | Replaced by 7.5. Update `app/shop/_actions/auth.js` to match |
| `app/shop/**` (pages and actions) | Await service calls |
| `scripts/shop-seed.mjs` | Async. Uses `SHOP_TEST_DATABASE_URL` through `useTestDatabase()`, and refuses a database that already has customers |
| `tests/shop-flow.test.mjs` | Async, `SHOP_TEST_DATABASE_URL` only, the guard in section 8 |
| `middleware.js` | Decision 6 |
| `docs/shop-system.md` | Hosting section and the "research pending" note |
| `.env.example` | Names only, after decisions 8 and 9 |
| `package.json` | The `postgres` dependency, after decision 2 |

Unchanged: `tests/shop-core.test.mjs`, `tests/shop-address.test.mjs`, and the pure modules listed in section 1.

## 8. Tests and seed

The flow test and the seed both call `useTestDatabase()` from `lib/shop/testDatabase.js` before any query. It replaces the placeholder guard in the first draft, so no manual edit is needed. It refuses:

- a missing `SHOP_TEST_DATABASE_URL`;
- a test URL equal to `SHOP_DATABASE_URL`;
- a remote database whose Supabase project reference matches the live project's, or that has no recognisable reference.

A local database (`localhost` or `127.0.0.1`) needs no reference. A local Supabase needs Docker. A separate test project works without it.

Reset the tables before each test run. The `products` table keeps its seed rows.

```sql
truncate table shop.payment_allocations, shop.payments, shop.invoice_lines, shop.invoices,
  shop.delivery_items, shop.deliveries, shop.dip_readings, shop.stock_movements, shop.tanks,
  shop.depots, shop.order_items, shop.orders, shop.customer_sites, shop.customers,
  shop.product_rates, shop.ledger_entries, shop.audit_log, shop.login_attempts,
  shop.counters, shop.settings
restart identity cascade;
```

The seed script refuses to run when customers already exist. Do not seed the live project. Put demo data in the test project only.

## 9. Deploy

1. Add the variables from section 4, and set the function region to `bom1`.
2. Deploy a feature branch to Preview. Preview uses the test project.
3. Smoke test on Preview: sign in; create a customer; create an order with a delivery window; confirm it; dispatch it; complete the delivery; create an invoice; record a payment; check the ledger balance and the audit log; open a public invoice link.
4. Check the Supabase logs and the Vercel function logs for errors.
5. Promote to Production once Preview passes. Then decide on the gate (decision 6).

## 10. Operations

- **Backups:** the Pro plan includes daily backups, kept for 7 days (Supabase backups page, checked 2026-11-21). The free plan has none. Point-in-time recovery is a paid add-on. Decide before live data.
- **Restore test:** restore a backup into the test project at least once before go-live.
- **Off-site copies:** run `pg_dump` through the session pooler (port 5432). Use a `pg_dump` with the same major version as the server, or newer. The dashboard shows the server version. Store dumps off the machine, encrypted.
- **Pausing:** free projects pause after one week of inactivity. Paid plans do not pause for inactivity.
- **Monitoring:** check the Supabase logs and the Vercel function logs after each deploy.

## 11. Security checklist

- Row Level Security is on for every table, and no policies exist (layer 3 in the migration). The app connects as the table owner, which bypasses RLS. That is intended. If you ever add a separate app role, it needs its own grants and policies. Without them it sees nothing.
- `shop` stays out of the exposed schemas. Check with section 6.
- No `service_role` key and no database URI in client code or `NEXT_PUBLIC_*` variables.
- The database URI is a Sensitive variable in Vercel and never goes into git.
- No `SECURITY DEFINER` functions. Do not add one to fix a permission error. If you add a view later, create it with `security_invoker = true`.
- Pin the `postgres` version with `--save-exact`, and commit the lockfile.
- Login keys are SHA-256 hashes. Failure rows expire after one day.
- CI uses a scoped access token. The database password is a separate CI secret.
- Never run the tests or the seed against the live project.

## 12. Schema reference

| Table | Purpose |
|-------|---------|
| `counters` | Document number sequences (orders, customers, deliveries, receipts, invoices by financial year) |
| `settings` | Company, billing and operations settings as JSON |
| `products` | The three fuels: PMG (petrol), HSD (diesel) and HOBC |
| `product_rates` | Rate card per product, effective from a date |
| `customers` | Business customers: dealers, banks, restaurants and others |
| `customer_sites` | Delivery sites for a customer |
| `orders` | Fuel orders, with an optional delivery window |
| `order_items` | Litres and rate per product on an order |
| `depots` | Storage depots |
| `tanks` | Storage tanks, per depot and product |
| `stock_movements` | Book stock: receipts, dispatches, returns and adjustments |
| `dip_readings` | Physical tank dips and the variance from book stock |
| `deliveries` | Dispatch of an order by vehicle. One per order |
| `delivery_items` | Litres loaded per product on a delivery |
| `invoices` | Invoices raised after delivery. Cancelled invoices keep their numbers |
| `invoice_lines` | Lines on an invoice |
| `payments` | Customer payments, posted or voided |
| `payment_allocations` | How each payment applies to invoices |
| `ledger_entries` | Debit and credit entries. A customer's balance is total debits less total credits |
| `audit_log` | Who did what, and when |
| `login_attempts` | Failed sign-ins for the lockout, keyed by hash |

Constraints worth knowing:
- Money is `bigint` paisa. Litres are whole numbers.
- At most one issued invoice per order (a partial unique index). Cancelling an invoice frees its order.
- Each ledger entry has one side only, debit or credit.
- Window times are 24-hour `HH:MM`. Both are set or neither is, and the end is after the start.
- Every foreign key column has an index. The checks test this.
- Foreign keys have no `ON DELETE` clause. Records are voided or cancelled, never deleted.

## 13. Deviations from the project rules (need your approval)

- **Primary keys** are `bigint` identity, not UUID. Approved on 2026-11-21 (decision 3).
- **Money** is `bigint` paisa, not `numeric(10,2)`. Whole-number arithmetic has no rounding, and it matches the current app.
- **Append-only tables** (`ledger_entries`, `stock_movements`, `payment_allocations`, `invoice_lines`, `dip_readings`, `audit_log`, `login_attempts`) have no `updated_at`, because their rows are written once.
- **Soft delete** uses status columns (`status`, `cancel_reason`, `void_reason`), not `deleted_at`. The business rule is void or cancel, never delete.

## 14. What was checked

**Checked here**
- The schema in PGlite (PostgreSQL 18.7 compiled to WebAssembly): 35 checks, all pass. They cover the table list, row level security on every table, the four `updated_at` triggers, foreign-key indexes, the privilege checks for `anon`, `authenticated` and `PUBLIC`, constraint rejections, the ledger balance, book stock, the counter upsert, and denied access for `anon` and `authenticated`.
- Supabase facts, against the public docs and changelog on 2026-11-21: pooler hosts and ports, the username format, prepared statements, the direct connection and the IPv4 add-on, SSL, Data API exposure, backups, free-plan pausing, regions, the CLI v3 changes, Vercel region codes, and the npm version.
- postgres.js 4.1.1 option names, checked against the installed type definitions and source on 2026-11-21. The client was built with the section 7.2 options without connecting, and the camelCase helpers were checked.

**Not checked**
- Nothing has run against a Supabase project.
- The Supabase CLI is not installed on this machine. The commands in section 5 come from the changelog. Check them with `--help` first.
- The code has run against PostgreSQL 18.7 (PGlite), served over the Postgres protocol on this machine. All 60 tests pass, the seed runs and refuses a second run, and the production build passes. It has not run against Supabase. The write lock is untested under real concurrency, because PGlite runs one query at a time.
- The default privileges in your project. The migration revokes what it creates. Run section 6 after each migration.
- Current prices (Pro, the point-in-time add-on), and the Supavisor version of your pooler.
