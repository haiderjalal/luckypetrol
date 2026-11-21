"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import SectionHead from "@/components/SectionHead";
import { DropletIcon, PumpIcon, TruckIcon } from "@/components/Icons";
import { services } from "@/lib/site";
import { images } from "@/lib/images";

const serviceVisuals = [
  { icon: PumpIcon, image: images.retailGoodbye },
  { icon: DropletIcon, image: images.lubricants },
  { icon: TruckIcon, image: images.depotTanks },
];

export default function Services() {
  return (
    <section id="services" className="section section--alt" aria-labelledby="services-title">
      <div className="container">
        <SectionHead title="Services" titleId="services-title" />

        <div className="services">
          {services.map((service, index) => {
            const { icon: Icon, image } = serviceVisuals[index];
            return (
              <Reveal key={service.title} className="reveal-slot" delay={index * 0.12}>
                <article className="service">
                  <div className="service__media">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 900px) 33vw, 100vw"
                      className="service__image"
                    />
                    <span className="service__icon">
                      <Icon />
                    </span>
                  </div>
                  <div className="service__body">
                    <h3 className="service__title">{service.title}</h3>
                    <p className="service__quote">{service.quote}</p>
                    <p>{service.text}</p>
                    <p>{service.detail}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
