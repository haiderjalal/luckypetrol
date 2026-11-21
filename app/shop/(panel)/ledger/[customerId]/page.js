import Link from "next/link";
import { notFound } from "next/navigation";

import Notice from "@/components/shop/Notice.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { PrintButton } from "@/components/shop/PrintButton.js";
import StatCard from "@/components/shop/StatCard.js";
import { WhatsAppShare } from "@/components/shop/WhatsAppShare.js";
import { todayIso, formatDate } from "@/lib/shop/dates.js";
import { formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { readParam, cleanDate, parseOptionalId } from "@/lib/shop/query.js";
import { getCustomerDetail } from "@/lib/shop/services/customers.js";
import { getStatement } from "@/lib/shop/services/ledger.js";
import { getSettings } from "@/lib/shop/services/settings.js";
import { buildReminderMessage } from "@/lib/shop/whatsapp.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Statement",
};

const ENTRY_LABELS = {
  invoice: "Invoice",
  invoice_cancel: "Invoice cancelled",
  payment: "Payment",
  payment_void: "Payment voided",
};

export default async function CustomerStatementPage({ params, searchParams }) {
  const { customerId: rawId } = await params;
  const query = await searchParams;
  const customerId = parseOptionalId(rawId);
  if (!customerId) {
    notFound();
  }

  const from = cleanDate(readParam(query.from));
  const to = cleanDate(readParam(query.to));
  let statement;
  let detail;
  try {
    statement = getStatement(customerId, { from, to });
    detail = getCustomerDetail(customerId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { customer, openInvoices } = detail;
  const today = todayIso();
  const settings = getSettings();
  const overdueInvoices = openInvoices.filter((invoice) => invoice.dueDate < today);
  const reminder = buildReminderMessage({
    customerName: customer.name,
    contactName: customer.contactPerson ?? "",
    balancePaisa: statement.closingPaisa,
    overdueInvoices,
    company: settings.company,
    bankAccounts: settings.billing.bankAccounts,
  });

  return (
    <>
      <PageHeader
        title={`Statement: ${customer.name}`}
        description={`${customer.code}. ${statement.from ? `From ${formatDate(statement.from)} ` : "From the start "}to ${formatDate(statement.to)}.`}
        actions={
          <>
            <PrintButton label="Print statement" />
            <Link className="shop-button shop-button--ghost" href={`/shop/customers/${customer.id}`}>
              Customer
            </Link>
            <Link className="shop-button" href={`/shop/payments/new?customer=${customer.id}`}>
              Record payment
            </Link>
          </>
        }
      />

      <form method="get" className="shop-filters shop-no-print" role="search">
        <div className="shop-field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={statement.from} />
        </div>
        <div className="shop-field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={statement.to} />
        </div>
        <div className="shop-filters__actions">
          <button type="submit" className="shop-button shop-button--ghost">
            Show period
          </button>
          <Link href={`/shop/ledger/${customer.id}`}>All dates</Link>
        </div>
      </form>

      <section className="shop-grid shop-grid--kpi" aria-label="Statement totals">
        <StatCard label="Opening balance" value={formatRupees(Math.abs(statement.openingPaisa))} hint={statement.openingPaisa < 0 ? "Advance" : "Owed"} />
        <StatCard label="Invoiced in period" value={formatRupees(statement.debitPaisa)} />
        <StatCard label="Received in period" value={formatRupees(statement.creditPaisa)} />
        <StatCard
          label="Closing balance"
          tone={statement.closingPaisa > 0 ? "red" : "ink"}
          value={formatRupees(Math.abs(statement.closingPaisa))}
          hint={statement.closingPaisa < 0 ? "Advance held by us" : statement.closingPaisa > 0 ? "Owed by customer" : "Nothing owing"}
        />
      </section>

      <section className="shop-section" aria-labelledby="entries-title">
        <div className="shop-section__head">
          <h2 id="entries-title">Entries</h2>
          <p>Debits add to what the customer owes. Credits reduce it.</p>
        </div>
        {statement.rows.length === 0 ? (
          <Notice tone="info">No entries in this period.</Notice>
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="num">
                    Debit (Rs)
                  </th>
                  <th scope="col" className="num">
                    Credit (Rs)
                  </th>
                  <th scope="col" className="num">
                    Balance (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {statement.rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.entryDate)}</td>
                    <td>{ENTRY_LABELS[entry.entryType] ?? entry.entryType}</td>
                    <td className="shop-num">{entry.reference}</td>
                    <td>{entry.description}</td>
                    <td className="num">{entry.debitPaisa > 0 ? formatPaisa(entry.debitPaisa) : "—"}</td>
                    <td className="num">{entry.creditPaisa > 0 ? formatPaisa(entry.creditPaisa) : "—"}</td>
                    <td className="num">{formatPaisa(entry.balancePaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {statement.closingPaisa > 0 ? (
        <section className="shop-section shop-no-print">
          <WhatsAppShare
            defaultNumber={customer.whatsapp ?? ""}
            message={reminder}
            title="Send a payment reminder on WhatsApp"
          />
        </section>
      ) : null}
    </>
  );
}
