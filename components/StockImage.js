"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const WIPE_EASE = [0.76, 0, 0.24, 1];

/**
 * A photo that drifts slightly as the page scrolls. With `reveal`, a brand-red panel wipes
 * away the first time the photo comes into view. It fills its nearest positioned parent,
 * so that parent needs a size and a position.
 */
export default function StockImage({ image, sizes = "100vw", className = "", reveal = false, position }) {
  const frameRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div ref={frameRef} className={`parallax-frame ${className}`}>
      <motion.div className="parallax-frame__inner" style={{ y: prefersReducedMotion ? 0 : y }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          style={position ? { objectPosition: position } : undefined}
        />
      </motion.div>
      {reveal && !prefersReducedMotion && (
        <motion.span
          className="wipe"
          aria-hidden="true"
          initial={{ scaleX: 1 }}
          whileInView={{ scaleX: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, ease: WIPE_EASE }}
        />
      )}
    </div>
  );
}
