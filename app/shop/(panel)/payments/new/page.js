import Link from "next/link";

import { recordPaymentAction } from "@/app/shop/_actions/payments.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { PAYMENT_METHOD_LABELS } from "@/lib/shop/constants.js";
import { todayIso } from "@/lib/shop/dates.js";
import { selectOptions } from "@/lib/shop/presentation.js";
import { readParam } from "@/lib/shop/query.js";
import { getCustomerOptions } from "@/lib/shop/services/customers.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Record a payment",
};

export default async function NewPaymentPage({ searchParams }) {
  const params = await searchParams;
  const today = todayIso();
  const customers = await getCustomerOptions();
  const customerOptions = selectOptions(
    Object.fromEntries(customers.map((customer) => [String(customer.id), `${customer.name} (${customer.code})`])),
    "Choose a customer",
  );

  return (
    <>
      <PageHeader
        title="Record a payment"
        description="Enter what was received. It is applied to the oldest open invoices first. Any excess is held as an advance for the next invoice."
        actions={
          <Link className="shop-button shop-button--ghost" href="/shop/payments">
            Back to payments
          </Link>
        }
      />
      <ActionForm action={recordPaymentAction} submitLabel="Record payment" pendingLabel="Recording…">
        <div className="shop-form__grid">
          <Field
            name="customerId"
            label="Customer"
            as="select"
            required
            options={customerOptions}
            defaultValue={readParam(params.customer)}
          />
          <Field name="amount" label="Amount received (Rs)" inputMode="decimal" required placeholder="0.00" hint="For example 250000 or 250,000.50" />
          <Field
            name="method"
            label="Method"
            as="select"
            required
            options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))}
            defaultValue="bank_transfer"
          />
          <Field name="receivedOn" label="Date received" type="date" required defaultValue={today} max={today} />
          <Field name="reference" label="Reference" hint="Cheque number, transaction ID or slip number" />
          <Field name="bankName" label="Bank" hint="Bank the money came through, if any" />
          <Field name="notes" label="Notes" as="textarea" rows={2} className="shop-form__wide" />
        </div>
      </ActionForm>
    </>
  );
}
