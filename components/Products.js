"use client";

import { motion } from "framer-motion";
import SectionHead from "./SectionHead";
import { products } from "@/lib/site";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const card = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Products() {
  return (
    <section id="products" className="section">
      <SectionHead
        eyebrow="Products"
        title="Fuel built for every journey"
        text="Quality-tested petroleum products for cars, trucks, generators and industry."
      />

      <motion.div
        className="product-grid"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {products.map((p) => (
          <motion.article key={p.code} className="product-card" variants={card} whileHover={{ y: -10 }}>
            <span className="code">{p.code}</span>
            <h3>{p.name}</h3>
            <p className="product-text">{p.text}</p>
            <div className="price">
              <span>{p.priceLabel}</span>
              <strong>{p.price}</strong>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
