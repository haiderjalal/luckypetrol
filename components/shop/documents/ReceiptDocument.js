import { PAYMENT_METHOD_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { amountInWords, formatPaisa } from "@/lib/shop/money.js";

import Letterhead from "./Letterhead.js";

/**
 * Printable receipt for a payment, listing the invoices it was applied to.
 * @param {{ payment: object, allocations: object[], company: object }} props
 */
export default function ReceiptDocument({ payment, allocations, company }) {
  const isVoided = payment.status === "voided";
  const advancePaisa = isVoided ? 0 : payment.amountPaisa - payment.allocatedPaisa;

  return (
    <article className="shop-doc" aria-label={`Receipt ${payment.receiptNo}`}>
      {isVoided ? <div className="shop-doc__stamp">Voided</div> : null}
      <Letterhead company={company} />

      <div className="shop-doc__titlebar">
        <h1>Payment receipt</h1>
        <dl className="shop-doc__meta">
          <dt>Receipt no.</dt>
          <dd>{payment.receiptNo}</dd>
          <dt>Date received</dt>
          <dd>{formatDate(payment.receivedOn)}</dd>
          <dt>Method</dt>
          <dd>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</dd>
          {payment.reference ? (
            <>
              <dt>Reference</dt>
              <dd>{payment.reference}</dd>
            </>
          ) : null}
        </dl>
      </div>

      <section className="shop-doc__parties">
        <div>
          <h2>Received from</h2>
          <p>
            <strong>{payment.customerName}</strong>
          </p>
          {payment.bankName ? <p>Bank: {payment.bankName}</p> : null}
        </div>
        <div>
          <h2>Amount</h2>
          <p>
            <strong>Rs. {formatPaisa(payment.amountPaisa)}</strong>
          </p>
          <p className="shop-muted">{amountInWords(payment.amountPaisa)}</p>
        </div>
      </section>

      {allocations.length > 0 ? (
        <table className="shop-doc__table">
          <thead>
            <tr>
              <th scope="col">Applied to invoice</th>
              <th scope="col">Invoice date</th>
              <th scope="col" className="num">
                Amount (Rs)
              </th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>{allocation.invoiceNo}</td>
                <td>{formatDate(allocation.invoiceDate)}</td>
                <td className="num">{formatPaisa(allocation.amountPaisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {advancePaisa > 0 ? (
        <p className="shop-doc__words">
          Rs. {formatPaisa(advancePaisa)} is held as advance and will be applied to the next invoice.
        </p>
      ) : null}

      <div className="shop-doc__sign">Authorised signatory</div>
    </article>
  );
}
