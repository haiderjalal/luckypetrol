import Link from "next/link";
import { notFound } from "next/navigation";

import { addCustomerSiteAction, setCustomerSiteStatusAction } from "@/app/shop/_actions/customers.js";
import { ActionButton } from "@/components/shop/ActionButton.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import EmptyState from "@/components/shop/EmptyState.js";
import { Field } from "@/components/shop/Field.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatCard from "@/components/shop/StatCard.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { CUSTOMER_STATUS_LABELS, CUSTOMER_TYPE_LABELS, ORDER_STATUS_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatMobileForDisplay } from "@/lib/shop/phone.js";
import { formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { CUSTOMER_STATUS_TONE, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { parseOptionalId } from "@/lib/shop/query.js";
import { getCustomerDetail } from "@/lib/shop/services/customers.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customer",
};

export default async function CustomerDetailPage({ params }) {
  const { id } = await params;
  const customerId = parseOptionalId(id);
  if (!customerId) {
    notFound();
  }

  let detail;
  try {
    detail = getCustomerDetail(customerId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { customer, sites, balancePaisa, openOrdersPaisa, creditAvailablePaisa } = detail;
  const owed = balancePaisa > 0 ? balancePaisa : 0;
  const advance = balancePaisa < 0 ? -balancePaisa : 0;

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          <>
            {customer.code} · {CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType} ·{" "}
            <StatusBadge tone={toneFor(CUSTOMER_STATUS_TONE, customer.status)}>{CUSTOMER_STATUS_LABELS[customer.status]}</StatusBadge>
          </>
        }
        actions={
          <>
            <Link className="shop-button" href={`/shop/orders/new?customer=${customer.id}`}>
              New order
            </Link>
            <Link className="shop-button shop-button--ghost" href={`/shop/payments/new?customer=${customer.id}`}>
              Record payment
            </Link>
            <Link className="shop-button shop-button--ghost" href={`/shop/ledger/${customer.id}`}>
              Statement
            </Link>
            <Link className="shop-button shop-button--ghost" href={`/shop/customers/${customer.id}/edit`}>
              Edit
            </Link>
          </>
        }
      />

      <section className="shop-grid shop-grid--kpi" aria-label="Account position">
        <StatCard label="Owed by customer" value={formatRupees(owed)} tone={owed > 0 ? "red" : "ink"} hint={advance > 0 ? "Advance held: " + formatRupees(advance) : "Ledger balance"} />
        <StatCard label="Credit limit" value={formatRupees(customer.creditLimitPaisa)} hint={customer.creditLimitPaisa === 0 ? "Pays in advance" : "Maximum open balance"} />
        <StatCard
          label="Credit available"
          tone={creditAvailablePaisa < 0 ? "red" : "ink"}
          value={formatRupees(creditAvailablePaisa)}
          hint={`After ${formatRupees(openOrdersPaisa)} of confirmed orders not yet invoiced`}
        />
        <StatCard label="Terms" value={`${customer.paymentTermsDays} days`} hint={`Discount ${formatRupees(customer.discountPerLitrePaisa)} per litre`} />
      </section>

      <div className="shop-grid shop-grid--two shop-section">
        <section className="shop-card" aria-labelledby="details-title">
          <h2 id="details-title" style={{ marginBottom: ".75rem" }}>
            Details
          </h2>
          <dl className="shop-kv">
            <dt>Contact</dt>
            <dd>{customer.contactPerson || "—"}</dd>
            <dt>Office phone</dt>
            <dd>{customer.phone || "—"}</dd>
            <dt>WhatsApp</dt>
            <dd>{customer.whatsapp ? formatMobileForDisplay(customer.whatsapp) : "—"}</dd>
            <dt>Email</dt>
            <dd>{customer.email || "—"}</dd>
            <dt>Address</dt>
            <dd>
              {customer.address || "—"}
              {customer.city ? `, ${customer.city}` : ""}
            </dd>
            <dt>NTN</dt>
            <dd>{customer.ntn || "—"}</dd>
            <dt>STRN</dt>
            <dd>{customer.strn || "—"}</dd>
            <dt>Notes</dt>
            <dd>{customer.notes || "—"}</dd>
          </dl>
          <p className="shop-muted" style={{ marginTop: ".75rem", fontSize: ".85rem" }}>
            Customer since {formatDate(customer.createdAt.slice(0, 10))}. Last changed {formatDate(customer.updatedAt.slice(0, 10))}.
          </p>
        </section>

        <section className="shop-card" aria-labelledby="sites-title">
          <h2 id="sites-title" style={{ marginBottom: ".75rem" }}>
            Delivery sites
          </h2>
          {sites.length === 0 ? (
            <p className="shop-muted" style={{ marginBottom: ".75rem" }}>
              No sites yet. Orders go to the customer&apos;s address unless a site is chosen.
            </p>
          ) : (
            <div className="shop-table-wrap" style={{ border: 0, marginBottom: ".75rem" }}>
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Site</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id}>
                      <td>
                        <strong>{site.label}</strong>
                        <div className="shop-muted">
                          {site.address}
                          {site.city ? `, ${site.city}` : ""}
                        </div>
                      </td>
                      <td>{site.isActive ? <StatusBadge tone="green">Active</StatusBadge> : <StatusBadge tone="grey">Off</StatusBadge>}</td>
                      <td>
                        <ActionButton
                          action={setCustomerSiteStatusAction}
                          input={{ siteId: site.id, active: site.isActive ? "0" : "1" }}
                          label={site.isActive ? "Turn off" : "Turn on"}
                          variant="ghost"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Add a delivery site</summary>
            <div style={{ marginTop: ".75rem" }}>
              <ActionForm action={addCustomerSiteAction} submitLabel="Add site" resetOnSuccess>
                <input type="hidden" name="customerId" value={customer.id} />
                <Field name="label" label="Site name" required hint="For example: Pump 1, Landhi" />
                <Field name="address" label="Site address" as="textarea" rows={2} required />
                <Field name="city" label="City" />
                <Field name="contactName" label="Contact at site" />
                <Field name="contactPhone" label="Contact phone" inputMode="tel" />
              </ActionForm>
            </div>
          </details>
        </section>
      </div>

      <section className="shop-section" aria-labelledby="open-invoices-title">
        <div className="shop-section__head">
          <h2 id="open-invoices-title">Open invoices</h2>
          <Link href={`/shop/invoices?customer=${customer.id}`}>All invoices</Link>
        </div>
        {detail.openInvoices.length === 0 ? (
          <EmptyState title="Nothing owing.">Every issued invoice for this customer has been paid.</EmptyState>
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Invoice date</th>
                  <th scope="col">Due</th>
                  <th scope="col" className="num">
                    Total (Rs)
                  </th>
                  <th scope="col" className="num">
                    Outstanding (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.openInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/shop/invoices/${invoice.id}`}>{invoice.invoiceNo}</Link>
                    </td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td className="num">{formatPaisa(invoice.totalPaisa)}</td>
                    <td className="num">{formatPaisa(invoice.outstandingPaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="shop-grid shop-grid--two shop-section">
        <section aria-labelledby="recent-orders-title">
          <div className="shop-section__head">
            <h2 id="recent-orders-title">Recent orders</h2>
          </div>
          {detail.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet." />
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Delivery</th>
                    <th scope="col" className="num">
                      Litres
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/shop/orders/${order.id}`}>{order.orderNo}</Link>
                      </td>
                      <td>{formatDate(order.deliveryDate)}</td>
                      <td className="num">{order.totalLitres.toLocaleString("en-PK")}</td>
                      <td>
                        <StatusBadge tone={toneFor(ORDER_STATUS_TONE, order.status)}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="recent-payments-title">
          <div className="shop-section__head">
            <h2 id="recent-payments-title">Recent payments</h2>
          </div>
          {detail.recentPayments.length === 0 ? (
            <EmptyState title="No payments yet." />
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Receipt</th>
                    <th scope="col">Received</th>
                    <th scope="col" className="num">
                      Amount (Rs)
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <Link href={`/shop/payments/${payment.id}`}>{payment.receiptNo}</Link>
                      </td>
                      <td>{formatDate(payment.receivedOn)}</td>
                      <td className="num">{formatPaisa(payment.amountPaisa)}</td>
                      <td>
                        <StatusBadge tone={toneFor(PAYMENT_STATUS_TONE, payment.status)}>{payment.status === "posted" ? "Posted" : "Voided"}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
