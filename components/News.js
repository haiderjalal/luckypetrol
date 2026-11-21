"use client";

import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { media, site } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];

/** Brand film section. Keeps the News.js file name from the earlier layout. */
export default function News() {
  return (
    <section id="media" className="section section--alt" aria-labelledby="media-title">
      <div className="container">
        <SectionHead title={media.title} titleId="media-title" />

        <motion.figure
          className="media__player"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <video
            className="media__video"
            src={images.brandFilm.src}
            poster={images.brandFilm.poster}
            controls
            playsInline
            preload="metadata"
            aria-label={`${site.name} brand film`}
          />
        </motion.figure>
      </div>
    </section>
  );
}
