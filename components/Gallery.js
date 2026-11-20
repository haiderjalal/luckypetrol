"use client";

import { motion } from "framer-motion";
import SectionHead from "./SectionHead";
import StockImage from "./StockImage";
import { images } from "@/lib/images";

const gallery = [
  { src: images.story, alt: "Oil pipeline", caption: "Pipelines", wide: true },
  { src: images.station, alt: "Fuel station at night", caption: "Fuel stations" },
  { src: images.tanker, alt: "Fuel tanker on the highway", caption: "Distribution" },
  { src: images.rig, alt: "Offshore oil rig", caption: "Exploration" },
  { src: images.pump, alt: "Fuel pump", caption: "Retail" },
];

export default function Gallery() {
  return (
    <section id="gallery" className="section">
      <SectionHead eyebrow="Gallery" title="Behind the scenes of energy" />

      <div className="gallery">
        {gallery.map((item, i) => (
          <motion.figure
            key={item.caption}
            className={`gallery-item ${item.wide ? "wide" : ""}`}
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            whileInView={{ clipPath: "inset(0 0 0% 0)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <StockImage src={item.src} alt={item.alt} className="gallery-img" />
            <figcaption>{item.caption}</figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
