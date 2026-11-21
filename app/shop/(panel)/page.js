import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import Notice from "@/components/shop/Notice.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatCard from "@/components/shop/StatCard.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { CUSTOMER_TYPE_LABELS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PRODUCT_LABELS } from "@/lib/shop/constants.js";
import { formatDate, todayIso } from "@/lib/shop/dates.js";
import { formatLitres, formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { getDashboard } from "@/lib/shop/services/dashboard.js";
import { getRateCard } from "@/lib/shop/services/prices.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function ShopDashboardPage() {
  const today = todayIso();
  const data = await getDashboard(today);
  const rateCard = await getRateCard(today);
  const missingRates = rateCard.products.filter((product) => product.ratePaisa === null).map((product) => product.label);
  const trendMax = Math.max(1, ...data.trend.map((day) => day.totalPaisa));
  const litresThisMonth = data.litresByProduct.reduce((sum, row) => sum + row.litres, 0);
  const queueTotal = data.orderQueue.received + data.orderQueue.confirmed + data.orderQueue.dispatched;

  return (
    <>
      <PageHeader
        title="Sales dashboard"
        description={`Figures for ${formatDate(today)}. Money is in Pakistani rupees; litres are whole litres.`}
        actions={
          <>
            <Link className="shop-button" href="/shop/orders/new">
              Take an order
            </Link>
            <Link className="shop-button shop-button--ghost" href="/shop/payments/new">
              Record a payment
            </Link>
          </>
        }
      />

      {missingRates.length > 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <Notice tone="warning" title="Today's rates are missing.">
            Set a rate for {missingRates.join(", ")} on the{" "}
            <Link href="/shop/prices" style={{ fontWeight: 700 }}>
              rate card
            </Link>{" "}
            before taking orders for these products.
          </Notice>
        </div>
      ) : null}

      <section className="shop-grid shop-grid--kpi" aria-label="Key figures">
        <StatCard
          label="Sales today"
          value={formatRupees(data.sales.today.totalPaisa)}
          hint={`${data.sales.today.invoices} invoice${data.sales.today.invoices === 1 ? "" : "s"}, ${formatLitres(data.sales.today.litres)} L`}
        />
        <StatCard
          label="Sales this month"
          value={formatRupees(data.sales.month.totalPaisa)}
          hint={`${data.sales.month.invoices} invoices, ${formatLitres(data.sales.month.litres)} L`}
        />
        <StatCard
          label="Owed to us"
          tone={data.receivables.overduePaisa > 0 ? "red" : "ink"}
          value={formatRupees(data.receivables.outstandingPaisa)}
          hint={
            data.receivables.overdueInvoiceCount > 0
              ? `${formatRupees(data.receivables.overduePaisa)} overdue on ${data.receivables.overdueInvoiceCount} invoice${data.receivables.overdueInvoiceCount === 1 ? "" : "s"}`
              : `${data.receivables.openInvoiceCount} open invoice${data.receivables.openInvoiceCount === 1 ? "" : "s"}, none overdue`
          }
        />
        <StatCard
          label="Collected this month"
          value={formatRupees(data.collectedMonthPaisa)}
          hint={`${data.collectionsByMethod.reduce((sum, row) => sum + row.receipts, 0)} receipts`}
        />
        <StatCard
          label="Advances held"
          value={formatRupees(data.receivables.advancesPaisa)}
          hint="Paid before invoicing; applied automatically"
        />
        <StatCard
          label="Orders in progress"
          value={queueTotal}
          hint={`${data.orderQueue.received} to confirm, ${data.orderQueue.confirmed} to load, ${data.orderQueue.dispatched} on the road`}
        />
      </section>

      {data.orderQueue.deliveredNotInvoiced > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <Notice tone="info" title="Delivered but not invoiced.">
            {data.orderQueue.deliveredNotInvoiced} order{data.orderQueue.deliveredNotInvoiced === 1 ? " has" : "s have"} been delivered without an invoice.{" "}
            <Link href="/shop/orders?status=delivered" style={{ fontWeight: 700 }}>
              Review delivered orders
            </Link>
          </Notice>
        </div>
      ) : null}

      <section className="shop-section" aria-labelledby="trend-title">
        <div className="shop-section__head">
          <h2 id="trend-title">Sales, last 14 days</h2>
          <p>Issued invoices by day. Today is shown in red.</p>
        </div>
        <div className="shop-card">
          <div className="shop-trend" role="img" aria-label="Bar chart of sales for the last 14 days">
            {data.trend.map((day) => (
              <div className="shop-trend__cell" key={day.date}>
                <div
                  className={`shop-trend__bar${day.date === today ? " shop-trend__bar--today" : ""}`}
                  style={{ height: `${Math.max(1, Math.round((day.totalPaisa / trendMax) * 100))}%` }}
                  title={`${formatDate(day.date)}: ${formatRupees(day.totalPaisa)}, ${formatLitres(day.litres)} L`}
                />
                <span className="shop-trend__label">{Number(day.date.slice(8))}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="shop-grid shop-grid--two shop-section">
        <section aria-labelledby="products-title">
          <div className="shop-section__head">
            <h2 id="products-title">Litres by product, this month</h2>
            <p>{formatLitres(litresThisMonth)} L in total</p>
          </div>
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" className="num">
                    Litres
                  </th>
                  <th scope="col" className="num">
                    Value (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.litresByProduct.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="shop-muted">
                      No sales yet this month.
                    </td>
                  </tr>
                ) : (
                  data.litresByProduct.map((row) => (
                    <tr key={row.productCode}>
                      <td>{PRODUCT_LABELS[row.productCode] ?? row.productCode}</td>
                      <td className="num">{formatLitres(row.litres)}</td>
                      <td className="num">{formatPaisa(row.amountPaisa)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="top-title">
          <div className="shop-section__head">
            <h2 id="top-title">Top customers, this month</h2>
          </div>
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col" className="num">
                    Litres
                  </th>
                  <th scope="col" className="num">
                    Value (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="shop-muted">
                      No invoices yet this month.
                    </td>
                  </tr>
                ) : (
                  data.topCustomers.map((row) => (
                    <tr key={row.customerId}>
                      <td>
                        <Link href={`/shop/customers/${row.customerId}`}>{row.name}</Link>
                      </td>
                      <td className="num">{formatLitres(row.litres)}</td>
                      <td className="num">{formatPaisa(row.totalPaisa)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="shop-grid shop-grid--two shop-section">
        <section aria-labelledby="stock-title">
          <div className="shop-section__head">
            <h2 id="stock-title">Stock and stock alerts</h2>
            <Link href="/shop/inventory">Open depots and stock</Link>
          </div>
          {data.inventory.alerts.length === 0 ? (
            <EmptyState title="No stock alerts.">Tanks are above the low-stock level and dips agree with book stock.</EmptyState>
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Tank</th>
                    <th scope="col">Alert</th>
                    <th scope="col" className="num">
                      Book (L)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.alerts.map((tank) => (
                    <tr key={tank.id}>
                      <td>
                        {tank.depotName}, {tank.name} ({tank.productLabel})
                      </td>
                      <td>
                        {tank.isLow ? <StatusBadge tone="red">Low stock {tank.fillPercent}%</StatusBadge> : null}{" "}
                        {tank.hasVarianceAlert ? <StatusBadge tone="amber">Dip variance {tank.variancePercent}%</StatusBadge> : null}
                      </td>
                      <td className="num">{formatLitres(tank.bookLitres)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="collections-title">
          <div className="shop-section__head">
            <h2 id="collections-title">Collections this month, by method</h2>
          </div>
          {data.collectionsByMethod.length === 0 ? (
            <EmptyState title="Nothing collected yet this month." />
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Method</th>
                    <th scope="col" className="num">
                      Receipts
                    </th>
                    <th scope="col" className="num">
                      Amount (Rs)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.collectionsByMethod.map((row) => (
                    <tr key={row.method}>
                      <td>{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</td>
                      <td className="num">{row.receipts}</td>
                      <td className="num">{formatPaisa(row.amountPaisa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="shop-grid shop-grid--two shop-section">
        <section aria-labelledby="recent-orders-title">
          <div className="shop-section__head">
            <h2 id="recent-orders-title">Latest orders</h2>
            <Link href="/shop/orders">All orders</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet.">Orders from the shop, phone, WhatsApp or the website appear here.</EmptyState>
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/shop/orders/${order.id}`}>{order.orderNo}</Link>
                      </td>
                      <td>
                        {order.customerName}
                        <br />
                        <span className="shop-muted">{CUSTOMER_TYPE_LABELS[order.customerType] ?? ""}</span>
                      </td>
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
            <h2 id="recent-payments-title">Latest payments</h2>
            <Link href="/shop/payments">All payments</Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <EmptyState title="No payments yet.">Record a payment when money arrives.</EmptyState>
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Receipt</th>
                    <th scope="col">Customer</th>
                    <th scope="col" className="num">
                      Amount (Rs)
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <Link href={`/shop/payments/${payment.id}`}>{payment.receiptNo}</Link>
                      </td>
                      <td>{payment.customerName}</td>
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
