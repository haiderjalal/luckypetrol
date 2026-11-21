"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { journey } from "@/lib/site";

const EASE = [0.22, 1, 0.36, 1];

export default function Story() {
  const timelineRef = useRef(null);
  const isInView = useInView(timelineRef, { once: true, amount: 0.3 });

  return (
    <section id="journey" className="section" aria-labelledby="journey-title">
      <div className="container">
        <SectionHead title={journey.title} titleId="journey-title" />

        <div ref={timelineRef} className="timeline">
          <span className="timeline__track" aria-hidden="true">
            <motion.span
              className="timeline__progress"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isInView ? 1 : 0 }}
              transition={{ duration: 1.8, ease: EASE }}
            />
          </span>

          {journey.items.map((item, index) => (
            <motion.article
              key={`${item.year}-${item.title}`}
              className="milestone"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
              transition={{ duration: 0.7, delay: 0.3 + index * 0.25, ease: EASE }}
            >
              <span className="milestone__dot" aria-hidden="true" />
              <p className="milestone__year">{item.year}</p>
              <h3 className="milestone__title">{item.title}</h3>
              <p className="milestone__text">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
