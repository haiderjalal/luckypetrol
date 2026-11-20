"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SectionHead from "./SectionHead";
import { site, timeline } from "@/lib/site";

export default function Story() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 70%"],
  });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="story" className="section">
      <SectionHead eyebrow="Our Story" title="From the earth to your engine" text={site.storyLead} />

      <div className="timeline" ref={ref}>
        <div className="timeline-track">
          <motion.div className="timeline-fill" style={{ scaleY: fill }} />
        </div>

        {timeline.map((step, i) => {
          const side = i % 2 === 0 ? "left" : "right";
          return (
            <motion.div
              key={step.title}
              className={`timeline-item ${side}`}
              initial={{ opacity: 0, x: side === "left" ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="timeline-dot" />
              <div className="timeline-card">
                <span className="step-no">Step {step.year}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
