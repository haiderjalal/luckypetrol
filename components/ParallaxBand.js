"use client";

import { motion } from "framer-motion";
import StockImage from "@/components/StockImage";
import { ceoMessage } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];

export default function ParallaxBand() {
  return (
    <section className="band" aria-label={ceoMessage.label}>
      <div className="band__bg" aria-hidden="true">
        <StockImage image={images.fuelBackground} sizes="100vw" />
        <div className="band__shade" />
      </div>

      <div className="container band__content">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {ceoMessage.label}
        </motion.p>

        <motion.blockquote
          className="band__quote"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p>{ceoMessage.quote}</p>
        </motion.blockquote>

        <motion.p
          className="band__author"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {ceoMessage.name}
          <span>{ceoMessage.role}</span>
        </motion.p>
      </div>
    </section>
  );
}
