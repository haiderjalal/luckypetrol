import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createDepotAction,
  createTankAction,
  receiveStockAction,
  recordDipAction,
} from "@/app/shop/_actions/inventory.js";
import { ActionForm } from "@/components/shop/ActionForm.js";
import { Field } from "@/components/shop/Field.js";
import Notice from "@/components/shop/Notice.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { MOVEMENT_TYPE_LABELS, PRODUCT_CODES, PRODUCT_LABELS } from "@/lib/shop/constants.js";
import { formatDate, formatDateTime, todayIso } from "@/lib/shop/dates.js";
import { formatLitres } from "@/lib/shop/money.js";
import { selectOptions } from "@/lib/shop/presentation.js";
import { parseOptionalId, readParam } from "@/lib/shop/query.js";
import { getInventoryOverview, getTankHistory } from "@/lib/shop/services/inventory.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Depots and stock",
};

function FillBar({ percent, low }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="shop-bar" role="img" aria-label={`${percent} percent full`}>
      <div className={`shop-bar__fill${low ? " shop-bar__fill--alert" : ""}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default async function InventoryPage({ searchParams }) {
  const params = await searchParams;
  const today = todayIso();
  const overview = getInventoryOverview();
  const tankId = parseOptionalId(readParam(params.tank));

  let history = null;
  if (tankId) {
    try {
      history = getTankHistory(tankId);
    } catch (error) {
      if (error?.code === "not_found") {
        notFound();
      }
      throw error;
    }
  }

  const activeTanks = overview.tanks.filter((tank) => tank.isActive);
  const tankOptions = selectOptions(
    Object.fromEntries(activeTanks.map((tank) => [String(tank.id), `${tank.depotName} – ${tank.name} (${tank.productLabel})`])),
    "Choose a tank",
  );
  const depotOptions = selectOptions(
    Object.fromEntries(overview.depots.map((depot) => [String(depot.id), depot.name])),
    "Choose a depot",
  );
  const productOptions = PRODUCT_CODES.map((code) => ({ value: code, label: PRODUCT_LABELS[code] }));

  return (
    <>
      <PageHeader
        title="Depots and stock"
        description="Book stock is receipts, less dispatches, plus returns and dip adjustments. A dip records what is physically in the tank; any difference is the variance."
      />

      {overview.alerts.length > 0 ? (
        <div style={{ marginBottom: "1.25rem" }}>
          <Notice tone="warning" title={`${overview.alerts.length} tank${overview.alerts.length === 1 ? "" : "s"} need attention.`}>
            Low stock is below {overview.lowStockPercent}% of capacity. A variance is a dip more than {overview.tolerancePercent}% away from book stock.
          </Notice>
        </div>
      ) : null}

      <section className="shop-grid shop-grid--kpi" aria-label="Stock by product">
        {overview.productTotals.length === 0 ? (
          <Notice tone="info">Add a depot and its tanks below to start tracking stock.</Notice>
        ) : (
          overview.productTotals.map((row) => (
            <div key={row.productCode} className="shop-card shop-kpi">
              <p className="shop-kpi__label">{row.label}</p>
              <p className="shop-kpi__value">{formatLitres(row.bookLitres)} L</p>
              <p className="shop-kpi__hint">
                of {formatLitres(row.capacityLitres)} L capacity, {row.fillPercent}% full
              </p>
              <div style={{ marginTop: ".5rem" }}>
                <FillBar percent={row.fillPercent} low={row.fillPercent < overview.lowStockPercent} />
              </div>
            </div>
          ))
        )}
      </section>

      {overview.depots.map((depot) => (
        <section key={depot.id} className="shop-section" aria-labelledby={`depot-${depot.id}`}>
          <div className="shop-section__head">
            <h2 id={`depot-${depot.id}`}>
              {depot.name} <span className="shop-muted" style={{ fontSize: ".9rem" }}>({depot.code})</span>
            </h2>
            {depot.location ? <p>{depot.location}</p> : null}
          </div>
          {depot.tanks.length === 0 ? (
            <Notice tone="info">No tanks at this depot yet. Add one below.</Notice>
          ) : (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Tank</th>
                    <th scope="col">Product</th>
                    <th scope="col" className="num">
                      Capacity (L)
                    </th>
                    <th scope="col" className="num">
                      Book stock (L)
                    </th>
                    <th scope="col" style={{ minWidth: 140 }}>
                      Fill
                    </th>
                    <th scope="col">Last dip</th>
                    <th scope="col">History</th>
                  </tr>
                </thead>
                <tbody>
                  {depot.tanks.map((tank) => (
                    <tr key={tank.id}>
                      <td>{tank.name}</td>
                      <td>{tank.productLabel}</td>
                      <td className="num">{formatLitres(tank.capacityLitres)}</td>
                      <td className="num">
                        {formatLitres(tank.bookLitres)}
                        {tank.isLow ? (
                          <div>
                            <StatusBadge tone="red">Low</StatusBadge>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <FillBar percent={tank.fillPercent} low={tank.isLow} />
                        <span className="shop-muted" style={{ fontSize: ".8rem" }}>
                          {tank.fillPercent}%
                        </span>
                      </td>
                      <td>
                        {tank.lastDipOn ? (
                          <>
                            {formatDate(tank.lastDipOn)}: {formatLitres(tank.lastDipLitres)} L
                            {tank.hasVarianceAlert ? (
                              <div>
                                <StatusBadge tone="amber">Variance {tank.variancePercent}%</StatusBadge>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="shop-muted">No dip yet</span>
                        )}
                      </td>
                      <td>
                        <Link href={`/shop/inventory?tank=${tank.id}`}>Movements</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section className="shop-section" aria-labelledby="actions-stock-title">
        <div className="shop-section__head">
          <h2 id="actions-stock-title">Record stock</h2>
          <p>Receipts increase book stock. Dips show what is physically in the tank.</p>
        </div>
        <div className="shop-grid shop-grid--two">
          <section className="shop-card" aria-labelledby="receive-title">
            <h3 id="receive-title" style={{ marginBottom: ".75rem" }}>
              Receive stock
            </h3>
            <ActionForm action={receiveStockAction} submitLabel="Record receipt" pendingLabel="Recording…" resetOnSuccess>
              <Field name="tankId" label="Tank" as="select" required options={tankOptions} />
              <Field name="litres" label="Litres received" inputMode="numeric" required />
              <Field name="reference" label="Challan or tanker number" />
              <Field name="occurredOn" label="Date received" type="date" required defaultValue={today} max={today} />
            </ActionForm>
          </section>

          <section className="shop-card" aria-labelledby="dip-title">
            <h3 id="dip-title" style={{ marginBottom: ".75rem" }}>
              Record a dip
            </h3>
            <ActionForm action={recordDipAction} submitLabel="Save dip" pendingLabel="Saving…" resetOnSuccess>
              <Field name="tankId" label="Tank" as="select" required options={tankOptions} />
              <Field name="measuredLitres" label="Measured litres" inputMode="numeric" required />
              <Field name="measuredOn" label="Dip date" type="date" required defaultValue={today} max={today} />
              <Field name="notes" label="Notes" as="textarea" rows={2} />
              <label className="shop-check">
                <input type="checkbox" name="postAdjustment" />
                Post the difference as an adjustment, so book stock matches the dip
              </label>
            </ActionForm>
          </section>

          <section className="shop-card" aria-labelledby="depot-form-title">
            <h3 id="depot-form-title" style={{ marginBottom: ".75rem" }}>
              Add a depot
            </h3>
            <ActionForm action={createDepotAction} submitLabel="Add depot" pendingLabel="Adding…" resetOnSuccess>
              <Field name="code" label="Depot code" required hint="2 to 10 letters or numbers, for example DAU" />
              <Field name="name" label="Depot name" required />
              <Field name="location" label="Location" />
            </ActionForm>
          </section>

          <section className="shop-card" aria-labelledby="tank-form-title">
            <h3 id="tank-form-title" style={{ marginBottom: ".75rem" }}>
              Add a tank
            </h3>
            <ActionForm action={createTankAction} submitLabel="Add tank" pendingLabel="Adding…" resetOnSuccess>
              <Field name="depotId" label="Depot" as="select" required options={depotOptions} />
              <Field name="name" label="Tank name" required hint="For example PMG-1" />
              <Field name="productCode" label="Product" as="select" required options={productOptions} />
              <Field name="capacityLitres" label="Capacity (litres)" inputMode="numeric" required />
            </ActionForm>
          </section>
        </div>
      </section>

      {history ? (
        <section className="shop-section" aria-labelledby="history-title">
          <div className="shop-section__head">
            <h2 id="history-title">
              {history.tank.name}: {history.tank.productLabel} at {history.tank.depotName}
            </h2>
            <Link href="/shop/inventory">Close history</Link>
          </div>
          <p className="shop-muted" style={{ marginBottom: ".75rem" }}>
            Book stock now: {formatLitres(history.tank.bookLitres)} L of {formatLitres(history.tank.capacityLitres)} L
          </p>
          <div className="shop-grid shop-grid--two">
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Movement</th>
                    <th scope="col">Reference</th>
                    <th scope="col" className="num">
                      Litres
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.movements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="shop-muted">
                        No movements yet.
                      </td>
                    </tr>
                  ) : (
                    history.movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{formatDate(movement.occurredOn)}</td>
                        <td>{MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType}</td>
                        <td className="shop-num">{movement.reference ?? ""}</td>
                        <td className="num">{movement.litres > 0 ? `+${formatLitres(movement.litres)}` : formatLitres(movement.litres)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Dip date</th>
                    <th scope="col" className="num">
                      Measured (L)
                    </th>
                    <th scope="col" className="num">
                      Book (L)
                    </th>
                    <th scope="col" className="num">
                      Variance (L)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.dips.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="shop-muted">
                        No dips recorded.
                      </td>
                    </tr>
                  ) : (
                    history.dips.map((dip) => (
                      <tr key={dip.id}>
                        <td>
                          {formatDate(dip.measuredOn)}
                          <div className="shop-muted" style={{ fontSize: ".8rem" }}>
                            {formatDateTime(dip.createdAt)}
                          </div>
                        </td>
                        <td className="num">{formatLitres(dip.measuredLitres)}</td>
                        <td className="num">{formatLitres(dip.bookLitres)}</td>
                        <td className="num">
                          {dip.varianceLitres > 0 ? "+" : ""}
                          {formatLitres(dip.varianceLitres)}
                          {dip.adjusted ? <div className="shop-muted" style={{ fontSize: ".8rem" }}>Adjusted</div> : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
