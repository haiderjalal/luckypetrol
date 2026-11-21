"use client";

import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROLL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function formatValue(value, decimals) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Shows a number the way a forecourt price board does: each digit is a column that rolls
 * into place when the number scrolls into view. The server renders the final value, so
 * crawlers and users without JavaScript still read the right number.
 */
export default function RollingNumber({ value, decimals = 0, delay = 0, className = "" }) {
  const rootRef = useRef(null);
  const isInView = useInView(rootRef, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();
  const text = formatValue(value, decimals);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !isInView || prefersReducedMotion) return undefined;

    const strips = root.querySelectorAll("[data-digit]");
    strips.forEach((strip, index) => {
      const target = Number(strip.dataset.digit);
      strip.style.transition = "none";
      strip.style.transform = "translateY(0%)";
      // Read a layout property so the reset is committed before the roll starts.
      void strip.offsetHeight;
      strip.style.transition = `transform 1.6s ${ROLL_EASE} ${delay + index * 0.12}s`;
      strip.style.transform = `translateY(-${target * 10}%)`;
    });

    return undefined;
  }, [isInView, prefersReducedMotion, text, delay]);

  return (
    <span ref={rootRef} className={`rolling ${className}`}>
      <span className="visually-hidden">{text}</span>
      <span className="rolling__digits" aria-hidden="true">
        {text.split("").map((character, index) =>
          /\d/.test(character) ? (
            <span key={index} className="rolling__col">
              <span
                className="rolling__strip"
                data-digit={character}
                style={{ transform: `translateY(-${Number(character) * 10}%)` }}
              >
                {DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={index} className="rolling__sep">
              {character}
            </span>
          )
        )}
      </span>
    </span>
  );
}
