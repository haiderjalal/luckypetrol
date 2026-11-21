import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import FilterBar from "@/components/shop/FilterBar.js";
import Pagination from "@/components/shop/Pagination.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { CUSTOMER_TYPE_LABELS, ORDER_SOURCE_LABELS, ORDER_STATUS_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatLitres, formatPaisa } from "@/lib/shop/money.js";
import { ORDER_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { readParam } from "@/lib/shop/query.js";
import { listOrderQueue } from "@/lib/shop/services/orders.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders",
};

export default async function OrdersPage({ searchParams }) {
  const params = await searchParams;
  const status = readParam(params.status);
  const search = readParam(params.search);
  const page = readParam(params.page);
  const result = await listOrderQueue({ status, search, page });

  const tabs = [{ value: "", label: "All orders" }, ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))];

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders received at the shop, by phone, on WhatsApp, by email or from the website. Confirm them, dispatch them, then invoice after delivery."
        actions={
          <Link className="shop-button" href="/shop/orders/new">
            Take an order
          </Link>
        }
      />

      <nav className="shop-tabs" aria-label="Filter by order status">
        {tabs.map((tab) => (
          <Link
            key={tab.value || "all"}
            href={tab.value ? `/shop/orders?status=${tab.value}` : "/shop/orders"}
            aria-current={status === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <FilterBar clearHref={status ? `/shop/orders?status=${status}` : "/shop/orders"}>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="shop-field">
          <label htmlFor="search">Search</label>
          <input id="search" name="search" defaultValue={search} placeholder="Order number or customer" />
        </div>
      </FilterBar>

      {result.rows.length === 0 ? (
        <EmptyState title="No orders here yet.">
          <Link href="/shop/orders/new" style={{ fontWeight: 700 }}>
            Take the first order
          </Link>
        </EmptyState>
      ) : (
        <div className="shop-table-wrap">
          <table className="shop-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Delivery</th>
                <th scope="col">Customer</th>
                <th scope="col" className="num">
                  Litres
                </th>
                <th scope="col" className="num">
                  Estimated (Rs)
                </th>
                <th scope="col">Came by</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/shop/orders/${order.id}`}>{order.orderNo}</Link>
                    <div className="shop-muted">{formatDate(order.createdAt.slice(0, 10))}</div>
                  </td>
                  <td>
                    {formatDate(order.deliveryDate)}
                    {order.windowStart && order.windowEnd ? (
                      <div className="shop-muted">
                        {order.windowStart} to {order.windowEnd}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {order.customerName}
                    <div className="shop-muted">{CUSTOMER_TYPE_LABELS[order.customerType] ?? ""}</div>
                  </td>
                  <td className="num">{formatLitres(order.totalLitres)}</td>
                  <td className="num">{formatPaisa(order.estimatedPaisa)}</td>
                  <td>{ORDER_SOURCE_LABELS[order.source] ?? order.source}</td>
                  <td>
                    <StatusBadge tone={toneFor(ORDER_STATUS_TONE, order.status)}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>
                    {order.invoiceCount > 0 ? (
                      <div style={{ marginTop: ".3rem" }}>
                        <StatusBadge tone="green">Invoiced</StatusBadge>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/shop/orders" query={{ status, search }} />
    </>
  );
}
