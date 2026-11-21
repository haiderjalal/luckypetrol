"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { navLinks, site } from "@/lib/site";
import { brand } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1];
const HIDE_AFTER_PX = 400;
const DESKTOP_QUERY = "(min-width: 1140px)";

const sectionIds = [...navLinks.map((link) => link.href.slice(1)), "contact"];
const mobileLinks = [...navLinks, { href: "#contact", label: "Contact" }];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const prefersReducedMotion = useReducedMotion();

  // Compact the header once the page scrolls, and hide it while scrolling down.
  useEffect(() => {
    let lastY = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 24);
      setIsHidden(currentY > lastY && currentY > HIDE_AFTER_PX);
      lastY = currentY;
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Highlight the nav link for the section that is currently in view.
  useEffect(() => {
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Stop the page scrolling behind the open menu, and close the menu at desktop widths.
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setIsMenuOpen(false);
    };
    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktopQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  const isHeaderHidden = isHidden && !isMenuOpen;

  return (
    <>
      <motion.header
        className={`header ${isScrolled ? "is-scrolled" : ""}`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: isHeaderHidden ? "-100%" : "0%", opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: EASE }}
      >
        <div className="header__inner">
          <a href="#top" className="brand" aria-label={`${site.name} home`} onClick={closeMenu}>
            <Image
              src={brand.logo.src}
              alt={brand.logo.alt}
              width={brand.logo.width}
              height={brand.logo.height}
              priority
              className="brand__logo"
            />
          </a>

          <nav className="nav" aria-label="Main">
            {navLinks.map((link) => {
              const isActive = activeId === link.href.slice(1);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`nav__link ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "location" : undefined}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="nav__indicator"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="header__actions">
            <a href="#contact" className="btn btn--small header__cta" onClick={closeMenu}>
              Contact Us
            </a>
            <button
              type="button"
              className="menu-btn"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul className="mobile-menu__list">
              {mobileLinks.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + index * 0.05, duration: 0.45, ease: EASE }}
                >
                  <a href={link.href} onClick={closeMenu}>
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <p className="mobile-menu__foot">{site.phones[0].value}</p>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
