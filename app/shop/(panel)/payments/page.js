import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import FilterBar from "@/components/shop/FilterBar.js";
import Pagination from "@/components/shop/Pagination.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatPaisa } from "@/lib/shop/money.js";
import { filterOptions, PAYMENT_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { cleanDate, readParam } from "@/lib/shop/query.js";
import { listPayments } from "@/lib/shop/services/payments.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments",
};

export default async function PaymentsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    method: readParam(params.method),
    status: readParam(params.status),
    from: cleanDate(readParam(params.from)),
    to: cleanDate(readParam(params.to)),
    customerId: readParam(params.customer),
    page: readParam(params.page),
  };
  const result = listPayments(filters);
  const query = { search: filters.search, method: filters.method, status: filters.status, from: filters.from, to: filters.to, customer: filters.customerId };
  const exportParams = new URLSearchParams({ report: "payments" });
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);

  return (
    <>
      <PageHeader
        title="Customer payments"
        description="Money received from customers. Each receipt is applied to the oldest open invoices first; anything left over is held as an advance."
        actions={
          <>
            <a className="shop-button shop-button--ghost" href={`/api/shop/export?${exportParams.toString()}`}>
              Download CSV
            </a>
            <Link className="shop-button" href="/shop/payments/new">
              Record a payment
            </Link>
          </>
        }
      />

      <FilterBar clearHref="/shop/payments">
        <div className="shop-field">
          <label htmlFor="search">Search</label>
          <input id="search" name="search" defaultValue={filters.search} placeholder="Receipt, reference or customer" />
        </div>
        <div className="shop-field">
          <label htmlFor="method">Method</label>
          <select id="method" name="method" defaultValue={filters.method}>
            {filterOptions(PAYMENT_METHOD_LABELS, "All methods").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="shop-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status}>
            {filterOptions(PAYMENT_STATUS_LABELS, "All").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="shop-field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} />
        </div>
        <div className="shop-field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} />
        </div>
        {filters.customerId ? <input type="hidden" name="customer" value={filters.customerId} /> : null}
      </FilterBar>

      {result.rows.length === 0 ? (
        <EmptyState title="No payments match.">
          <Link href="/shop/payments/new" style={{ fontWeight: 700 }}>
            Record the first payment
          </Link>
        </EmptyState>
      ) : (
        <div className="shop-table-wrap">
          <table className="shop-table">
            <thead>
              <tr>
                <th scope="col">Receipt</th>
                <th scope="col">Received</th>
                <th scope="col">Customer</th>
                <th scope="col">Method</th>
                <th scope="col">Reference</th>
                <th scope="col" className="num">
                  Amount (Rs)
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <Link href={`/shop/payments/${payment.id}`}>{payment.receiptNo}</Link>
                  </td>
                  <td>{formatDate(payment.receivedOn)}</td>
                  <td>{payment.customerName}</td>
                  <td>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</td>
                  <td>
                    {payment.reference || "—"}
                    {payment.bankName ? <div className="shop-muted">{payment.bankName}</div> : null}
                  </td>
                  <td className="num">{formatPaisa(payment.amountPaisa)}</td>
                  <td>
                    <StatusBadge tone={toneFor(PAYMENT_STATUS_TONE, payment.status)}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/shop/payments" query={query} />
    </>
  );
}
