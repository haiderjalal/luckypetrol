import Link from "next/link";
import { notFound } from "next/navigation";

import { createInvoiceAction } from "@/app/shop/_actions/invoices.js";
import { cancelOrderAction, confirmOrderAction, dispatchOrderAction } from "@/app/shop/_actions/orders.js";
import { ActionButton } from "@/components/shop/ActionButton.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import Notice from "@/components/shop/Notice.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatCard from "@/components/shop/StatCard.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { WhatsAppShare } from "@/components/shop/WhatsAppShare.js";
import { CUSTOMER_TYPE_LABELS, INVOICE_STATUS_LABELS, ORDER_SOURCE_LABELS, ORDER_STATUS_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatLitres, formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { INVOICE_STATUS_TONE, ORDER_STATUS_TONE, selectOptions, toneFor } from "@/lib/shop/presentation.js";
import { parseOptionalId } from "@/lib/shop/query.js";
import { getDispatchBoard } from "@/lib/shop/services/deliveries.js";
import { getOrderDetail } from "@/lib/shop/services/orders.js";
import { getSettings } from "@/lib/shop/services/settings.js";
import { buildOrderMessage } from "@/lib/shop/whatsapp.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order",
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const orderId = parseOptionalId(id);
  if (!orderId) {
    notFound();
  }

  let detail;
  try {
    detail = await getOrderDetail(orderId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { order, items, balancePaisa, openOrdersPaisa, creditAvailablePaisa, invoices, delivery } = detail;
  const activeInvoices = invoices.filter((invoice) => invoice.status === "issued");
  const company = (await getSettings()).company;
  const depots = (await getDispatchBoard()).depots;
  const message = buildOrderMessage({ order, items, company });

  return (
    <>
      <PageHeader
        title={order.orderNo}
        description={
          <>
            <StatusBadge tone={toneFor(ORDER_STATUS_TONE, order.status)}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>{" "}
            <span className="shop-muted">
              Taken from {(ORDER_SOURCE_LABELS[order.source] ?? order.source).toLowerCase()} on {formatDate(order.createdAt.slice(0, 10))} by {order.createdBy}
            </span>
          </>
        }
        actions={
          <Link className="shop-button shop-button--ghost" href="/shop/orders">
            All orders
          </Link>
        }
      />

      {order.creditOverrideNote ? (
        <div style={{ marginBottom: "1rem" }}>
          <Notice tone="warning" title="Approved over the credit limit.">
            {order.creditOverrideNote}
          </Notice>
        </div>
      ) : null}

      {order.status === "cancelled" ? (
        <div style={{ marginBottom: "1rem" }}>
          <Notice tone="error" title="Cancelled.">
            {order.cancelReason}
          </Notice>
        </div>
      ) : null}

      <section className="shop-grid shop-grid--kpi" aria-label="Order totals">
        <StatCard label="Litres" value={formatLitres(order.totalLitres)} hint="All products" />
        <StatCard label="Estimated value" value={formatRupees(order.estimatedPaisa)} hint="At the rate when the order was taken" />
        <StatCard
          label="Customer owes now"
          value={formatRupees(Math.max(0, balancePaisa))}
          hint={balancePaisa < 0 ? `Advance of ${formatRupees(-balancePaisa)} held` : "Ledger balance"}
        />
        <StatCard
          label="Credit available"
          tone={creditAvailablePaisa < 0 ? "red" : "ink"}
          value={formatRupees(creditAvailablePaisa)}
          hint={`Credit limit ${formatRupees(order.creditLimitPaisa)}, after ${formatRupees(openOrdersPaisa)} open`}
        />
      </section>

      <div className="shop-grid shop-grid--two shop-section">
        <section className="shop-card" aria-labelledby="order-title">
          <h2 id="order-title" style={{ marginBottom: ".75rem" }}>
            Order details
          </h2>
          <dl className="shop-kv">
            <dt>Customer</dt>
            <dd>
              <Link href={`/shop/customers/${order.customerId}`}>{order.customerName}</Link>{" "}
              <span className="shop-muted">({CUSTOMER_TYPE_LABELS[order.customerType] ?? order.customerType})</span>
            </dd>
            <dt>Delivery date</dt>
            <dd>{formatDate(order.deliveryDate)}</dd>
            <dt>Time window</dt>
            <dd>{order.windowStart && order.windowEnd ? `${order.windowStart} to ${order.windowEnd}` : "Any time that day"}</dd>
            <dt>Deliver to</dt>
            <dd>{order.deliveryAddress}</dd>
            <dt>Notes</dt>
            <dd>{order.notes || "—"}</dd>
          </dl>

          <div className="shop-table-wrap" style={{ marginTop: "1rem", border: 0 }}>
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" className="num">
                    Ordered (L)
                  </th>
                  <th scope="col" className="num">
                    Delivered (L)
                  </th>
                  <th scope="col" className="num">
                    Rate (Rs/L)
                  </th>
                  <th scope="col" className="num">
                    Value (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.label}</td>
                    <td className="num">{formatLitres(item.orderedLitres)}</td>
                    <td className="num">{item.deliveredLitres === null ? "—" : formatLitres(item.deliveredLitres)}</td>
                    <td className="num">
                      {formatPaisa(item.ratePaisa)}
                      {item.discountPaisa > 0 ? <div className="shop-muted">list {formatPaisa(item.listRatePaisa)}</div> : null}
                    </td>
                    <td className="num">{formatPaisa(item.amountPaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="shop-card" aria-labelledby="actions-title">
          <h2 id="actions-title" style={{ marginBottom: ".75rem" }}>
            Next step
          </h2>

          {order.status === "received" ? (
            <div className="shop-grid" style={{ gap: "1.25rem" }}>
              <ActionForm action={confirmOrderAction} submitLabel="Confirm order" pendingLabel="Confirming…">
                <input type="hidden" name="orderId" value={order.id} />
                <p className="shop-muted" style={{ fontSize: ".9rem" }}>
                  Confirming checks the customer&apos;s credit limit. If the order takes them over it, add the approval reason below.
                </p>
                <Field name="overrideNote" label="Approval reason (only if over the limit)" as="textarea" rows={2} />
              </ActionForm>
              <ActionForm action={cancelOrderAction} submitLabel="Cancel this order" pendingLabel="Cancelling…">
                <input type="hidden" name="orderId" value={order.id} />
                <Field name="reason" label="Reason for cancelling" as="textarea" rows={2} required />
              </ActionForm>
            </div>
          ) : null}

          {order.status === "confirmed" ? (
            <div className="shop-grid" style={{ gap: "1.25rem" }}>
              {depots.length === 0 ? (
                <Notice tone="warning" title="No active depot.">
                  <Link href="/shop/inventory" style={{ fontWeight: 700 }}>
                    Add a depot and tanks
                  </Link>{" "}
                  before dispatching.
                </Notice>
              ) : (
                <ActionForm action={dispatchOrderAction} submitLabel="Load and dispatch" pendingLabel="Dispatching…">
                  <input type="hidden" name="orderId" value={order.id} />
                  <Field
                    name="depotId"
                    label="Load from depot"
                    as="select"
                    required
                    options={selectOptions(Object.fromEntries(depots.map((depot) => [String(depot.id), depot.name])), "Choose a depot")}
                  />
                  <Field name="vehicleNo" label="Vehicle number" required hint="For example: LEA-1234" />
                  <Field name="driverName" label="Driver name" />
                  <Field name="driverPhone" label="Driver phone" inputMode="tel" />
                  <Field name="sealNumbers" label="Seal numbers" hint="Separate several with commas" />
                </ActionForm>
              )}
              <ActionForm action={cancelOrderAction} submitLabel="Cancel this order" pendingLabel="Cancelling…">
                <input type="hidden" name="orderId" value={order.id} />
                <Field name="reason" label="Reason for cancelling" as="textarea" rows={2} required />
              </ActionForm>
            </div>
          ) : null}

          {order.status === "dispatched" && delivery ? (
            <p>
              Loaded on <strong>{delivery.deliveryNo}</strong>, vehicle {delivery.vehicleNo}.{" "}
              <Link href={`/shop/deliveries/${delivery.id}`} style={{ fontWeight: 700 }}>
                Record delivery
              </Link>
            </p>
          ) : null}

          {order.status === "delivered" ? (
            activeInvoices.length > 0 ? (
              <p>Delivered and invoiced.</p>
            ) : (
              <div style={{ display: "grid", gap: ".75rem" }}>
                <p>Delivered. Issue the invoice for the litres actually delivered.</p>
                <ActionButton action={createInvoiceAction} input={{ orderId: order.id }} label="Create invoice" pendingLabel="Creating invoice…" />
              </div>
            )
          ) : null}

          {order.status === "cancelled" ? <p className="shop-muted">This order is closed.</p> : null}

          {delivery ? (
            <p style={{ marginTop: "1rem", fontSize: ".92rem" }}>
              Delivery <Link href={`/shop/deliveries/${delivery.id}`}>{delivery.deliveryNo}</Link>:{" "}
              <StatusBadge tone={delivery.status === "delivered" ? "green" : "blue"}>
                {delivery.status === "delivered" ? "Delivered" : "In transit"}
              </StatusBadge>
            </p>
          ) : null}
        </section>
      </div>

      <section className="shop-section" aria-labelledby="invoices-title">
        <div className="shop-section__head">
          <h2 id="invoices-title">Invoices for this order</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="shop-muted">No invoice yet.</p>
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">
                    Total (Rs)
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/shop/invoices/${invoice.id}`}>{invoice.invoiceNo}</Link>
                    </td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td className="num">{formatPaisa(invoice.totalPaisa)}</td>
                    <td>
                      <StatusBadge tone={toneFor(INVOICE_STATUS_TONE, invoice.status)}>{INVOICE_STATUS_LABELS[invoice.status]}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="shop-section">
        <WhatsAppShare
          defaultNumber={order.customerWhatsapp ?? ""}
          message={message}
          title="Share these order details on WhatsApp"
        />
      </section>
    </>
  );
}
