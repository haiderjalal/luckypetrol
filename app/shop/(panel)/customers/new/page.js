import Link from "next/link";

import { createCustomerAction } from "@/app/shop/_actions/customers.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import CustomerFields from "@/components/shop/CustomerFields.js";
import PageHeader from "@/components/shop/PageHeader.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add customer",
};

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader
        title="Add customer"
        description="A customer gets a code automatically. Set the credit limit to 0 for customers who pay in advance."
        actions={
          <Link className="shop-button shop-button--ghost" href="/shop/customers">
            Back to customers
          </Link>
        }
      />
      <ActionForm action={createCustomerAction} submitLabel="Save customer">
        <CustomerFields />
      </ActionForm>
    </>
  );
}
