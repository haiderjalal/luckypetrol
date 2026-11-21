"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { ArrowRightIcon } from "@/components/Icons";
import { contact, site } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1];
const MESSAGE_LIMIT = contact.messageLimit;
const initialForm = { name: "", email: "", phone: "", message: "" };

const contactRows = [
  { label: "Address", value: site.address },
  { label: "Email", value: site.email, href: `mailto:${site.email}` },
  { label: site.phones[0].label, value: site.phones[0].value, href: site.phones[0].href },
  { label: "Office phone", value: site.phones[1].value },
  { label: "WhatsApp", value: site.phones[0].value, href: site.whatsappUrl, external: true },
];

export default function Contact() {
  const [form, setForm] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${form.name}`);
    const body = encodeURIComponent(
      `${form.message}\n\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}`
    );
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  }

  return (
    <section id="contact" className="section" aria-labelledby="contact-title">
      <div className="container contact">
        <div>
          <SectionHead number="10" label="Contact" title={contact.title} titleId="contact-title" text={contact.text} />

          <div className="contact__rows">
            {contactRows.map((row) => (
              <div key={`${row.label}-${row.value}`} className="contact__row">
                <p className="contact__label">{row.label}</p>
                <p className="contact__value">
                  {row.href ? (
                    <a href={row.href} {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <motion.form
          className="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
        >
          <div className="form__row">
            <div className="field">
              <label htmlFor="contact-name">Full name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="contact-phone">Phone number</label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              name="message"
              rows={4}
              maxLength={MESSAGE_LIMIT}
              value={form.message}
              onChange={handleChange}
              aria-describedby="contact-message-count"
              required
            />
            <p id="contact-message-count" className="field__count">
              {form.message.length} / {MESSAGE_LIMIT}
            </p>
          </div>

          <button type="submit" className="btn form__submit">
            Send message
            <ArrowRightIcon className="btn__arrow" />
          </button>
        </motion.form>
      </div>
    </section>
  );
}
