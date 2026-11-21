"use client";

/** Opens the browser print dialog, where the user can print or save as PDF. Hidden in print. */
export function PrintButton({ label = "Print or save as PDF" }) {
  return (
    <button type="button" className="shop-button shop-button--ghost shop-no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
