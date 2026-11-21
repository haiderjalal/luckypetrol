# Lucky Petroleum (Next.js)

A fast, one-page website for Lucky Petroleum with motion throughout: an animated hero, scroll reveals, counting prices and stats, a responsive header and an animated mobile menu.

## Run it

1. Install Node.js 18.18 or newer (nodejs.org)
2. Open a terminal in this folder
3. Run:

       npm install
       npm run dev

4. Open http://localhost:3000

## Build for production

       npm run build
       npm start

## Customize

- Company copy, contact details, fuel rates, depots, services and stats: `lib/site.js`
- Photo, logo and video paths: `lib/images.js` (the files live in `public/`)
- Blog posts: `lib/posts.js` (review the drafts before publishing)
- Colours and spacing: `app/globals.css` (the `:root` block at the top)
- Sections: `app/page.js` sets the order; each section lives in `components/`

## Brand assets

The logo, photos, favicon and brand film were copied from luckypetroleum.pk. Confirm you have the company's permission before publishing them.

Fuel rates change often. Update `fuelPrices` in `lib/site.js` before each launch.

## Internal shop (/shop)

A password-protected system for staff: customers and delivery sites, orders (petrol, diesel, HOBC in litres), credit checks, depot stock and dispatch, invoices with the letterhead, payments and the customer ledger, aging, rate card, reports and an audit log.

1. Node.js 22.13 or newer is required (the database uses the built-in `node:sqlite`).
2. Copy `.env.example` to `.env.local` and set `SHOP_USERNAME`, `SHOP_PASSWORD` and a `SHOP_SESSION_SECRET` of at least 32 characters.
3. Run `npm run dev`, then open http://localhost:3000/shop.
4. Optional: `npm run shop:seed` adds clearly labelled DEMO data to an empty database.
5. Run the tests with `npm test`.

The database is a local file at `data/shop.sqlite` (git-ignored). Back it up regularly. See `docs/shop-system.md` for how the system works, the rules it applies and what still needs confirming.

## Deploy (free)

Push this folder to GitHub, then import the repo at vercel.com.
