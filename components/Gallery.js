"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { retailGallery } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];

export default function Gallery() {
  return (
    <ul className="gallery" aria-label="Retail outlet photos">
      {retailGallery.map((photo, index) => (
        <motion.li
          key={photo.src}
          className="gallery__item"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
        >
          <div className="gallery__frame">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 900px) 33vw, 100vw"
              className="gallery__image"
            />
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
