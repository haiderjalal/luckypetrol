import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import FilterBar from "@/components/shop/FilterBar.js";
import Pagination from "@/components/shop/Pagination.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { CUSTOMER_TYPE_LABELS, INVOICE_STATUS_LABELS, PAYMENT_STATE_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatLitres, formatPaisa } from "@/lib/shop/money.js";
import { filterOptions, INVOICE_STATUS_TONE, PAYMENT_STATE_TONE, toneFor } from "@/lib/shop/presentation.js";
import { cleanDate, readParam } from "@/lib/shop/query.js";
import { listInvoices } from "@/lib/shop/services/invoices.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoices",
};

export default async function InvoicesPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    status: readParam(params.status),
    paymentState: readParam(params.paymentState),
    from: cleanDate(readParam(params.from)),
    to: cleanDate(readParam(params.to)),
    customerId: readParam(params.customer),
    page: readParam(params.page),
  };
  const result = await listInvoices(filters);
  const query = {
    search: filters.search,
    status: filters.status,
    paymentState: filters.paymentState,
    from: filters.from,
    to: filters.to,
    customer: filters.customerId,
  };
  const exportParams = new URLSearchParams({ report: "invoices" });
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Invoices are issued after delivery, for the litres actually delivered. Money received is applied to the oldest invoice first."
        actions={
          <a className="shop-button shop-button--ghost" href={`/api/shop/export?${exportParams.toString()}`}>
            Download CSV
          </a>
        }
      />

      <FilterBar clearHref="/shop/invoices">
        <div className="shop-field">
          <label htmlFor="search">Search</label>
          <input id="search" name="search" defaultValue={filters.search} placeholder="Invoice number or customer" />
        </div>
        <div className="shop-field">
          <label htmlFor="paymentState">Payment</label>
          <select id="paymentState" name="paymentState" defaultValue={filters.paymentState}>
            {filterOptions(PAYMENT_STATE_LABELS, "All").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="shop-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status}>
            {filterOptions(INVOICE_STATUS_LABELS, "All").map((option) => (
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
        <EmptyState title="No invoices match.">Invoices appear here once an order has been delivered and invoiced.</EmptyState>
      ) : (
        <div className="shop-table-wrap">
          <table className="shop-table">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Date</th>
                <th scope="col">Due</th>
                <th scope="col">Customer</th>
                <th scope="col" className="num">
                  Litres
                </th>
                <th scope="col" className="num">
                  Total (Rs)
                </th>
                <th scope="col" className="num">
                  Outstanding (Rs)
                </th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link href={`/shop/invoices/${invoice.id}`}>{invoice.invoiceNo}</Link>
                  </td>
                  <td>{formatDate(invoice.invoiceDate)}</td>
                  <td>
                    {formatDate(invoice.dueDate)}
                    {invoice.isOverdue ? (
                      <div>
                        <StatusBadge tone="red">Overdue</StatusBadge>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {invoice.customerName}
                    <div className="shop-muted">{CUSTOMER_TYPE_LABELS[invoice.customerType] ?? ""}</div>
                  </td>
                  <td className="num">{formatLitres(invoice.totalLitres)}</td>
                  <td className="num">{formatPaisa(invoice.totalPaisa)}</td>
                  <td className="num">{formatPaisa(invoice.outstandingPaisa)}</td>
                  <td>
                    <StatusBadge tone={toneFor(PAYMENT_STATE_TONE, invoice.paymentState)}>{PAYMENT_STATE_LABELS[invoice.paymentState]}</StatusBadge>
                    {invoice.status === "cancelled" ? (
                      <div style={{ marginTop: ".3rem" }}>
                        <StatusBadge tone={toneFor(INVOICE_STATUS_TONE, invoice.status)}>{INVOICE_STATUS_LABELS[invoice.status]}</StatusBadge>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/shop/invoices" query={query} />
    </>
  );
}
