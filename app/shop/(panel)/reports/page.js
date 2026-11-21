import Link from "next/link";

import FilterBar from "@/components/shop/FilterBar.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatCard from "@/components/shop/StatCard.js";
import { CUSTOMER_TYPE_LABELS, PAYMENT_METHOD_LABELS, PRODUCT_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatLitres, formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { readParam } from "@/lib/shop/query.js";
import { getSettings } from "@/lib/shop/services/settings.js";
import { getReportSummary, resolvePeriod } from "@/lib/shop/services/reports.js";
import { basisPointsToPercent } from "@/lib/shop/totals.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports",
};

const EXPORTS = [
  { key: "invoices", label: "Invoices", note: "Every invoice in the period, with paid and outstanding amounts." },
  { key: "payments", label: "Payments", note: "Receipts in the period, with how much was applied." },
  { key: "orders", label: "Orders", note: "Orders by delivery date, with status and value." },
  { key: "ledger", label: "Ledger", note: "Every debit and credit for every customer in the period." },
  { key: "aging", label: "Aging", note: "Outstanding amounts by days overdue, as of today." },
  { key: "sales-by-product", label: "Sales by product", note: "Litres and value per product in the period." },
  { key: "stock", label: "Stock", note: "Book stock, fill and last dip for every tank." },
];

export default async function ReportsPage({ searchParams }) {
  const params = await searchParams;
  const period = await resolvePeriod({ from: readParam(params.from), to: readParam(params.to) });
  const summary = await getReportSummary(period);
  const taxRateBps = (await getSettings()).billing.taxRateBps;
  const exportQuery = `from=${period.from}&to=${period.to}`;
  const collectedPaisa = summary.collections.reduce((sum, row) => sum + row.amountPaisa, 0);
  const receiptCount = summary.collections.reduce((sum, row) => sum + row.receipts, 0);

  return (
    <>
      <PageHeader title="Reports" description="Sales, collections and receivables for a period. Download any report as CSV to open in Excel or Google Sheets." />

      <FilterBar clearHref="/shop/reports">
        <div className="shop-field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={summary.from} />
        </div>
        <div className="shop-field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={summary.to} />
        </div>
      </FilterBar>

      <section className="shop-grid shop-grid--kpi" aria-label="Sales in the period">
        <StatCard label="Invoiced" value={formatRupees(summary.sales.totalPaisa)} hint={`${summary.sales.invoices} invoices, ${formatLitres(summary.sales.litres)} L`} />
        <StatCard label="Sales tax in invoices" value={formatRupees(summary.sales.taxPaisa)} hint="Included in the invoiced total" />
        <StatCard label="Collected" value={formatRupees(collectedPaisa)} hint={`${receiptCount} receipt${receiptCount === 1 ? "" : "s"}`} />
        <StatCard label="Outstanding now" value={formatRupees(summary.aging.totals.outstandingPaisa)} hint="Open invoices, all dates" />
      </section>

      <div className="shop-grid shop-grid--two shop-section">
        <section aria-labelledby="by-product-title">
          <div className="shop-section__head">
            <h2 id="by-product-title">Sales by product</h2>
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
                {summary.byProduct.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="shop-muted">
                      No sales in this period.
                    </td>
                  </tr>
                ) : (
                  summary.byProduct.map((row) => (
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

        <section aria-labelledby="by-type-title">
          <div className="shop-section__head">
            <h2 id="by-type-title">Sales by customer type</h2>
          </div>
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Customer type</th>
                  <th scope="col" className="num">
                    Invoices
                  </th>
                  <th scope="col" className="num">
                    Litres
                  </th>
                  <th scope="col" className="num">
                    Value (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.byCustomerType.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="shop-muted">
                      No sales in this period.
                    </td>
                  </tr>
                ) : (
                  summary.byCustomerType.map((row) => (
                    <tr key={row.customerType}>
                      <td>{CUSTOMER_TYPE_LABELS[row.customerType] ?? row.customerType}</td>
                      <td className="num">{row.invoices}</td>
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
        <section aria-labelledby="top-title">
          <div className="shop-section__head">
            <h2 id="top-title">Top ten customers</h2>
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
                {summary.topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="shop-muted">
                      No sales in this period.
                    </td>
                  </tr>
                ) : (
                  summary.topCustomers.map((row) => (
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

        <section aria-labelledby="collections-title">
          <div className="shop-section__head">
            <h2 id="collections-title">Collections by method</h2>
          </div>
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
                {summary.collections.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="shop-muted">
                      No receipts in this period.
                    </td>
                  </tr>
                ) : (
                  summary.collections.map((row) => (
                    <tr key={row.method}>
                      <td>{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</td>
                      <td className="num">{row.receipts}</td>
                      <td className="num">{formatPaisa(row.amountPaisa)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="shop-section" aria-labelledby="exports-title">
        <div className="shop-section__head">
          <h2 id="exports-title">Download CSV</h2>
          <p>
            Period {formatDate(summary.from)} to {formatDate(summary.to)}. Aging and stock are always as of today.
          </p>
        </div>
        <div className="shop-grid shop-grid--kpi">
          {EXPORTS.map((item) => (
            <div key={item.key} className="shop-card" style={{ display: "grid", gap: ".5rem", alignContent: "start" }}>
              <h3>{item.label}</h3>
              <p className="shop-muted" style={{ fontSize: ".88rem" }}>
                {item.note}
              </p>
              <a className="shop-button shop-button--ghost" href={`/api/shop/export?report=${item.key}&${exportQuery}`} style={{ justifySelf: "start" }}>
                Download {item.label}
              </a>
            </div>
          ))}
        </div>
        <p className="shop-muted" style={{ marginTop: "1rem", fontSize: ".88rem" }}>
          Sales tax on new invoices: {taxRateBps > 0 ? `${basisPointsToPercent(taxRateBps)}%` : "not set (0%)"}. Set it in{" "}
          <Link href="/shop/settings" style={{ fontWeight: 700 }}>
            Settings
          </Link>{" "}
          after confirming the treatment with your accountant.
        </p>
      </section>
    </>
  );
}
