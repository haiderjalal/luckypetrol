"use client";

import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { media, site } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.16, 1, 0.3, 1];

/** Brand film section. The file keeps the News.js name from the earlier layout. */
export default function News() {
  return (
    <section id="media" className="section" aria-labelledby="media-title">
      <div className="container">
        <SectionHead number="08" label="Media" title={media.title} titleId="media-title" />

        <motion.figure
          className="film"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: EASE }}
        >
          <video
            className="film__video"
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
