import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatCard from "@/components/shop/StatCard.js";
import { AGING_BUCKETS } from "@/lib/shop/dates.js";
import { CUSTOMER_TYPE_LABELS } from "@/lib/shop/constants.js";
import { todayIso } from "@/lib/shop/dates.js";
import { formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { getCustomerOptions } from "@/lib/shop/services/customers.js";
import { getAgingReport } from "@/lib/shop/services/ledger.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ledger and aging",
};

const BUCKET_LABELS = {
  current: "Not yet due",
  "1-30": "1 to 30 days",
  "31-60": "31 to 60 days",
  "61-90": "61 to 90 days",
  "90+": "Over 90 days",
};

export default function LedgerPage() {
  const today = todayIso();
  const report = getAgingReport(today);
  const overdueTotal = report.totals.buckets["1-30"] + report.totals.buckets["31-60"] + report.totals.buckets["61-90"] + report.totals.buckets["90+"];
  const customers = getCustomerOptions();

  return (
    <>
      <PageHeader
        title="Ledger and aging"
        description="How much each customer owes, grouped by how long it has been overdue. Advances paid ahead are shown separately, and the net balance is what the customer really owes."
        actions={
          <>
            <a className="shop-button shop-button--ghost" href="/api/shop/export?report=aging">
              Download aging CSV
            </a>
            <a className="shop-button shop-button--ghost" href="/api/shop/export?report=ledger">
              Download ledger CSV
            </a>
          </>
        }
      />

      <section className="shop-grid shop-grid--kpi" aria-label="Aging totals">
        <StatCard label="Outstanding" value={formatRupees(report.totals.outstandingPaisa)} hint={`Open invoices, as of ${today}`} />
        <StatCard label="Overdue" tone={overdueTotal > 0 ? "red" : "ink"} value={formatRupees(overdueTotal)} hint="Past the due date" />
        <StatCard label="Advances held" value={formatRupees(report.totals.advancePaisa)} hint="Money received before invoicing" />
        <StatCard label="Net receivable" value={formatRupees(report.totals.netPaisa)} hint="Outstanding less advances" />
      </section>

      <section className="shop-section" aria-labelledby="aging-title">
        <div className="shop-section__head">
          <h2 id="aging-title">Aging by customer</h2>
          <p>Days past the due date. Largest net balance first.</p>
        </div>
        {report.rows.length === 0 ? (
          <EmptyState title="Nothing outstanding.">Open invoices and advances appear here.</EmptyState>
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  {AGING_BUCKETS.map((bucket) => (
                    <th key={bucket} scope="col" className="num" title={BUCKET_LABELS[bucket]}>
                      {bucket === "current" ? "Current" : `${bucket} d`} (Rs)
                    </th>
                  ))}
                  <th scope="col" className="num">
                    Outstanding (Rs)
                  </th>
                  <th scope="col" className="num">
                    Advance (Rs)
                  </th>
                  <th scope="col" className="num">
                    Net (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.customerId}>
                    <td>
                      <Link href={`/shop/ledger/${row.customerId}`}>{row.customerName}</Link>
                      <div className="shop-muted">{CUSTOMER_TYPE_LABELS[row.customerType] ?? ""}</div>
                    </td>
                    {AGING_BUCKETS.map((bucket) => (
                      <td key={bucket} className="num">
                        {row.buckets[bucket] > 0 ? formatPaisa(row.buckets[bucket]) : "—"}
                      </td>
                    ))}
                    <td className="num">{formatPaisa(row.outstandingPaisa)}</td>
                    <td className="num">{row.advancePaisa > 0 ? formatPaisa(row.advancePaisa) : "—"}</td>
                    <td className="num">{formatPaisa(row.netPaisa)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {AGING_BUCKETS.map((bucket) => (
                    <td key={bucket} className="num">
                      {formatPaisa(report.totals.buckets[bucket])}
                    </td>
                  ))}
                  <td className="num">{formatPaisa(report.totals.outstandingPaisa)}</td>
                  <td className="num">{formatPaisa(report.totals.advancePaisa)}</td>
                  <td className="num">{formatPaisa(report.totals.netPaisa)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="shop-section" aria-labelledby="statements-title">
        <div className="shop-section__head">
          <h2 id="statements-title">Customer statements</h2>
          <p>Choose a customer to see every entry and the running balance.</p>
        </div>
        {customers.length === 0 ? (
          <EmptyState title="No customers yet." />
        ) : (
          <ul className="shop-card" style={{ display: "grid", gap: ".4rem", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", listStyle: "none", margin: 0 }}>
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link href={`/shop/ledger/${customer.id}`} style={{ fontWeight: 600, color: "var(--shop-red-deep)" }}>
                  {customer.name}
                </Link>{" "}
                <span className="shop-muted" style={{ fontSize: ".85rem" }}>
                  {customer.code}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
