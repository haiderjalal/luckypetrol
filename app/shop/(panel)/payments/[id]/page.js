import Link from "next/link";
import { notFound } from "next/navigation";

import { voidPaymentAction } from "@/app/shop/_actions/payments.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { PrintButton } from "@/components/shop/PrintButton.js";
import StatCard from "@/components/shop/StatCard.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import ReceiptDocument from "@/components/shop/documents/ReceiptDocument.js";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/shop/constants.js";
import { formatDate } from "@/lib/shop/dates.js";
import { formatRupees } from "@/lib/shop/money.js";
import { PAYMENT_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { parseOptionalId } from "@/lib/shop/query.js";
import { getPaymentDetail } from "@/lib/shop/services/payments.js";
import { getSettings } from "@/lib/shop/services/settings.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Receipt",
};

export default async function PaymentDetailPage({ params }) {
  const { id } = await params;
  const paymentId = parseOptionalId(id);
  if (!paymentId) {
    notFound();
  }

  let detail;
  try {
    detail = await getPaymentDetail(paymentId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { payment, allocations, customerBalancePaisa } = detail;
  const company = (await getSettings()).company;
  const isPosted = payment.status === "posted";

  return (
    <>
      <PageHeader
        title={payment.receiptNo}
        description={
          <>
            <StatusBadge tone={toneFor(PAYMENT_STATUS_TONE, payment.status)}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusBadge>{" "}
            <span className="shop-muted">
              {payment.customerName}, received {formatDate(payment.receivedOn)} by {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
            </span>
          </>
        }
        actions={
          <>
            <PrintButton label="Print receipt" />
            <Link className="shop-button shop-button--ghost" href={`/shop/ledger/${payment.customerId}`}>
              Statement
            </Link>
          </>
        }
      />

      <section className="shop-grid shop-grid--kpi shop-no-print" aria-label="Receipt totals">
        <StatCard label="Amount received" value={formatRupees(payment.amountPaisa)} />
        <StatCard label="Applied to invoices" value={formatRupees(payment.allocatedPaisa)} hint={`${allocations.length} invoice${allocations.length === 1 ? "" : "s"}`} />
        <StatCard
          label="Held as advance"
          value={formatRupees(payment.unappliedPaisa)}
          hint="Applied to the next invoice automatically"
        />
        <StatCard
          label="Customer balance now"
          tone={customerBalancePaisa > 0 ? "red" : "ink"}
          value={formatRupees(Math.abs(customerBalancePaisa))}
          hint={customerBalancePaisa < 0 ? "Advance held" : customerBalancePaisa > 0 ? "Still owing" : "Nothing owing"}
        />
      </section>

      {isPosted ? (
        <section className="shop-card shop-no-print" style={{ marginTop: "1.25rem", maxWidth: 640 }} aria-labelledby="void-title">
          <h2 id="void-title" style={{ marginBottom: ".5rem" }}>
            Void this receipt
          </h2>
          <p className="shop-muted" style={{ fontSize: ".92rem", marginBottom: ".75rem" }}>
            Use this only if the receipt was entered in error. The invoices it paid become open again, and the reversal is recorded in the ledger and the audit log.
          </p>
          <ActionForm action={voidPaymentAction} submitLabel="Void receipt" pendingLabel="Voiding…">
            <input type="hidden" name="paymentId" value={payment.id} />
            <Field name="reason" label="Reason for voiding" as="textarea" rows={2} required />
          </ActionForm>
        </section>
      ) : (
        <p className="shop-muted shop-no-print" style={{ marginTop: "1rem" }}>
          Voided{payment.voidedAt ? ` on ${formatDate(payment.voidedAt.slice(0, 10))}` : ""}: {payment.voidReason}
        </p>
      )}

      <section className="shop-section" aria-label="Printable receipt">
        <ReceiptDocument payment={payment} allocations={allocations} company={company} />
      </section>
    </>
  );
}
