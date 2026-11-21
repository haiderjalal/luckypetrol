import { CUSTOMER_STATUS_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/shop/constants.js";
import { selectOptions } from "@/lib/shop/presentation.js";

import { Field } from "./Field.js";

const STATUS_OPTIONS = Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => ({ value, label }));

/**
 * The fields of the customer form, shared by "add" and "edit". Values are strings, as typed.
 * @param {{ defaults?: Record<string, string> }} props
 */
export default function CustomerFields({ defaults = {} }) {
  const value = (key, fallback = "") => defaults[key] ?? fallback;

  return (
    <>
      <fieldset className="shop-fieldset">
        <legend>Business</legend>
        <Field name="name" label="Business name" required defaultValue={value("name")} />
        <Field
          name="customerType"
          label="Customer type"
          as="select"
          required
          options={selectOptions(CUSTOMER_TYPE_LABELS, "Choose a type")}
          defaultValue={value("customerType")}
        />
        <Field name="status" label="Status" as="select" options={STATUS_OPTIONS} defaultValue={value("status", "active")} hint="Blocked customers cannot place new orders." />
        <Field name="contactPerson" label="Contact person" defaultValue={value("contactPerson")} />
        <Field name="phone" label="Office phone" defaultValue={value("phone")} hint="Landline or mobile" inputMode="tel" />
        <Field
          name="whatsapp"
          label="WhatsApp number"
          defaultValue={value("whatsapp")}
          hint="Pakistani mobile, such as 0334 7266695"
          inputMode="tel"
        />
        <Field name="email" label="Email" type="email" defaultValue={value("email")} autoComplete="off" />
        <Field name="city" label="City" defaultValue={value("city")} />
        <Field name="address" label="Address" className="shop-form__wide" defaultValue={value("address")} />
      </fieldset>

      <fieldset className="shop-fieldset">
        <legend>Tax and credit</legend>
        <Field name="ntn" label="NTN" defaultValue={value("ntn")} hint="7 or 13 digits" inputMode="numeric" />
        <Field name="strn" label="STRN" defaultValue={value("strn")} hint="13 digits, if registered for sales tax" inputMode="numeric" />
        <Field
          name="creditLimit"
          label="Credit limit (Rs)"
          defaultValue={value("creditLimit", "0.00")}
          hint="0 means no credit: the customer pays in advance"
          inputMode="decimal"
        />
        <Field
          name="paymentTermsDays"
          label="Payment terms (days)"
          defaultValue={value("paymentTermsDays", "7")}
          hint="Days from invoice date to due date"
          inputMode="numeric"
        />
        <Field
          name="discount"
          label="Discount per litre (Rs)"
          defaultValue={value("discount", "0.00")}
          hint="Taken off every product's list rate"
          inputMode="decimal"
        />
      </fieldset>

      <fieldset className="shop-fieldset">
        <legend>Notes</legend>
        <Field name="notes" label="Notes for staff" as="textarea" rows={3} className="shop-form__wide" defaultValue={value("notes")} />
      </fieldset>
    </>
  );
}
