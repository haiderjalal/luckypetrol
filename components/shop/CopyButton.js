"use client";

import { useState } from "react";

/** Copies text to the clipboard. Falls back to a visible message if the browser refuses. */
export function CopyButton({ text, label = "Copy" }) {
  const [status, setStatus] = useState("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  const buttonLabel = status === "copied" ? "Copied" : status === "failed" ? "Copy not allowed" : label;
  return (
    <button type="button" className="shop-button shop-button--ghost" onClick={handleCopy}>
      {buttonLabel}
    </button>
  );
}
