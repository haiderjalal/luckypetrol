# Summit Petroleum (Next.js)

An animated, fast, one-page petroleum company website built with Next.js and Framer Motion.

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

- Brand name, phone, email, address, stats, products, timeline and news: `lib/site.js`
- Stock photos: `lib/images.js`
- Colors and spacing: `app/globals.css` (the `:root` block at the top)
- Sections: `app/page.js` decides the order; each section lives in `components/`

## Stock images

`lib/images.js` uses LoremFlickr keyword photos so the site looks finished right away. For a commercial launch, replace them with photos from Unsplash (unsplash.com) or Pexels (pexels.com), which allow commercial use. Right-click a photo, choose "Copy image address", and paste it into `lib/images.js`.

## Deploy (free)

Push this folder to GitHub, then import the repo at vercel.com.
