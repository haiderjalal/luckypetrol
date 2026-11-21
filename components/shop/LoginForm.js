"use client";

import { ActionForm } from "./ActionForm.js";
import { Field } from "./Field.js";

/** Sign-in form. The server action checks the password and sets the session cookie. */
export function LoginForm({ action, nextPath }) {
  return (
    <ActionForm action={action} submitLabel="Sign in" pendingLabel="Signing in…" className="shop-form shop-login__form">
      <input type="hidden" name="next" value={nextPath} />
      <Field name="username" label="Username" autoComplete="username" required />
      <Field name="password" label="Password" type="password" autoComplete="current-password" required />
    </ActionForm>
  );
}
