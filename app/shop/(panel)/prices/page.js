import { setRateAction } from "@/app/shop/_actions/prices.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import PageHeader from "@/components/shop/PageHeader.js";
import EmptyState from "@/components/shop/EmptyState.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { PRODUCT_CODES, PRODUCT_LABELS } from "@/lib/shop/constants.js";
import { formatDate, formatDateTime, todayIso } from "@/lib/shop/dates.js";
import { formatPaisa } from "@/lib/shop/money.js";
import { getRateCard, getRateHistory } from "@/lib/shop/services/prices.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rate card",
};

export default async function PricesPage() {
  const today = todayIso();
  const card = await getRateCard(today);
  const history = await getRateHistory(60);
  const productOptions = PRODUCT_CODES.map((code) => ({ value: code, label: PRODUCT_LABELS[code] }));

  return (
    <>
      <PageHeader
        title="Rate card"
        description="Rates per litre are set from a date onwards. Orders and invoices keep the rate in force when they were made, so changing the card never alters past sales."
      />

      <section aria-labelledby="current-title">
        <div className="shop-section__head">
          <h2 id="current-title">In force on {formatDate(today)}</h2>
        </div>
        <div className="shop-grid shop-grid--kpi">
          {card.products.map((product) => (
            <div key={product.productCode} className="shop-card shop-kpi">
              <p className="shop-kpi__label">{product.label}</p>
              <p className="shop-kpi__value">{product.ratePaisa === null ? "Not set" : `Rs. ${formatPaisa(product.ratePaisa)}`}</p>
              <p className="shop-kpi__hint">
                {product.ratePaisa === null ? "Set a rate before taking orders" : `Per litre, from ${formatDate(product.effectiveFrom)}`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="shop-grid shop-grid--two shop-section">
        <section className="shop-card" aria-labelledby="set-rate-title">
          <h2 id="set-rate-title" style={{ marginBottom: ".75rem" }}>
            Set a new rate
          </h2>
          <ActionForm action={setRateAction} submitLabel="Save rate" pendingLabel="Saving…" resetOnSuccess>
            <Field name="productCode" label="Product" as="select" required options={productOptions} />
            <Field name="rate" label="Rate per litre (Rs)" inputMode="decimal" required placeholder="377.71" hint="Two decimals at most" />
            <Field name="effectiveFrom" label="Applies from" type="date" required min={today} defaultValue={today} hint="Today or a later date. Past dates are not allowed." />
          </ActionForm>
        </section>

        <section aria-labelledby="history-title">
          <div className="shop-section__head">
            <h2 id="history-title">Rate history</h2>
          </div>
          {history.length === 0 ? (
            <EmptyState title="No rates set yet." />
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Applies from</th>
                    <th scope="col">Product</th>
                    <th scope="col" className="num">
                      Rate (Rs/L)
                    </th>
                    <th scope="col">Set by</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {formatDate(row.effectiveFrom)}
                        {row.effectiveFrom === today ? (
                          <div>
                            <StatusBadge tone="green">Current</StatusBadge>
                          </div>
                        ) : null}
                      </td>
                      <td>{PRODUCT_LABELS[row.productCode] ?? row.productCode}</td>
                      <td className="num">{formatPaisa(row.ratePaisa)}</td>
                      <td>
                        {row.createdBy}
                        <div className="shop-muted" style={{ fontSize: ".8rem" }}>
                          {formatDateTime(row.createdAt)}
                        </div>
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
