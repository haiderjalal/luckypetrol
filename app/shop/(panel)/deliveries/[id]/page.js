import Link from "next/link";
import { notFound } from "next/navigation";

import { completeDeliveryAction } from "@/app/shop/_actions/deliveries.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import PageHeader from "@/components/shop/PageHeader.js";
import { PrintButton } from "@/components/shop/PrintButton.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import DeliveryNoteDocument from "@/components/shop/documents/DeliveryNoteDocument.js";
import { DELIVERY_STATUS_LABELS } from "@/lib/shop/constants.js";
import { formatDate, todayIso } from "@/lib/shop/dates.js";
import { formatLitres } from "@/lib/shop/money.js";
import { DELIVERY_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { parseOptionalId } from "@/lib/shop/query.js";
import { getDeliveryDetail } from "@/lib/shop/services/deliveries.js";
import { getSettings } from "@/lib/shop/services/settings.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delivery",
};

export default async function DeliveryDetailPage({ params }) {
  const { id } = await params;
  const deliveryId = parseOptionalId(id);
  if (!deliveryId) {
    notFound();
  }

  let detail;
  try {
    detail = getDeliveryDetail(deliveryId);
  } catch (error) {
    if (error?.code === "not_found") {
      notFound();
    }
    throw error;
  }

  const { delivery, items } = detail;
  const company = getSettings().company;
  const loadedByCode = Object.fromEntries(items.map((item) => [item.productCode, item.loadedLitres]));
  const isInTransit = delivery.status === "in_transit";

  return (
    <>
      <PageHeader
        title={delivery.deliveryNo}
        description={
          <>
            <StatusBadge tone={toneFor(DELIVERY_STATUS_TONE, delivery.status)}>{DELIVERY_STATUS_LABELS[delivery.status]}</StatusBadge>{" "}
            <span className="shop-muted">
              Order {delivery.orderNo} for {delivery.customerName}
            </span>
          </>
        }
        actions={
          <>
            <Link className="shop-button shop-button--ghost" href={`/shop/orders/${delivery.orderId}`}>
              View order
            </Link>
            <PrintButton label="Print delivery note" />
          </>
        }
      />

      <div className="shop-grid shop-grid--two shop-no-print">
        <section className="shop-card" aria-labelledby="vehicle-title">
          <h2 id="vehicle-title" style={{ marginBottom: ".75rem" }}>
            Load and vehicle
          </h2>
          <dl className="shop-kv">
            <dt>Loaded at</dt>
            <dd>{delivery.depotName}</dd>
            <dt>Dispatched</dt>
            <dd>{formatDate(delivery.dispatchedOn)}</dd>
            <dt>Vehicle</dt>
            <dd>{delivery.vehicleNo}</dd>
            <dt>Driver</dt>
            <dd>
              {delivery.driverName || "—"}
              {delivery.driverPhone ? ` · ${delivery.driverPhone}` : ""}
            </dd>
            <dt>Seal numbers</dt>
            <dd>{delivery.sealNumbers || "—"}</dd>
            <dt>Deliver to</dt>
            <dd>{delivery.deliveryAddress}</dd>
          </dl>
        </section>

        <section className="shop-card" aria-labelledby="litres-title">
          <h2 id="litres-title" style={{ marginBottom: ".75rem" }}>
            {isInTransit ? "Record the delivery" : "Delivered"}
          </h2>
          {isInTransit ? (
            <ActionForm action={completeDeliveryAction} submitLabel="Mark as delivered" pendingLabel="Saving…">
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <Field name="deliveredOn" label="Date delivered" type="date" required defaultValue={todayIso()} />
              {["PMG", "HSD", "HOBC"].map((code) => {
                const loaded = loadedByCode[code] ?? 0;
                const label = code === "PMG" ? "Petrol" : code === "HSD" ? "Diesel" : "High octane";
                return (
                  <Field
                    key={code}
                    name={`delivered${code}`}
                    label={`${label} delivered (L)`}
                    inputMode="numeric"
                    defaultValue={String(loaded)}
                    hint={loaded > 0 ? `Loaded ${formatLitres(loaded)} L. Any shortfall goes back into the depot tank.` : "Not on this load"}
                    disabled={loaded === 0}
                  />
                );
              })}
            </ActionForm>
          ) : (
            <dl className="shop-kv">
              <dt>Date delivered</dt>
              <dd>{formatDate(delivery.deliveredOn)}</dd>
              {items.map((item) => (
                <div key={item.productCode} style={{ display: "contents" }}>
                  <dt>{item.label}</dt>
                  <dd>
                    {formatLitres(item.deliveredLitres ?? 0)} L delivered of {formatLitres(item.loadedLitres)} L loaded
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <section className="shop-section" aria-labelledby="note-title">
        <div className="shop-section__head shop-no-print">
          <h2 id="note-title">Delivery note</h2>
          <p>Print it for the driver and the receiver to sign.</p>
        </div>
        <DeliveryNoteDocument delivery={delivery} items={items} company={company} />
      </section>
    </>
  );
}
