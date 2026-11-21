"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { navigateAfterAction } from "./navigate-after-action.js";

const ActionFormContext = createContext({ errors: {}, isPending: false });

/** Read by Field to show field-level errors and disable input while saving. */
export function useActionFormState() {
  return useContext(ActionFormContext);
}

/**
 * Submits a form to a server action and shows the result. Fields are passed as children
 * (see Field), so the server still renders most of the markup.
 * @param {{ action: (input: Record<string, string>) => Promise<object>, submitLabel: string, pendingLabel?: string, resetOnSuccess?: boolean, className?: string, footer?: import("react").ReactNode, children: import("react").ReactNode }} props
 */
export function ActionForm({ action, submitLabel, pendingLabel = "Saving…", resetOnSuccess = false, className = "shop-form", footer = null, children }) {
  const router = useRouter();
  const formRef = useRef(null);
  const [result, setResult] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget).entries());

    startTransition(async () => {
      const response = await action(input);
      setResult(response);
      if (response.ok && resetOnSuccess) {
        formRef.current?.reset();
      }
      navigateAfterAction(response, router);
    });
  }

  const errors = result && !result.ok && result.fieldErrors ? result.fieldErrors : {};

  return (
    <ActionFormContext.Provider value={{ errors, isPending }}>
      <form ref={formRef} className={className} onSubmit={handleSubmit} aria-busy={isPending} noValidate={false}>
        {result && !result.ok ? (
          <div className="shop-notice shop-notice--error" role="alert">
            {result.message}
          </div>
        ) : null}
        {result?.ok && result.message && !result.redirectTo ? (
          <div className="shop-notice shop-notice--success" role="status">
            {result.message}
          </div>
        ) : null}
        {children}
        <div className="shop-form__actions">
          <button type="submit" className="shop-button" disabled={isPending}>
            {isPending ? pendingLabel : submitLabel}
          </button>
          {footer}
        </div>
      </form>
    </ActionFormContext.Provider>
  );
}
