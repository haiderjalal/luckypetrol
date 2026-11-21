import { site } from "../../site.js";
import { DEFAULT_LOW_STOCK_PERCENT, DEFAULT_PAYMENT_TERMS_DAYS, DEFAULT_VARIANCE_TOLERANCE_PERCENT } from "../constants.js";
import { currentDb, transaction } from "../db.js";
import { listSettingRows, upsertSetting } from "../repositories/settings.js";
import { recordAudit } from "./audit.js";

/** Starting values. Company details come from the public site content, so they are never typed twice. */
export async function defaultSettings() {
  return {
    company: {
      name: site.name,
      legalName: site.legalName,
      address: site.address,
      phone: site.phones[0].value,
      officePhone: site.phones[1].value,
      email: site.email,
      ntn: "",
      strn: "",
      whatsapp: site.whatsappUrl.replace("https://wa.me/", ""),
    },
    billing: {
      invoicePrefix: "LP",
      paymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
      taxRateBps: 0,
      taxMode: "inclusive",
      invoiceFooter: "",
      bankAccounts: [],
    },
    operations: {
      varianceTolerancePercent: DEFAULT_VARIANCE_TOLERANCE_PERCENT,
      lowStockPercent: DEFAULT_LOW_STOCK_PERCENT,
    },
  };
}

/** Merges saved settings over the defaults, so a new setting added later still has a value. */
export async function readSettings(db) {
  const defaults = await defaultSettings();
  const stored = Object.fromEntries((await listSettingRows(db)).map((row) => [row.key, row.value]));

  return {
    company: { ...defaults.company, ...(stored.company ?? {}) },
    billing: { ...defaults.billing, ...(stored.billing ?? {}) },
    operations: { ...defaults.operations, ...(stored.operations ?? {}) },
  };
}

export async function getSettings() {
  const db = currentDb();
  return readSettings(db);
}

function bankAccountsFrom(input) {
  return [
    { bankName: input.bank1Name, accountTitle: input.bank1Title, accountNumber: input.bank1Account, iban: input.bank1Iban },
    { bankName: input.bank2Name, accountTitle: input.bank2Title, accountNumber: input.bank2Account, iban: input.bank2Iban },
  ].filter((account) => Object.values(account).some((value) => value !== ""));
}

/** Turns the flat settings form into the stored document, one entry per settings group. */
function toSettingsDocument(input) {
  return {
    company: {
      name: input.companyName,
      legalName: input.companyLegalName,
      address: input.companyAddress,
      phone: input.companyPhone,
      officePhone: input.companyOfficePhone,
      email: input.companyEmail,
      ntn: input.companyNtn,
      strn: input.companyStrn,
      whatsapp: input.companyWhatsapp,
    },
    billing: {
      invoicePrefix: input.invoicePrefix,
      paymentTermsDays: input.paymentTermsDays,
      taxRateBps: input.taxRateBps,
      taxMode: input.taxMode,
      invoiceFooter: input.invoiceFooter,
      bankAccounts: bankAccountsFrom(input),
    },
    operations: {
      varianceTolerancePercent: input.varianceTolerancePercent,
      lowStockPercent: input.lowStockPercent,
    },
  };
}

export async function saveSettings(input, actor) {
  return transaction(async (db) => {
    for (const [key, value] of Object.entries(toSettingsDocument(input))) {
      await upsertSetting(db, key, value);
    }

    await recordAudit(db, {
      actor,
      action: "settings.updated",
      entityType: "settings",
      summary: "Company, billing and operations settings were changed",
    });

    return { message: "Settings saved." };
  });
}
