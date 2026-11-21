"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import useCountUp from "@/hooks/useCountUp";
import { ClockIcon, StationIcon, StorageIcon, UsersIcon } from "@/components/Icons";
import { stats } from "@/lib/site";

const EASE = [0.22, 1, 0.36, 1];
const statIcons = [UsersIcon, StationIcon, StorageIcon, ClockIcon];

function StatItem({ stat, index }) {
  const itemRef = useRef(null);
  const isInView = useInView(itemRef, { once: true, amount: 0.6 });
  const valueRef = useCountUp(stat.value, { duration: 2, shouldStart: isInView });
  const Icon = statIcons[index];

  return (
    <motion.div
      ref={itemRef}
      className="stat"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: EASE }}
    >
      <Icon className="stat__icon" />
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
    <section className="section section--tight" aria-label="Lucky Petroleum at a glance">
      <div className="container">
        <div className="stats">
          {stats.map((stat, index) => (
            <StatItem key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
