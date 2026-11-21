import { saveSettingsAction } from "@/app/shop/_actions/settings.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import Notice from "@/components/shop/Notice.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { TAX_MODE_LABELS } from "@/lib/shop/constants.js";
import { formatMobileForDisplay } from "@/lib/shop/phone.js";
import { selectOptions } from "@/lib/shop/presentation.js";
import { getSettings } from "@/lib/shop/services/settings.js";
import { basisPointsToPercent } from "@/lib/shop/totals.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
};

function BankFields({ slot, account }) {
  return (
    <fieldset className="shop-fieldset">
      <legend>Bank account {slot}{slot === 2 ? " (optional)" : ""}</legend>
      <Field name={`bank${slot}Name`} label="Bank" defaultValue={account.bankName ?? ""} />
      <Field name={`bank${slot}Title`} label="Account title" defaultValue={account.accountTitle ?? ""} />
      <Field name={`bank${slot}Account`} label="Account number" defaultValue={account.accountNumber ?? ""} />
      <Field name={`bank${slot}Iban`} label="IBAN" defaultValue={account.iban ?? ""} hint="Starts with the country code, for example PK" />
    </fieldset>
  );
}

export default function SettingsPage() {
  const { company, billing, operations } = getSettings();
  const [bank1 = {}, bank2 = {}] = billing.bankAccounts;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company details, invoice numbering, sales tax and bank accounts. These appear on every invoice, receipt and delivery note."
      />

      <div style={{ marginBottom: "1.25rem" }}>
        <Notice tone="warning" title="Check the tax settings before issuing invoices.">
          Enter your NTN and STRN, and confirm with your accountant whether a sales tax rate applies and whether your prices already include it.
          Until a rate is set, invoices show no sales tax.
        </Notice>
      </div>

      <ActionForm action={saveSettingsAction} submitLabel="Save settings" pendingLabel="Saving…">
        <div className="shop-form__grid">
          <fieldset className="shop-fieldset shop-form__wide">
            <legend>Company (letterhead)</legend>
            <Field name="companyName" label="Trading name" required defaultValue={company.name} />
            <Field name="companyLegalName" label="Legal name" defaultValue={company.legalName ?? ""} />
            <Field name="companyAddress" label="Address" as="textarea" rows={2} required defaultValue={company.address} className="shop-form__wide" />
            <Field name="companyPhone" label="Phone" defaultValue={company.phone ?? ""} inputMode="tel" />
            <Field name="companyOfficePhone" label="Office phone" defaultValue={company.officePhone ?? ""} inputMode="tel" />
            <Field name="companyEmail" label="Email" type="email" defaultValue={company.email ?? ""} />
            <Field name="companyWhatsapp" label="Business WhatsApp number" defaultValue={company.whatsapp ? formatMobileForDisplay(company.whatsapp) : ""} inputMode="tel" hint="Used for the WhatsApp contact line on documents" />
            <Field name="companyNtn" label="NTN" defaultValue={company.ntn ?? ""} hint="7 or 13 digits" inputMode="numeric" />
            <Field name="companyStrn" label="STRN" defaultValue={company.strn ?? ""} hint="13 digits, if registered for sales tax" inputMode="numeric" />
          </fieldset>

          <fieldset className="shop-fieldset shop-form__wide">
            <legend>Invoices and sales tax</legend>
            <Field name="invoicePrefix" label="Invoice prefix" required defaultValue={billing.invoicePrefix} hint="Invoices are numbered PREFIX/2026-27/0001 and restart each July" />
            <Field name="paymentTermsDays" label="Default payment terms (days)" required defaultValue={String(billing.paymentTermsDays)} hint="Used for new customers; each customer can have their own" inputMode="numeric" />
            <Field
              name="taxRateBps"
              label="Sales tax rate (%)"
              defaultValue={basisPointsToPercent(billing.taxRateBps)}
              hint="For example 18. Leave 0 if no sales tax applies."
              inputMode="decimal"
            />
            <Field
              name="taxMode"
              label="Tax treatment of prices"
              as="select"
              required
              options={selectOptions(TAX_MODE_LABELS, "Choose")}
              defaultValue={billing.taxMode}
              hint="Decides whether the rate on the rate card already includes sales tax"
            />
            <Field name="invoiceFooter" label="Footer text on invoices" as="textarea" rows={2} defaultValue={billing.invoiceFooter ?? ""} className="shop-form__wide" />
          </fieldset>

          <BankFields slot={1} account={bank1} />
          <BankFields slot={2} account={bank2} />

          <fieldset className="shop-fieldset shop-form__wide">
            <legend>Stock and dips</legend>
            <Field
              name="varianceTolerancePercent"
              label="Dip variance tolerance (%)"
              defaultValue={String(operations.varianceTolerancePercent)}
              hint="A dip further from book stock than this is flagged"
              inputMode="decimal"
            />
            <Field name="lowStockPercent" label="Low-stock warning (%)" defaultValue={String(operations.lowStockPercent)} hint="Tanks below this share of capacity are flagged" inputMode="numeric" />
          </fieldset>
        </div>
      </ActionForm>
    </>
  );
}
