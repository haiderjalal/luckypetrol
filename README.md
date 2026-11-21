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

## Deploy (free)

Push this folder to GitHub, then import the repo at vercel.com.
