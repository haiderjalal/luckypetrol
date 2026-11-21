"use client";

import RollingNumber from "@/components/RollingNumber";
import SectionHead from "@/components/SectionHead";
import { fuelPrices } from "@/lib/site";

export default function Products() {
  return (
    <section id="prices" className="section" aria-labelledby="prices-title">
      <div className="container prices">
        <SectionHead
          number="02"
          label="Lucky Fuels"
          title={fuelPrices.title}
          titleId="prices-title"
          text={fuelPrices.note}
        />

        <div className="board">
          <div className="board__head">
            <span>Product</span>
            <span>
              {fuelPrices.currency} / {fuelPrices.unit}
            </span>
          </div>

          {fuelPrices.items.map((item, index) => (
            <div key={item.code} className="board__row">
              <span className="board__name">{item.name}</span>
              <RollingNumber value={item.value} decimals={2} delay={index * 0.15} className="board__value" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
