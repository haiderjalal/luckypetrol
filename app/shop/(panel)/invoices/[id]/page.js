import Link from "next/link";
import { notFound } from "next/navigation";

import { cancelInvoiceAction } from "@/app/shop/_actions/invoices.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { CopyButton } from "@/components/shop/CopyButton.js";
import { Field } from "@/components/shop/Field.js";
import Notice from "@/components/shop/Notice.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { PrintButton } from "@/components/shop/PrintButton.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { WhatsAppShare } from "@/components/shop/WhatsAppShare.js";
import InvoiceDocument from "@/components/shop/documents/InvoiceDocument.js";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATE_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatPaisa, formatRupees } from "@/lib/shop/money.js";
import { INVOICE_STATUS_TONE, PAYMENT_STATE_TONE, toneFor } from "@/lib/shop/presentation.js";
import { getPublicUrl } from "@/lib/shop/config.js";
import { parseOptionalId } from "@/lib/shop/query.js";
import { getInvoiceDetail } from "@/lib/shop/services/invoices.js";
import { buildInvoiceMessage } from "@/lib/shop/whatsapp.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice",
};

export default async function InvoiceDetailPage({ params }) {
  const { id } = await params;
  const invoiceId = parseOptionalId(id);
  if (!invoiceId) {
    notFound();
  }

  let detail;
  try {
    detail = await getInvoiceDetail(invoiceId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { invoice, lines, allocations, company, billing } = detail;
  const shareUrl = `${getPublicUrl()}/share/${invoice.shareToken}`;
  const isIssued = invoice.status === "issued";
  const canCancel = isIssued && invoice.paidPaisa === 0;
  const message = buildInvoiceMessage({
    invoice: { ...invoice, contactName: invoice.customerContact },
    lines,
    company,
    bankAccounts: billing.bankAccounts,
    shareUrl,
  });

  return (
    <>
      <PageHeader
        title={invoice.invoiceNo}
        description={
          <>
            <StatusBadge tone={toneFor(INVOICE_STATUS_TONE, invoice.status)}>{INVOICE_STATUS_LABELS[invoice.status]}</StatusBadge>{" "}
            <StatusBadge tone={toneFor(PAYMENT_STATE_TONE, invoice.paymentState)}>{PAYMENT_STATE_LABELS[invoice.paymentState]}</StatusBadge>{" "}
            <span className="shop-muted">
              {invoice.customerName}, issued {formatDate(invoice.invoiceDate)}, due {formatDate(invoice.dueDate)}
            </span>
          </>
        }
        actions={
          <>
            <PrintButton />
            <Link className="shop-button shop-button--ghost" href={`/shop/orders/${invoice.orderId}`}>
              View order
            </Link>
            <Link className="shop-button shop-button--ghost" href={`/shop/ledger/${invoice.customerId}`}>
              Statement
            </Link>
          </>
        }
      />

      {invoice.status === "cancelled" ? (
        <div className="shop-no-print" style={{ marginBottom: "1rem" }}>
          <Notice tone="error" title="This invoice is cancelled.">
            {invoice.cancelReason}
          </Notice>
        </div>
      ) : null}

      {invoice.isOverdue ? (
        <div className="shop-no-print" style={{ marginBottom: "1rem" }}>
          <Notice tone="warning" title="Overdue.">
            {formatRupees(invoice.outstandingPaisa)} was due on {formatDate(invoice.dueDate)}.
          </Notice>
        </div>
      ) : null}

      <div className="shop-grid shop-grid--two shop-no-print" style={{ marginBottom: "1.5rem" }}>
        <WhatsAppShare
          defaultNumber={invoice.customerWhatsapp ?? ""}
          message={message}
          title="Send this invoice on WhatsApp"
        />

        <section className="shop-card shop-share" aria-labelledby="link-title">
          <h2 id="link-title">Public link</h2>
          <p className="shop-muted" style={{ fontSize: ".92rem" }}>
            Anyone with this link can view and print this invoice, and nothing else. It is included in the WhatsApp message above.
          </p>
          <div className="shop-share__row">
            <input readOnly value={shareUrl} aria-label="Public invoice link" style={{ flex: 1, minWidth: 0, padding: ".55rem .65rem", border: "1px solid #bdb9b0", background: "#fff", font: "inherit", fontSize: ".85rem" }} />
            <CopyButton text={shareUrl} label="Copy link" />
          </div>

          {canCancel ? (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #dad7cf" }}>
              <h3 style={{ marginBottom: ".5rem" }}>Cancel this invoice</h3>
              <p className="shop-muted" style={{ fontSize: ".9rem", marginBottom: ".5rem" }}>
                The order can be invoiced again afterwards. The cancellation is recorded in the ledger and the audit log.
              </p>
              <ActionForm action={cancelInvoiceAction} submitLabel="Cancel invoice" pendingLabel="Cancelling…">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <Field name="reason" label="Reason for cancelling" as="textarea" rows={2} required />
              </ActionForm>
            </div>
          ) : isIssued && invoice.paidPaisa > 0 ? (
            <p className="shop-muted" style={{ marginTop: "1rem", fontSize: ".9rem" }}>
              This invoice has payments applied, so it cannot be cancelled. Void those payments first from the{" "}
              <Link href="/shop/payments" style={{ fontWeight: 700 }}>
                payments list
              </Link>
              .
            </p>
          ) : null}
        </section>
      </div>

      {allocations.length > 0 ? (
        <section className="shop-no-print shop-section" style={{ marginTop: 0 }} aria-labelledby="applied-title">
          <div className="shop-section__head">
            <h2 id="applied-title">Payments applied</h2>
            <p>
              {formatPaisa(invoice.paidPaisa)} received of {formatPaisa(invoice.totalPaisa)}
            </p>
          </div>
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Receipt</th>
                  <th scope="col">Received</th>
                  <th scope="col">Method</th>
                  <th scope="col" className="num">
                    Applied (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td>
                      <Link href={`/shop/payments/${allocation.paymentId}`}>{allocation.receiptNo}</Link>
                    </td>
                    <td>{formatDate(allocation.receivedOn)}</td>
                    <td>{PAYMENT_METHOD_LABELS[allocation.method] ?? allocation.method}</td>
                    <td className="num">{formatPaisa(allocation.amountPaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-label="Printable invoice">
        <InvoiceDocument
          invoice={invoice}
          lines={lines}
          company={company}
          bankAccounts={billing.bankAccounts}
          footer={billing.invoiceFooter}
        />
      </section>
    </>
  );
}
