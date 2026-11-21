import { formatDate } from "@/lib/shop/dates.js";
import { amountInWords, formatLitres, formatPaisa } from "@/lib/shop/money.js";
import { basisPointsToPercent } from "@/lib/shop/totals.js";

import Letterhead from "./Letterhead.js";

function BankDetails({ accounts }) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <section>
      <h2>Bank details</h2>
      {accounts.map((account, index) => (
        <p key={`${account.accountNumber}-${index}`}>
          {[account.bankName, account.accountTitle].filter(Boolean).join(" – ")}
          {account.accountNumber ? <br /> : null}
          {account.accountNumber ? `A/C ${account.accountNumber}` : null}
          {account.iban ? <br /> : null}
          {account.iban ? `IBAN ${account.iban}` : null}
        </p>
      ))}
    </section>
  );
}

/**
 * The printable invoice. Used by the internal invoice page and by the public share link.
 * @param {{ invoice: object, lines: object[], company: object, bankAccounts: object[], footer?: string }} props
 */
export default function InvoiceDocument({ invoice, lines, company, bankAccounts, footer = "" }) {
  const isCancelled = invoice.status === "cancelled";
  const isTaxInvoice = Boolean(company.strn);
  const title = isTaxInvoice ? "Sales Tax Invoice" : "Invoice";
  const taxPercent = basisPointsToPercent(invoice.taxRateBps ?? 0);

  return (
    <article className="shop-doc" aria-label={`Invoice ${invoice.invoiceNo}`}>
      {isCancelled ? <div className="shop-doc__stamp">Cancelled</div> : null}
      <Letterhead company={company} />

      <div className="shop-doc__titlebar">
        <h1>{title}</h1>
        <dl className="shop-doc__meta">
          <dt>Invoice no.</dt>
          <dd>{invoice.invoiceNo}</dd>
          <dt>Date</dt>
          <dd>{formatDate(invoice.invoiceDate)}</dd>
          <dt>Due date</dt>
          <dd>{formatDate(invoice.dueDate)}</dd>
          <dt>Order no.</dt>
          <dd>{invoice.orderNo}</dd>
        </dl>
      </div>

      <div className="shop-doc__parties">
        <section>
          <h2>Bill to</h2>
          <p>
            <strong>{invoice.billToName}</strong>
          </p>
          {invoice.billToAddress ? <p>{invoice.billToAddress}</p> : null}
          {invoice.billToNtn ? <p>NTN {invoice.billToNtn}</p> : null}
          {invoice.billToStrn ? <p>STRN {invoice.billToStrn}</p> : null}
        </section>
        <section>
          <h2>Delivered to</h2>
          <p>{invoice.deliveryAddress}</p>
          {invoice.deliveryDate ? <p>Delivery date {formatDate(invoice.deliveryDate)}</p> : null}
        </section>
      </div>

      <table className="shop-doc__table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Product</th>
            <th scope="col" className="num">
              Litres
            </th>
            <th scope="col" className="num">
              Rate (Rs/L)
            </th>
            <th scope="col" className="num">
              Amount (Rs)
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.productCode}-${index}`}>
              <td>{index + 1}</td>
              <td>{line.label}</td>
              <td className="num">{formatLitres(line.litres)}</td>
              <td className="num">{formatPaisa(line.ratePaisa)}</td>
              <td className="num">{formatPaisa(line.amountPaisa)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="shop-doc__totals">
        <dl>
          <dt>Taxable value</dt>
          <dd>{formatPaisa(invoice.subtotalPaisa)}</dd>
          <dt>{invoice.taxRateBps > 0 ? `Sales tax @ ${taxPercent}%` : "Sales tax"}</dt>
          <dd>{invoice.taxRateBps > 0 ? formatPaisa(invoice.taxPaisa) : "Nil"}</dd>
          <dt className="grand">Total (Rs)</dt>
          <dd className="grand">{formatPaisa(invoice.totalPaisa)}</dd>
          {invoice.paidPaisa > 0 ? (
            <>
              <dt>Received</dt>
              <dd>{formatPaisa(invoice.paidPaisa)}</dd>
              <dt>Balance due</dt>
              <dd>{formatPaisa(invoice.outstandingPaisa)}</dd>
            </>
          ) : null}
        </dl>
      </div>

      <p className="shop-doc__words">{amountInWords(invoice.totalPaisa)}</p>

      <div className="shop-doc__footer">
        <BankDetails accounts={bankAccounts} />
        <div>
          {footer ? <p>{footer}</p> : null}
          <p className="shop-muted">Total litres {formatLitres(invoice.totalLitres)}. Please quote the invoice number with your payment.</p>
        </div>
      </div>

      <div className="shop-doc__sign">Authorised signatory</div>
    </article>
  );
}
