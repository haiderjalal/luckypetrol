"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SectionHead from "@/components/SectionHead";
import { ChatIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/Icons";
import { contact, site } from "@/lib/site";

const EASE = [0.22, 1, 0.36, 1];
const MESSAGE_LIMIT = contact.messageLimit;
const initialForm = { name: "", email: "", phone: "", message: "" };

const infoItems = [
  { icon: PinIcon, label: "Address", value: site.address },
  { icon: MailIcon, label: "Email", value: site.email, href: `mailto:${site.email}` },
  { icon: PhoneIcon, label: site.phones[0].label, value: site.phones[0].value, href: site.phones[0].href },
  { icon: PhoneIcon, label: "Office phone", value: site.phones[1].value },
  { icon: ChatIcon, label: "WhatsApp", value: site.phones[0].value, href: site.whatsappUrl },
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
        <div className="contact__intro">
          <SectionHead title={contact.title} titleId="contact-title" text={contact.text} />

          <div className="contact__info">
            {infoItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={`${item.label}-${item.value}`}
                  className="info-card"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
                >
                  <span className="info-card__icon">
                    <Icon />
                  </span>
                  <div>
                    <p className="info-card__label">{item.label}</p>
                    <p className="info-card__value">
                      {item.href ? (
                        <a
                          href={item.href}
                          {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                          {item.value}
                        </a>
                      ) : (
                        item.value
                      )}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.form
          className="card form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
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
              rows={5}
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
          </button>
        </motion.form>
      </div>
    </section>
  );
}
