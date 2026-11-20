"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/lib/site";

const links = [
  { href: "#story", label: "Our Story" },
  { href: "#products", label: "Products" },
  { href: "#gallery", label: "Gallery" },
  { href: "#news", label: "News" },
  { href: "#contact", label: "Contact" },
];

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb703" />
          <stop offset="1" stopColor="#ff6b35" />
        </linearGradient>
      </defs>
      <motion.path
        d="M20 4 C20 4 6 20 6 27 A14 14 0 0 0 34 27 C34 20 20 4 20 4 Z"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="2.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <motion.header
      className={`navbar ${scrolled ? "scrolled" : ""}`}
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <a href="#top" className="brand" onClick={close}>
        <Logo />
        <span>{site.name}</span>
      </a>

      <nav className="desktop-nav">
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>

      <a href="#contact" className="btn btn-small nav-cta">
        Get a Quote
      </a>

      <button
        className="menu-toggle"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
      </button>

      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
          >
            {links.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={close}
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                {l.label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
