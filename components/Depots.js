"use client";

import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import StockImage from "@/components/StockImage";
import { depotsSection } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];
const largestCapacity = Math.max(...depotsSection.items.map((depot) => depot.capacityMt));

function formatTonnes(value) {
  return `${value.toLocaleString("en-US")} MT`;
}

function DepotCard({ depot, index }) {
  const fillWidth = `${(depot.capacityMt / largestCapacity) * 100}%`;

  return (
    <motion.article
      className="depot"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
    >
      <div className="depot__head">
        <h3 className="depot__name">{depot.name}</h3>
        <span className="depot__status">{depot.status}</span>
      </div>
      {depot.location && <p className="depot__location">{depot.location}</p>}
      <p className="depot__text">{depot.text}</p>

      <div className="capacity">
        <div className="capacity__meta">
          <span>{depot.capacityLabel}</span>
          <strong>{formatTonnes(depot.capacityMt)}</strong>
        </div>
        <div className="capacity__track">
          <motion.div
            className="capacity__fill"
            style={{ width: fillWidth }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.3, ease: EASE }}
          >
            {depot.split?.map((part) => (
              <span
                key={part.code}
                className={`capacity__segment capacity__segment--${part.code.toLowerCase()}`}
                style={{ width: `${(part.mt / depot.capacityMt) * 100}%` }}
              />
            ))}
          </motion.div>
        </div>

        {depot.split && (
          <ul className="capacity__legend">
            {depot.split.map((part) => (
              <li key={part.code}>
                <span className={`swatch swatch--${part.code.toLowerCase()}`} aria-hidden="true" />
                {part.label}: {formatTonnes(part.mt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.article>
  );
}

export default function Depots() {
  return (
    <section id="depots" className="section" aria-labelledby="depots-title">
      <div className="container">
        <div className="depots-intro">
          <div className="depots-intro__media">
            <StockImage image={images.depotSunset} sizes="(min-width: 960px) 46vw, 100vw" />
          </div>
          <SectionHead title={depotsSection.title} titleId="depots-title" text={depotsSection.intro} />
        </div>

        <div className="depots">
          {depotsSection.items.map((depot, index) => (
            <DepotCard key={depot.name} depot={depot} index={index} />
          ))}
        </div>

        <p className="depots__future">{depotsSection.future}</p>
      </div>
    </section>
  );
}
