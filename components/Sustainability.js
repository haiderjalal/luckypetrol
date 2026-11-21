"use client";

import Reveal from "@/components/Reveal";
import SectionHead from "@/components/SectionHead";
import { sustainability } from "@/lib/site";

export default function Sustainability() {
  return (
    <section id="sustainability" className="section" aria-labelledby="sustainability-title">
      <div className="container sustain">
        <SectionHead
          number="07"
          label="Sustainability"
          title={sustainability.title}
          titleId="sustainability-title"
          text={sustainability.intro}
        />

        <div className="sustain__pillars">
          {sustainability.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.12}>
              <article className="sustain__item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
