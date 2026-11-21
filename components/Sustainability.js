"use client";

import { motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import SectionHead from "@/components/SectionHead";
import { sustainability } from "@/lib/site";

const EASE = [0.22, 1, 0.36, 1];

const drawPath = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 1.6, ease: EASE } },
};

function LeafDrawing() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
    >
      <motion.path d="M5 19C5 11 10 6 20 5c-1 10-6 15-15 14z" variants={drawPath} />
      <motion.path d="M5 19l8-8" variants={drawPath} />
    </motion.svg>
  );
}

function ShieldDrawing() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
    >
      <motion.path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" variants={drawPath} />
      <motion.path d="M9 12l2 2 4-4" variants={drawPath} />
    </motion.svg>
  );
}

const drawings = [LeafDrawing, ShieldDrawing];

export default function Sustainability() {
  return (
    <section id="sustainability" className="section" aria-labelledby="sustainability-title">
      <div className="container">
        <SectionHead title={sustainability.title} titleId="sustainability-title" text={sustainability.intro} />

        <div className="sustain-grid">
          {sustainability.items.map((item, index) => {
            const Drawing = drawings[index];
            return (
              <Reveal key={item.title} className="reveal-slot" delay={index * 0.15}>
                <article className="card sustain-card">
                  <span className="sustain-card__icon">
                    <Drawing />
                  </span>
                  <h3 className="sustain-card__title">{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
