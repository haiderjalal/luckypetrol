// Checks the shop login against SHOP_USERNAME and SHOP_PASSWORD. Both sides are hashed first,
// so the comparison takes the same time whatever the input length.

import { getShopPassword, getShopUsername } from "./config.js";

const encoder = new TextEncoder();

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

function sameBytes(left, right) {
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

/** Returns true only when both the username (case-insensitive) and the password match. */
export async function verifyCredentials(username, password) {
  const expectedUsername = getShopUsername().toLowerCase();
  const expectedPassword = getShopPassword();
  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  // Both comparisons always run, so the timing does not reveal which field was wrong.
  const usernameMatches = sameBytes(await sha256(String(username ?? "").trim().toLowerCase()), await sha256(expectedUsername));
  const passwordMatches = sameBytes(await sha256(String(password ?? "")), await sha256(expectedPassword));
  return usernameMatches && passwordMatches;
}
