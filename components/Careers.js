"use client";

import { motion } from "framer-motion";
import StockImage from "@/components/StockImage";
import { ArrowRightIcon } from "@/components/Icons";
import { careers } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];

export default function Careers() {
  return (
    <section id="careers" className="careers" aria-labelledby="careers-title">
      <div className="careers__bg" aria-hidden="true">
        <StockImage image={images.retailTwin} sizes="100vw" />
      </div>
      <div className="careers__shade" aria-hidden="true" />
      <div className="careers__stripes" aria-hidden="true" />

      <div className="container careers__content">
        <motion.h2
          id="careers-title"
          className="title careers__title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {careers.title}
        </motion.h2>

        <motion.p
          className="careers__text"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
        >
          {careers.text}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        >
          <a className="btn" href={careers.url} target="_blank" rel="noopener noreferrer">
            {careers.cta}
            <ArrowRightIcon className="btn__arrow" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
