"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * A photo that drifts slightly as the page scrolls.
 * It fills its nearest positioned parent, so the parent must have a size and a position.
 */
export default function StockImage({ image, sizes = "100vw", className = "" }) {
  const frameRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div ref={frameRef} className={`parallax-frame ${className}`}>
      <motion.div className="parallax-frame__inner" style={{ y: prefersReducedMotion ? 0 : y }}>
        <Image src={image.src} alt={image.alt} fill sizes={sizes} />
      </motion.div>
    </div>
  );
}
