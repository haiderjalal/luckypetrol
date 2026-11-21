"use client";

import SectionHead from "@/components/SectionHead";
import StockImage from "@/components/StockImage";
import { services } from "@/lib/site";
import { images } from "@/lib/images";

const serviceImages = [images.retailGoodbye, images.lubricants, images.depotTanks];

export default function Services() {
  return (
    <section id="services" className="section" aria-labelledby="services-title">
      <div className="container">
        <SectionHead
          number="04"
          label="Services"
          title="Fuels, lubricants and logistics"
          titleId="services-title"
        />

        {services.map((service, index) => (
          <article key={service.title} className={`service-row ${index % 2 === 1 ? "service-row--flip" : ""}`}>
            <div className="service-row__media">
              <StockImage image={serviceImages[index]} sizes="(min-width: 960px) 50vw, 100vw" reveal />
            </div>
            <div>
              <p className="service-row__index">0{index + 1}</p>
              <h3 className="service-row__title">{service.title}</h3>
              <p className="service-row__quote">{service.quote}</p>
              <p className="service-row__text">{service.text}</p>
              <p className="service-row__detail">{service.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
