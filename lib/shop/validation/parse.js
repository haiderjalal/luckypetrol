import { ShopError } from "../errors.js";

/**
 * Parses untrusted input with a zod schema. Throws a ShopError that carries field-level messages for the form.
 * @template T
 * @param {{ safeParse: (input: unknown) => { success: boolean, data?: T, error?: { issues: Array<{ path: PropertyKey[], message: string }> } } }} schema
 * @param {unknown} input
 * @returns {T}
 */
export function parseInput(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (result.success) {
    return result.data;
  }

  const fieldErrors = {};
  let formMessage = null;

  for (const issue of result.error.issues) {
    if (issue.path.length === 0) {
      formMessage ??= issue.message;
      continue;
    }

    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }

  throw new ShopError(formMessage ?? "Please check the highlighted fields.", {
    code: "validation",
    fieldErrors,
  });
}
