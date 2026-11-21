"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1];

function formatNumber(value, decimals) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Counts a number up to `target` once `shouldStart` becomes true.
 * The value is written straight to the DOM node, so React does not re-render on every frame.
 * Users who prefer reduced motion see the final value straight away.
 */
export default function useCountUp(target, { decimals = 0, duration = 1.8, shouldStart = false } = {}) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !shouldStart) return undefined;

    if (prefersReducedMotion) {
      node.textContent = formatNumber(target, decimals);
      return undefined;
    }

    node.textContent = formatNumber(0, decimals);
    const controls = animate(0, target, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        node.textContent = formatNumber(latest, decimals);
      },
    });

    return () => controls.stop();
  }, [target, decimals, duration, shouldStart, prefersReducedMotion]);

  return ref;
}
