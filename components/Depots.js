"use client";

import { motion, useReducedMotion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import StockImage from "@/components/StockImage";
import { depotsSection } from "@/lib/site";
import { images } from "@/lib/images";

const EASE = [0.16, 1, 0.3, 1];
const TANK_MAX_HEIGHT = 340;
const largestCapacity = Math.max(...depotsSection.items.map((depot) => depot.capacityMt));

function formatTonnes(value) {
  return `${value.toLocaleString("en-US")} MT`;
}

/** Stacks product segments from the bottom of a tank, sized by their share of capacity. */
function TankSegments({ depot }) {
  if (!depot.split) {
    return <span className="tank__seg tank__seg--planned" style={{ bottom: 0, height: "100%" }} />;
  }

  let offset = 0;
  return depot.split.map((part) => {
    const share = (part.mt / depot.capacityMt) * 100;
    const segment = (
      <span
        key={part.code}
        className={`tank__seg tank__seg--${part.code.toLowerCase()}`}
        style={{ bottom: `${offset}%`, height: `${share}%` }}
      />
    );
    offset += share;
    return segment;
  });
}

function Tank({ depot, index }) {
  const prefersReducedMotion = useReducedMotion();
  const height = (depot.capacityMt / largestCapacity) * TANK_MAX_HEIGHT;

  return (
    <motion.article
      className="tank"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, delay: index * 0.12, ease: EASE }}
    >
      <div className="tank__stage">
        <motion.div
          className="tank__body"
          style={{ height }}
          initial={prefersReducedMotion ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.5, delay: 0.25 + index * 0.12, ease: EASE }}
        >
          <TankSegments depot={depot} />
        </motion.div>
      </div>

      <div className="tank__info">
        <h3 className="tank__name">{depot.name}</h3>
        <p className="tank__status">{depot.status}</p>
        {depot.location && <p className="tank__meta">{depot.location}</p>}
        <p className="tank__capacity">
          <span>{depot.capacityLabel}</span>
          <strong>{formatTonnes(depot.capacityMt)}</strong>
        </p>
        {depot.split && (
          <ul className="tank__legend">
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

/** Depots on a light section. Tank height shows capacity; segments show the product split. */
export default function Depots() {
  return (
    <section id="depots" className="section section--paper" aria-labelledby="depots-title">
      <div className="container">
        <div className="depots__head">
          <SectionHead
            number="05"
            label="Projects"
            title={depotsSection.title}
            titleId="depots-title"
            text={depotsSection.intro}
          />
          <div className="depots__banner">
            <StockImage image={images.depotSunset} sizes="(min-width: 960px) 46vw, 100vw" reveal position="50% 62%" />
          </div>
        </div>

        <div className="tanks">
          {depotsSection.items.map((depot, index) => (
            <Tank key={depot.name} depot={depot} index={index} />
          ))}
        </div>

        <p className="depots__future">{depotsSection.future}</p>
      </div>
    </section>
  );
}
