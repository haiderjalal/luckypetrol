"use client";

import { useId } from "react";

import { useActionFormState } from "./ActionForm.js";

/**
 * A labelled input, select or textarea inside an ActionForm. Shows its error message from the last submit.
 * Pass `value` and `onChange` to make it controlled (used where one field changes another).
 */
export function Field({ name, label, as = "input", type = "text", options = [], required = false, disabled = false, hint = "", rows = 3, className = "", ...inputProps }) {
  const { errors } = useActionFormState();
  const id = useId();
  const error = errors[name];
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  const common = {
    id,
    name,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    disabled,
    ...inputProps,
  };

  let control;
  if (as === "select") {
    control = (
      <select {...common}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (as === "textarea") {
    control = <textarea {...common} rows={rows} />;
  } else {
    control = <input type={type} {...common} />;
  }

  return (
    <div className={`shop-field${error ? " shop-field--error" : ""}${className ? ` ${className}` : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="shop-field__req" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p id={`${id}-hint`} className="shop-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="shop-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
