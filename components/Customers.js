"use client";

import Gallery from "@/components/Gallery";
import SectionHead from "@/components/SectionHead";
import { DownloadIcon } from "@/components/Icons";
import { customers, retail, site } from "@/lib/site";

export default function Customers() {
  return (
    <section id="customers" className="section" aria-labelledby="customers-title">
      <div className="container">
        <SectionHead
          number="06"
          label="Customers"
          title={customers.title}
          titleId="customers-title"
          text={customers.intro}
        />

        <ul className="sectors">
          {customers.sectors.map((sector, index) => (
            <li key={sector} className="sector">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{sector}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="container retail">
        <SectionHead label={retail.eyebrow} title={retail.title} titleId="retail-title" text={retail.intro} />

        <div className="retail-points">
          {retail.highlights.map((item) => (
            <article key={item.title} className="retail-point">
              <h3>{item.title}</h3>
              <p className="retail-point__quote">{item.quote}</p>
              {item.text && <p className="retail-point__text">{item.text}</p>}
            </article>
          ))}
        </div>

        <Gallery />

        <div className="retail__actions">
          <a className="link" href={site.dealerFormUrl} target="_blank" rel="noopener noreferrer">
            {retail.dealerCta}
            <DownloadIcon className="link__icon" />
          </a>
        </div>
      </div>
    </section>
  );
}
