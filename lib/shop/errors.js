// Expected business-rule failures. The message is written for staff and is safe to show on screen.

export class ShopError extends Error {
  /**
   * @param {string} message - Staff-facing message.
   * @param {{ code?: string, fieldErrors?: Record<string, string> }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "ShopError";
    this.code = options.code ?? "invalid";
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

export function isShopError(error) {
  return error instanceof ShopError;
}

export function notFoundError(label) {
  return new ShopError(`${label} was not found. It may have been removed.`, { code: "not_found" });
}
