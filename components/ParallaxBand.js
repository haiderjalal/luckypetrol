"use client";

import { motion } from "framer-motion";
import StockImage from "@/components/StockImage";
import { ceoMessage } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.16, 1, 0.3, 1];

/** CEO message: photo on one side, a black panel with the quote on the other. */
export default function ParallaxBand() {
  return (
    <section className="ceo" aria-label={ceoMessage.label}>
      <div className="ceo__media">
        <StockImage image={images.fuelBackground} sizes="(min-width: 960px) 50vw, 100vw" reveal />
      </div>

      <div className="ceo__panel">
        <p className="label">{ceoMessage.label}</p>
        <p className="ceo__mark" aria-hidden="true">
          “
        </p>
        <motion.blockquote
          className="ceo__quote"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, delay: 0.15, ease: EASE }}
        >
          <p>{ceoMessage.quote}</p>
        </motion.blockquote>
        <p className="ceo__author">
          {ceoMessage.name}
          <span>{ceoMessage.role}</span>
        </p>
      </div>
    </section>
  );
}
