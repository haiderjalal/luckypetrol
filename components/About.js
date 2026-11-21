"use client";

import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import StockImage from "@/components/StockImage";
import { DownloadIcon, EyeIcon, TargetIcon } from "@/components/Icons";
import { about, site } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];
const missionIcons = [TargetIcon, EyeIcon];

export default function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="container about">
        <div className="about__media">
          <div className="about__accent" aria-hidden="true" />
          <div className="about__frame">
            <StockImage image={images.about} sizes="(min-width: 960px) 46vw, 100vw" />
            <motion.span
              className="about__wipe"
              aria-hidden="true"
              initial={{ scaleX: 1 }}
              whileInView={{ scaleX: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.1, ease: EASE }}
              style={{ transformOrigin: "right center" }}
            />
          </div>
          <motion.div
            className="about__badge"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
          >
            {about.badge}
          </motion.div>
        </div>

        <div className="about__content">
          <SectionHead eyebrow="About us" title={about.title} titleId="about-title" />
          {about.paragraphs.map((paragraph, index) => (
            <motion.p
              key={index}
              className="body-copy about__paragraph"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: EASE }}
            >
              {paragraph}
            </motion.p>
          ))}
          <div className="about__actions">
            <a className="btn" href={site.companyProfileUrl} target="_blank" rel="noopener noreferrer">
              Download company profile
              <DownloadIcon className="btn__arrow" />
            </a>
          </div>
        </div>
      </div>

      <div className="container mission-grid">
        {[about.mission, about.vision].map((item, index) => {
          const Icon = missionIcons[index];
          return (
            <motion.article
              key={item.title}
              className="card mission-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.8, delay: index * 0.15, ease: EASE }}
            >
              <span className="mission-card__icon">
                <Icon />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
