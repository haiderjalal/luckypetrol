"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const groupVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

const lineUp = {
  hidden: { y: "102%" },
  visible: { y: "0%", transition: { duration: 1.1, ease: EASE } },
};

/** Section heading: a numbered label, a title that rises out of a mask, and optional copy. */
export default function SectionHead({ number, label, title, titleId, text }) {
  return (
    <motion.div
      className="section-head"
      variants={groupVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
    >
      {label && (
        <motion.p className="label" variants={rise}>
          {number && <span className="label__num">{number}</span>}
          {label}
        </motion.p>
      )}

      <h2 id={titleId} className="title">
        <span className="mask">
          <motion.span style={{ display: "block" }} variants={lineUp}>
            {title}
          </motion.span>
        </span>
      </h2>

      {text && (
        <motion.p className="copy" variants={rise}>
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}
