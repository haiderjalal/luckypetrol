# Internal shop (/shop)

A password-protected system for Lucky Petroleum staff. It covers the everyday work of an oil marketing company that sells fuel in bulk to dealers, vendors, banks, restaurants, fast-food outlets and other businesses: taking orders, checking credit, dispatching from depot tanks, invoicing after delivery, recording payments, and keeping the customer ledger and stock up to date.

Status: working locally, with a test suite. Not yet deployed. See "Limitations" before going live.

## What it does

| Area | Features |
| --- | --- |
| Sign-in | One staff login from `SHOP_USERNAME` and `SHOP_PASSWORD`. Session cookie, 12 hours. Five failed attempts lock a client out for 15 minutes. |
| Dashboard | Sales today, this month and this financial year; owed to us; collections; advances; orders in progress; 14-day sales trend; litres and value by product; top customers; stock alerts; latest orders and payments. |
| Customers | Directory with search and filters. Types: dealer, vendor (shop owner), bank, restaurant, fast-food chain outlet, logistics, industrial, textile, construction, healthcare, education, government, other. Credit limit, payment terms, discount per litre, NTN and STRN, delivery sites. Customer codes (CU-0001). |
| Orders | Litres of PMG (petrol), HSD (diesel) and HOBC (high octane) per order; delivery site or address; delivery date and time window; source (shop, phone, WhatsApp, email, website). Live estimate at today's rates less the customer's discount. Status queue: received, confirmed, dispatched, delivered, cancelled. |
| Credit control | On confirmation, ledger balance plus other open orders plus this order must stay within the credit limit. Going over needs an approval reason, which is saved with the order and written to the audit log. |
| Dispatch and stock | Depots and tanks per product. Loading takes stock from the fullest tanks first and fails before writing anything if there is not enough. Vehicle, driver, seal numbers. Delivery records the litres delivered; any shortfall goes back into a depot tank. Printable delivery note. |
| Invoices | Issued after delivery for the litres actually delivered. Invoice numbers restart each financial year (LP/2026-27/0001). Printable invoice on the company letterhead with logo, NTN/STRN, bank details and the amount in words. Cancelling is allowed only when no payment is applied. |
| Sharing | WhatsApp click-to-chat messages for invoices, order details and payment reminders. Each invoice has a public link that shows only that invoice (random 24-byte token). |
| Payments | Receipts by cash, cheque, bank transfer, online, card or other. Applied to the oldest open invoice first; any excess is an advance, applied automatically to the next invoice. Voiding reverses the application and is logged. Printable receipt. |
| Ledger and aging | Customer statement with running balance and period filter. Aging by days overdue (current, 1–30, 31–60, 61–90, over 90), with advances shown separately. |
| Rate card | Rates per product from a date onwards. Back-dating is refused. Orders and invoices keep the rate they were made at. |
| Reports | Sales by product and by customer type, top customers, collections by method, aging. CSV downloads: invoices, payments, orders, ledger, aging, sales by product, stock. CSV cells that start with a formula character are neutralised. |
| Settings | Letterhead details, invoice prefix, default payment terms, sales tax rate and treatment, two bank accounts, dip variance tolerance, low-stock warning level. |
| Audit log | Every change records who, when and what. Entries cannot be edited or deleted from the screen. |

## How the money works

- All money is stored as whole paisa (1 rupee = 100 paisa). Litres are whole numbers. No floating-point amounts are stored.
- Customer balance = total invoiced − total received (advances make it negative). The ledger is the source of truth; invoice outstanding amounts are derived from payment allocations.
- The test suite checks that, for every customer, the ledger balance equals open invoices minus advances held.
- Dates are Pakistan time (Asia/Karachi). The financial year runs 1 July to 30 June.

## Rules the system applies (to confirm)

These are reasonable defaults, not confirmed business or tax rules. Each one lives in a setting, a validation schema or a service so it can be changed.

1. **Sales tax**: default rate 0%, with prices treated as tax-inclusive. Enter the rate in Settings once confirmed. The invoice title is "Sales Tax Invoice" when an STRN is set, otherwise "Invoice". Confirm the title, the tax treatment and whether an FBR-compliant format is needed.
2. **Tax number formats**: NTN accepted as 7 or 13 digits; STRN as 13 digits. Confirm against the registration certificates.
3. **Credit**: a credit limit of 0 means pay in advance. Over-limit confirmation needs an approval reason.
4. **Payment terms**: default 7 days, set per customer. Due date = invoice date + terms.
5. **Invoicing**: only after delivery, for the delivered litres. One invoice per order. Cancelled invoices keep their number.
6. **Rates**: changes are effective from a date; back-dating is refused.
7. **Dip variance**: flagged when the dip differs from book stock by more than 0.5% (adjustable).
8. **Low stock**: flagged below 10% of capacity (adjustable).
9. **Litres**: stored as typed, at the ambient temperature. Temperature correction to 15°C and density conversion are not applied.
10. **Safety limit**: a typed quantity above 1,000,000 litres per product is refused as a probable typing error.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000/shop and sign in with the username and password from `.env.local`.

