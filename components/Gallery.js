"use client";

import StockImage from "@/components/StockImage";
import { images } from "@/lib/images";

const galleryItems = [
  { image: images.retailTwin, wide: true },
  { image: images.retailGoodbye, wide: false },
  { image: images.retailDusk, wide: false },
];

/** Retail outlet photos: one wide frame above two half-width frames. */
export default function Gallery() {
  return (
    <div className="gallery-grid">
      {galleryItems.map(({ image, wide }) => (
        <div key={image.src} className={`gallery-grid__item ${wide ? "gallery-grid__item--wide" : ""}`}>
          <StockImage image={image} sizes={wide ? "100vw" : "(min-width: 900px) 50vw, 100vw"} reveal />
        </div>
      ))}
    </div>
  );
}
