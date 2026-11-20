"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView } from "framer-motion";
import { stats } from "@/lib/site";

function Counter({ value, suffix, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate(latest) {
        node.textContent = Math.round(latest).toLocaleString("en-US") + suffix;
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section className="stats">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="stat"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: i * 0.1 }}
        >
          <Counter className="stat-value" value={s.value} suffix={s.suffix} />
          <span className="stat-label">{s.label}</span>
        </motion.div>
      ))}
    </section>
  );
}
