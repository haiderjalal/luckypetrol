"use client";

import Gallery from "@/components/Gallery";
import Reveal from "@/components/Reveal";
import SectionHead from "@/components/SectionHead";
import { CartIcon, DownloadIcon, TyreIcon, WashIcon } from "@/components/Icons";
import { customers, retail, site } from "@/lib/site";

const retailIcons = [CartIcon, WashIcon, TyreIcon];

export default function Customers() {
  return (
    <section id="customers" className="section section--alt" aria-labelledby="customers-title">
      <div className="container">
        <SectionHead
          eyebrow={customers.eyebrow}
          title={customers.title}
          titleId="customers-title"
          text={customers.intro}
        />
      </div>

      <div className="marquee" aria-label="Sectors we serve">
        <ul className="marquee__track">
          {[...customers.sectors, ...customers.sectors].map((sector, index) => (
            <li
              key={`${sector}-${index}`}
              className="marquee__item"
              aria-hidden={index >= customers.sectors.length || undefined}
            >
              {sector}
            </li>
          ))}
        </ul>
      </div>

      <div className="container retail">
        <SectionHead
          eyebrow={retail.eyebrow}
          title={retail.title}
          titleId="retail-title"
          text={retail.intro}
        />

        <div className="retail-grid">
          {retail.highlights.map((item, index) => {
            const Icon = retailIcons[index];
            return (
              <Reveal key={item.title} className="reveal-slot" delay={index * 0.12}>
                <article className="retail-card">
                  <span className="retail-card__icon">
                    <Icon />
                  </span>
                  <h3>{item.title}</h3>
                  <p className="retail-card__quote">{item.quote}</p>
                  {item.text && <p className="retail-card__text">{item.text}</p>}
                </article>
              </Reveal>
            );
          })}
        </div>

        <Gallery />

        <div className="retail__actions">
          <a className="btn btn--ghost" href={site.dealerFormUrl} target="_blank" rel="noopener noreferrer">
            {retail.dealerCta}
            <DownloadIcon className="btn__arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}
