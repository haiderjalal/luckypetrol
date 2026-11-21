"use client";

import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import StockImage from "@/components/StockImage";
import { DownloadIcon } from "@/components/Icons";
import { about, site } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.16, 1, 0.3, 1];

export default function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="container about">
        <div className="about__aside">
          <p className="about__year" aria-hidden="true">
            2003
          </p>
          <p className="about__caption">{about.caption}</p>
          <div className="about__photo">
            <StockImage image={images.about} sizes="(min-width: 960px) 40vw, 100vw" reveal />
          </div>
        </div>

        <div className="about__main">
          <SectionHead number="01" label="About us" title={about.title} titleId="about-title" />

          <div className="about__copy">
            {about.paragraphs.map((paragraph, index) => (
              <motion.p
                key={index}
                className="copy"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, delay: index * 0.1, ease: EASE }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          <div>
            <a className="link" href={site.companyProfileUrl} target="_blank" rel="noopener noreferrer">
              Download company profile
              <DownloadIcon className="link__icon" />
            </a>
          </div>
        </div>
      </div>

      <div className="container pillars">
        {[about.mission, about.vision].map((item, index) => (
          <motion.div
            key={item.title}
            className="pillar"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay: index * 0.1, ease: EASE }}
          >
            <h3 className="pillar__label">{item.title}</h3>
            <p className="pillar__text">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
