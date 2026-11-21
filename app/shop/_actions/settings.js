"use server";

import { runShopAction } from "@/lib/shop/action-runner.js";
import { saveSettings } from "@/lib/shop/services/settings.js";
import { settingsSchema } from "@/lib/shop/validation/settings.js";
import { parseInput } from "@/lib/shop/validation/parse.js";

export async function saveSettingsAction(input) {
  return runShopAction(({ actor }) => saveSettings(parseInput(settingsSchema, input), actor));
}
