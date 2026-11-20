"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import StockImage from "./StockImage";
import { images } from "@/lib/images";

export default function ParallaxBand() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section ref={ref} className="band">
      <motion.div className="band-media" style={{ y }}>
        <StockImage src={images.depot} alt="Fuel storage tanks" className="band-img" />
      </motion.div>
      <div className="band-overlay" />
      <div className="band-text">
        <motion.h2
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          Every drop has a journey.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
        >
          We move fuel safely from depot to pump, around the clock.
        </motion.p>
      </div>
    </section>
  );
}
