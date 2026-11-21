"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "@/components/Icons";
import { careers } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1];

export default function Careers() {
  return (
    <section id="careers" className="careers" aria-labelledby="careers-title">
      <div className="container">
        <motion.h2
          id="careers-title"
          className="careers__title"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, ease: EASE }}
        >
          {careers.title}
        </motion.h2>

        <motion.div
          className="careers__body"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
        >
          <p>{careers.text}</p>
          <a className="btn" href={careers.url} target="_blank" rel="noopener noreferrer">
            {careers.cta}
            <ArrowRightIcon className="btn__arrow" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
