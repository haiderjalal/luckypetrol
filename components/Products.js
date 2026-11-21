"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { FlameIcon, PumpIcon, TruckIcon } from "@/components/Icons";
import useCountUp from "@/hooks/useCountUp";
import { fuelPrices } from "@/lib/site";

const EASE = [0.22, 1, 0.36, 1];
const priceIcons = { petrol: PumpIcon, diesel: TruckIcon, hobc: FlameIcon };

function PriceCard({ item, index }) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.5 });
  const valueRef = useCountUp(item.value, { decimals: 2, duration: 2, shouldStart: isInView });
  const Icon = priceIcons[item.code];

  return (
    <motion.article
      ref={cardRef}
      className="price-card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
    >
      <span className="price-card__icon">
        <Icon />
      </span>
      <h3 className="price-card__name">{item.name}</h3>
      <p className="price-card__value">
        <span ref={valueRef}>{item.value.toFixed(2)}</span>
      </p>
      <p className="price-card__unit">
        {fuelPrices.currency} / {fuelPrices.unit}
      </p>
      <motion.span
        className="price-card__bar"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isInView ? 1 : 0 }}
        transition={{ duration: 1.2, delay: 0.4 + index * 0.1, ease: EASE }}
      />
    </motion.article>
  );
}

export default function Products() {
  return (
    <section id="prices" className="section prices-section" aria-labelledby="prices-title">
      <div className="container">
        <SectionHead title={fuelPrices.title} titleId="prices-title" align="center" />
        <div className="prices">
          {fuelPrices.items.map((item, index) => (
            <PriceCard key={item.code} item={item} index={index} />
          ))}
        </div>
        <p className="prices__note">{fuelPrices.note}</p>
      </div>
    </section>
  );
}
