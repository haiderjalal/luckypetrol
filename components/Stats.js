"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import useCountUp from "@/hooks/useCountUp";
import { stats } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1];

function StatItem({ stat, index }) {
  const itemRef = useRef(null);
  const isInView = useInView(itemRef, { once: true, amount: 0.6 });
  const valueRef = useCountUp(stat.value, { duration: 2.2, shouldStart: isInView });

  return (
    <motion.div
      ref={itemRef}
      className="stat"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.9, delay: index * 0.1, ease: EASE }}
    >
      <p className="stat__value">
        <span ref={valueRef}>{stat.value}</span>
        <span className="stat__suffix">{stat.suffix}</span>
      </p>
      <p className="stat__label">{stat.label}</p>
    </motion.div>
  );
}

export default function Stats() {
  return (
    <section className="stats-band" aria-label="Lucky Petroleum in numbers">
      <div className="container stats">
        {stats.map((stat, index) => (
          <StatItem key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </section>
  );
}
