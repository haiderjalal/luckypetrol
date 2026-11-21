"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "@/components/Icons";
import { hero } from "@/lib/site";
import { brand, images } from "@/lib/images";

const EASE = [0.16, 1, 0.3, 1];

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__visual" aria-hidden="true">
        {prefersReducedMotion ? (
          <Image
            src={images.heroPoster.src}
            alt=""
            fill
            priority
            sizes="(min-width: 900px) 64vw, 100vw"
            className="hero__media"
          />
        ) : (
          <video
            className="hero__media"
            src={images.heroVideo.src}
            poster={images.heroPoster.src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        )}
      </div>
      <div className="hero__edge" aria-hidden="true" />

      <div className="container hero__inner">
        <motion.p
          className="hero__eyebrow"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
        >
          <span className="hero__eyebrow-icon">
            <Image src={brand.icon.src} alt="" fill sizes="26px" />
          </span>
          {hero.eyebrow}
        </motion.p>

        <h1 id="hero-title" className="hero__title">
          {hero.titleLines.map((line, index) => (
            <span
              key={line}
              className={`hero__line ${index === hero.titleLines.length - 1 ? "hero__line--accent" : ""}`}
            >
              <motion.span
                className="hero__line-inner"
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, delay: 0.25 + index * 0.12, ease: EASE }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="hero__text"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
        >
          {hero.text}
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: 18 }}
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
        Scroll
      </a>
    </section>
  );
}
