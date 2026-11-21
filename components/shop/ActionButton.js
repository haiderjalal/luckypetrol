"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { navigateAfterAction } from "./navigate-after-action.js";

/**
 * A button that runs one server action with a fixed input. Optional confirmation before it runs.
 * @param {{ action: (input: object) => Promise<object>, input?: object, label: string, pendingLabel?: string, variant?: "primary" | "ghost" | "danger" | "sidebar", confirmMessage?: string, disabled?: boolean }} props
 */
export function ActionButton({ action, input = {}, label, pendingLabel = "Working…", variant = "primary", confirmMessage = "", disabled = false }) {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    startTransition(async () => {
      const response = await action(input);
      setResult(response);
      navigateAfterAction(response, router);
    });
  }

  return (
    <span className="shop-action">
      <button type="button" className={`shop-button shop-button--${variant}`} onClick={handleClick} disabled={disabled || isPending}>
        {isPending ? pendingLabel : label}
      </button>
      {result && !result.ok ? (
        <span className="shop-action__message shop-action__message--error" role="alert">
          {result.message}
        </span>
      ) : null}
      {result?.ok && result.message && !result.redirectTo ? (
        <span className="shop-action__message" role="status">
          {result.message}
        </span>
      ) : null}
    </span>
  );
}
