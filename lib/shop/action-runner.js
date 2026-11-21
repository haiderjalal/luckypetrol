// Wraps every server action: checks the session, runs the work, refreshes the shop pages,
// and turns failures into results the screen can show. Unexpected errors are logged, never shown raw.

import { revalidatePath } from "next/cache";

import { isShopError } from "./errors.js";
import { logger } from "./logger.js";
import { requireSignedInUser } from "./session-guard.js";

/**
 * @template T
 * @param {(context: { actor: string }) => T | Promise<T>} work
 * @returns {Promise<{ ok: true, message?: string, redirectTo?: string } | { ok: false, code: string, message: string, fieldErrors?: Record<string, string> }>}
 */
export async function runShopAction(work) {
  try {
    const user = await requireSignedInUser();
    const data = (await work({ actor: user.username })) ?? {};
    revalidatePath("/shop", "layout");
    return { ok: true, ...data };
  } catch (error) {
    if (isShopError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    logger.error("Shop action failed", { error });
    return { ok: false, code: "server", message: "Something went wrong. Please try again." };
  }
}
