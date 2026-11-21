"use client";

import { useState } from "react";

import { formatMobileForDisplay, normalisePakistaniMobile } from "../../lib/shop/phone.js";
import { buildWhatsAppLink } from "../../lib/shop/whatsapp.js";

import { CopyButton } from "./CopyButton.js";

/**
 * Sends a prepared message through WhatsApp. This opens a chat with the text filled in; the user presses Send.
 * Automatic sending needs the WhatsApp Business API, which is not connected yet.
 */
export function WhatsAppShare({ defaultNumber = "", message, title = "Send by WhatsApp" }) {
  const [number, setNumber] = useState(defaultNumber ? formatMobileForDisplay(defaultNumber) : "");
  const digits = normalisePakistaniMobile(number);
  const href = digits ? buildWhatsAppLink(digits, message) : null;
  const numberHint = number && !digits ? "Enter a Pakistani mobile number, such as 0334 7266695." : "Any Pakistani mobile number works.";

  return (
    <section className="shop-card shop-share" aria-labelledby="whatsapp-share-title">
      <h2 id="whatsapp-share-title">{title}</h2>
      <div className="shop-share__row">
        <div className="shop-field">
          <label htmlFor="whatsapp-number">WhatsApp number</label>
          <input
            id="whatsapp-number"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="0334 7266695"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            aria-describedby="whatsapp-number-hint"
          />
          <p id="whatsapp-number-hint" className="shop-field__hint">
            {numberHint}
          </p>
        </div>
        {href ? (
          <a className="shop-button" href={href} target="_blank" rel="noopener noreferrer">
            Open in WhatsApp
          </a>
        ) : (
          <span className="shop-button" aria-disabled="true">
            Open in WhatsApp
          </span>
        )}
        <CopyButton text={message} label="Copy message" />
      </div>
      <details>
        <summary className="shop-muted">Preview the message</summary>
        <pre className="shop-message-preview">{message}</pre>
      </details>
    </section>
  );
}