Set up `.env.local` (copy `.env.example`). The session secret must be at least 32 characters:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Demo data: `npm run shop:seed` adds clearly labelled DEMO records to an empty database. It refuses to run if customers already exist. To remove demo data, reset the test database with the statement in section 8 of `docs/supabase-setup.md`.

Tests: `npm test` runs the business-rule suite (money, dates, totals, phone numbers, sessions, CSV) and an end-to-end flow on the test database named by `SHOP_TEST_DATABASE_URL`: order, credit override, dispatch, short delivery, invoice, FIFO payments, advances, void, cancellation, dips, aging and ledger reconciliation.

## Hosting

The data lives in Supabase Postgres, so the shop can run on Vercel. The setup, the environment variables and the migration are in `docs/supabase-setup.md`.

- On Vercel (any environment where `VERCEL` is set), `/shop`, `/api/shop` and the public invoice links under `/share` return "Not found" unless `SHOP_ENABLED=true` is set. Set it only after the database works in that environment.
- Locally, and on any server you control, the shop is always on.

## Data and backups

- Database: Supabase Postgres, in the `shop` schema. The schema is in `supabase/migrations/`. The app reads `SHOP_DATABASE_URL`. Tests and the demo seed read `SHOP_TEST_DATABASE_URL` and refuse the live database.
- Backups: the Pro plan keeps daily backups for 7 days. Also keep off-site `pg_dump` copies and test a restore (see the setup guide).
- Schema changes: add a new numbered migration in `supabase/migrations/`. Never edit a migration that has already been applied.

## Security

- The login is a single shared account. Anyone who knows the password is the shop. Change `SHOP_PASSWORD` to a long unique value before go-live, and plan for named staff accounts.
- The password lives only in `.env.local` (git-ignored). The session is an HMAC-signed, HttpOnly, SameSite cookie.
- Every page under `/shop` and every `/api/shop` route requires a valid session, checked by middleware and again in the layout and every server action.
- Inputs are validated on the server with zod before any write. Database access uses bound parameters only.
- Public invoice links are unguessable and show one invoice. Treat them as sensitive: anyone with the link can read it.
- Lockout is per client address and username. Failures are stored in the database as hashes (`shop.login_attempts`), so every server instance shares the count. If the app is behind a proxy, configure it to pass the real client address; `X-Forwarded-For` is trusted for this purpose.
- Serve it over HTTPS in production. Cookies are marked Secure in production builds.

## Limitations (not built yet)

- **WhatsApp**: sending is click-to-chat. Staff press Send. Automatic sending, and PDF attachments, need the WhatsApp Business Cloud API with Meta credentials and a public URL for the document.
- **PDFs**: documents print through the browser (Print, then Save as PDF). There is no server-side PDF generation.
- **Tax filing**: no FBR digital invoicing integration, no sales tax return reports, no e-invoice numbering rules.
- **Users**: one shared login; no roles, no per-user permissions.
- **Deployment and storage**: the database is Supabase Postgres. Production needs the environment variables and the `bom1` function region from `docs/supabase-setup.md`, and `SHOP_ENABLED=true` once the converted code is live.
- **Orders**: one delivery per order; no partial dispatch across several tankers; no proforma or advance invoices; no combined monthly invoices.
- **Payments**: allocation is oldest-first only; you cannot pick which invoice a receipt pays.
- **Opening balances**: no import from existing ledgers yet. Enter opening invoices through a data migration before go-live.
- **Reminders**: payment reminders are drafted by hand and sent from WhatsApp; there is no scheduled reminder.
- **Testing**: the suite covers business rules and the end-to-end service flow. In a browser, these were checked by hand: sign-in (wrong password, correct password, return to the requested page, sign-out), the dashboard, the orders list and order form (live estimate), an order detail, an invoice with its letterhead, the public share link, payments, the ledger, dispatch, depots and stock, the rate card, reports, settings, the audit log, the CSV download, the customer form (validation message and save), and the phone layout of the dashboard. Not every screen was clicked through, and printed output has not been checked on paper.

## Industry research

A background research pass on Pakistani oil marketing operations, OGRA and FBR rules, and WhatsApp messaging constraints was started during the build. Its findings were not yet incorporated when this document was written. When they arrive, they should be checked against the rules listed above before any of them are changed in the code.

## Next steps (recommended order)

1. Confirm the rules above with the accountant and the operations lead, and enter the real NTN, STRN and bank details in Settings.
2. Change the shop password; add named staff accounts if more than one person will use it.
3. Choose the Supabase region and plan, then turn the shop on in Production (`SHOP_ENABLED=true`) after the Preview test passes.
4. Set up WhatsApp Business API access if automatic sending is wanted.
5. Import opening balances and the first real stock counts.
6. Run a short pilot with one depot and a few customers before using it for every order.
