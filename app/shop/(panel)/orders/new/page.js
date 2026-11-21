import Link from "next/link";

import { createOrderAction } from "@/app/shop/_actions/orders.js";
import { OrderForm } from "@/components/shop/OrderForm.js";
import PageHeader from "@/components/shop/PageHeader.js";
import Notice from "@/components/shop/Notice.js";
import { todayIso } from "@/lib/shop/dates.js";
import { readParam } from "@/lib/shop/query.js";
import { getOrderFormOptions } from "@/lib/shop/services/customers.js";
import { getRateCard } from "@/lib/shop/services/prices.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Take an order",
};

export default async function NewOrderPage({ searchParams }) {
  const params = await searchParams;
  const today = todayIso();
  const customers = await getOrderFormOptions();
  const rateCard = await getRateCard(today);
  const rates = Object.fromEntries(rateCard.products.map((product) => [product.productCode, product.ratePaisa]));
  const hasAllRates = Object.values(rates).every((value) => value !== null);

  return (
    <>
      <PageHeader
        title="Take an order"
        description="Enter the litres for each product, the delivery address and the time window. The order is saved as received, and must be confirmed before dispatch."
        actions={
          <Link className="shop-button shop-button--ghost" href="/shop/orders">
            Back to orders
          </Link>
        }
      />

      {customers.length === 0 ? (
        <Notice tone="warning" title="No active customers yet.">
          <Link href="/shop/customers/new" style={{ fontWeight: 700 }}>
            Add a customer
          </Link>{" "}
          before taking an order.
        </Notice>
      ) : null}

      {!hasAllRates ? (
        <div style={{ margin: "1rem 0" }}>
          <Notice tone="warning" title="Some of today's rates are missing.">
            You can still take orders for products that have a rate.{" "}
            <Link href="/shop/prices" style={{ fontWeight: 700 }}>
              Set today&apos;s rates
            </Link>
            .
          </Notice>
        </div>
      ) : null}

      {customers.length > 0 ? (
        <OrderForm
          action={createOrderAction}
          customers={customers}
          rates={rates}
          today={today}
          initialCustomerId={readParam(params.customer)}
        />
      ) : null}
    </>
  );
}
