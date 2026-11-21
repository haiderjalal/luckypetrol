"use client";

import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { journey } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1];

export default function Story() {
  return (
    <section id="journey" className="section" aria-labelledby="journey-title">
      <div className="container journey">
        <SectionHead number="03" label="Journey" title={journey.title} titleId="journey-title" />

        <ol className="journey__list">
          {journey.items.map((item, index) => (
            <motion.li
              key={`${item.year}-${item.title}`}
              className="journey__item"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: EASE }}
            >
              <p className="journey__year">{item.year}</p>
              <div>
                <h3 className="journey__title">{item.title}</h3>
                <p className="journey__text">{item.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
