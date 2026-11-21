"use client";

/** Shown when a shop page fails. Staff see a plain message; the detail goes to the server log. */
export default function ShopError({ reset }) {
  return (
    <div className="shop-notice shop-notice--error" role="alert" style={{ maxWidth: 640 }}>
      <strong>This page could not be loaded. </strong>
      Nothing was changed. Try again, and if it keeps happening, note what you were doing and tell the system owner.
      <div style={{ marginTop: ".75rem" }}>
        <button type="button" className="shop-button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
