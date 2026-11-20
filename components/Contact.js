"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SectionHead from "./SectionHead";
import { site } from "@/lib/site";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\nFrom: ${form.name} (${form.email})`);
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  }

  const infoCards = [
    ["Phone", site.phone],
    ["Email", site.email],
    ["Office", site.address],
  ];

  return (
    <section id="contact" className="section">
      <SectionHead
        eyebrow="Contact"
        title="Let's fuel your next move"
        text="Dealers, business customers and partners: send us a message and our team will get back to you."
      />

      <div className="contact-wrap">
        <div className="contact-info">
          {infoCards.map(([label, value], i) => (
            <motion.div
              key={label}
              className="info-card"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <span>{label}</span>
              <strong>{value}</strong>
            </motion.div>
          ))}
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="form"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <input name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
          <input
            name="email"
            type="email"
            placeholder="Your email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <textarea
            name="message"
            placeholder="Your message"
            rows={4}
            value={form.message}
            onChange={handleChange}
            required
          />
          <button type="submit" className="btn">
            Send Message
          </button>
        </motion.form>
      </div>
    </section>
  );
}
