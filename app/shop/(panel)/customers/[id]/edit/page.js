import Link from "next/link";
import { notFound } from "next/navigation";

import { editCustomerAction } from "@/app/shop/_actions/customers.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import CustomerFields from "@/components/shop/CustomerFields.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { paisaToInput } from "@/lib/shop/money.js";
import { formatMobileForDisplay } from "@/lib/shop/phone.js";
import { parseOptionalId } from "@/lib/shop/query.js";
import { getCustomerDetail } from "@/lib/shop/services/customers.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit customer",
};

export default async function EditCustomerPage({ params }) {
  const { id } = await params;
  const customerId = parseOptionalId(id);
  if (!customerId) {
    notFound();
  }

  let detail;
  try {
    detail = await getCustomerDetail(customerId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { customer } = detail;
  const defaults = {
    name: customer.name,
    customerType: customer.customerType,
    status: customer.status,
    contactPerson: customer.contactPerson ?? "",
    phone: customer.phone ?? "",
    whatsapp: customer.whatsapp ? formatMobileForDisplay(customer.whatsapp) : "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    ntn: customer.ntn ?? "",
    strn: customer.strn ?? "",
    creditLimit: paisaToInput(customer.creditLimitPaisa),
    paymentTermsDays: String(customer.paymentTermsDays),
    discount: paisaToInput(customer.discountPerLitrePaisa),
    notes: customer.notes ?? "",
  };

  return (
    <>
      <PageHeader
        title={`Edit ${customer.name}`}
        description={`${customer.code}. Changes are recorded in the audit log.`}
        actions={
          <Link className="shop-button shop-button--ghost" href={`/shop/customers/${customer.id}`}>
            Back to customer
          </Link>
        }
      />
      <ActionForm action={editCustomerAction} submitLabel="Save changes">
        <input type="hidden" name="customerId" value={customer.id} />
        <CustomerFields defaults={defaults} />
      </ActionForm>
    </>
  );
}
