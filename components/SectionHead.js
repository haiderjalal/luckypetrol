"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];

const groupVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const maskUp = {
  hidden: { y: "105%" },
  visible: { y: "0%", transition: { duration: 0.9, ease: EASE } },
};

const drawLine = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE } },
};

/**
 * Section heading: an optional eyebrow, a title that rises out of a mask,
 * and a divider that draws in. Everything plays once, when the heading scrolls into view.
 */
export default function SectionHead({ eyebrow, title, text, titleId, align = "left" }) {
  return (
    <motion.div
      className={`section-head section-head--${align}`}
      variants={groupVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
    >
      {eyebrow && (
        <motion.p className="eyebrow" variants={fadeUp}>
          {eyebrow}
        </motion.p>
      )}

      <h2 id={titleId} className="title">
        <span className="mask">
          <motion.span style={{ display: "block" }} variants={maskUp}>
            {title}
          </motion.span>
        </span>
      </h2>

      <motion.div className="divider" variants={fadeUp}>
        <motion.span className="divider__line" variants={drawLine} style={{ transformOrigin: "right center" }} />
        <span className="divider__icon">
          <Image src={brand.icon.src} alt="" fill sizes="26px" />
        </span>
        <motion.span className="divider__line" variants={drawLine} style={{ transformOrigin: "left center" }} />
      </motion.div>

      {text && (
        <motion.p className="section-head__text" variants={fadeUp}>
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}
