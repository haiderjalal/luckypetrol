"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "@/components/Icons";
import { hero } from "@/lib/site";
import { brand, images } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const titleWords = hero.title.split(" ");

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__media" aria-hidden="true">
        {prefersReducedMotion ? (
          <Image src={images.heroPoster.src} alt="" fill priority sizes="100vw" className="hero__image" />
        ) : (
          <video
            className="hero__video"
            src={images.heroVideo.src}
            poster={images.heroPoster.src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        )}
        <div className="hero__shade" />
      </div>

      <motion.div
        className="hero__mark"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.7, rotate: -25 }}
        animate={{ opacity: 0.14, scale: 1, rotate: 0 }}
        transition={{ duration: 1.8, delay: 0.3, ease: EASE }}
      >
        <div className="hero__mark-spin">
          <Image src={brand.icon.src} alt="" fill sizes="(min-width: 900px) 540px, 60vw" />
        </div>
      </motion.div>

      <div className="container hero__content">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {hero.eyebrow}
        </motion.p>

        <h1 id="hero-title" className="hero__title">
          {titleWords.map((word, index) => (
            <span key={`${word}-${index}`} className="hero__word">
              <motion.span
                className="hero__word-inner"
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, delay: 0.2 + index * 0.08, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="hero__text"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
        >
          {hero.text}
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.95, ease: EASE }}
        >
          <a className="btn" href={hero.primaryCta.href}>
            {hero.primaryCta.label}
            <ArrowRightIcon className="btn__arrow" />
          </a>
          <a className="btn btn--ghost" href={hero.secondaryCta.href}>
            {hero.secondaryCta.label}
          </a>
        </motion.div>
      </div>

      <a href="#about" className="hero__scroll">
        <span className="visually-hidden">Scroll to About Lucky Petroleum</span>
      </a>
    </section>
  );
}
