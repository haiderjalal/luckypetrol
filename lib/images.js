// ============================================================
// STOCK IMAGES: replace any URL with your own photo link.
// Current images are keyword photos from LoremFlickr.
// For commercial use, swap in Unsplash or Pexels image links.
// ============================================================

const photo = (keywords, lock) =>
  `https://loremflickr.com/1400/900/${keywords}?lock=${lock}`;

export const images = {
  hero: photo("oil,refinery,night", 1),
  depot: photo("oil,storage,tanks", 2),
  story: photo("oil,pipeline", 3),
  tanker: photo("fuel,tanker,truck", 4),
  station: photo("gas,station,night", 5),
  rig: photo("oil,rig,sea", 6),
  pump: photo("petrol,pump", 7),
};
