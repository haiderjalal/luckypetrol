"use client";

import { motion } from "framer-motion";
import StockImage from "./StockImage";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

const headline = ["Fuel", "that", "moves", "a", "nation."];
const PIPE = "M-20 80 C 150 80, 200 30, 360 30 S 560 100, 720 70 S 960 20, 1220 60";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.3 } },
};

const wordVariant = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg">
        <motion.div
          className="hero-zoom"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 12, ease: "easeOut" }}
        >
          <StockImage src={images.hero} alt="Oil refinery at dusk" className="hero-img" priority />
        </motion.div>
      </div>
      <div className="hero-overlay" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="hero-content">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Since {site.founded} · {site.country}
        </motion.p>

        <motion.h1
          className="hero-title"
          variants={container}
          initial="hidden"
          animate="show"
          aria-label="Fuel that moves a nation."
        >
          {headline.map((word) => (
            <span key={word} className="word-mask">
              <motion.span
                className={word === "nation." ? "word accent" : "word"}
                variants={wordVariant}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          className="hero-text"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {site.heroText}
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <a href="#products" className="btn">
            Explore products
          </a>
          <a href="#story" className="btn btn-ghost">
            Our story
          </a>
        </motion.div>
      </div>

      <svg className="hero-pipeline" viewBox="0 0 1200 120" aria-hidden="true">
        <motion.path
          d={PIPE}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, delay: 0.6, ease: "easeInOut" }}
        />
        <circle r="6" fill="#ffb703">
          <animateMotion dur="6s" repeatCount="indefinite" path={PIPE} />
        </circle>
      </svg>

      <div className="scroll-cue" />
    </section>
  );
}
