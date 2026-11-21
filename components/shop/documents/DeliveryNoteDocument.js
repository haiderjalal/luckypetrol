import { formatDate } from "@/lib/shop/dates.js";
import { formatLitres } from "@/lib/shop/money.js";

import Letterhead from "./Letterhead.js";

/**
 * Printable delivery note. The driver and the receiver sign it at the depot and at the customer's site.
 * @param {{ delivery: object, items: object[], company: object }} props
 */
export default function DeliveryNoteDocument({ delivery, items, company }) {
  const isDelivered = delivery.status === "delivered";

  return (
    <article className="shop-doc" aria-label={`Delivery note ${delivery.deliveryNo}`}>
      <Letterhead company={company} />

      <div className="shop-doc__titlebar">
        <h1>Delivery note</h1>
        <dl className="shop-doc__meta">
          <dt>Delivery no.</dt>
          <dd>{delivery.deliveryNo}</dd>
          <dt>Order no.</dt>
          <dd>{delivery.orderNo}</dd>
          <dt>Dispatched</dt>
          <dd>{formatDate(delivery.dispatchedOn)}</dd>
          <dt>Delivered</dt>
          <dd>{isDelivered ? formatDate(delivery.deliveredOn) : "Pending"}</dd>
        </dl>
      </div>

      <div className="shop-doc__parties">
        <section>
          <h2>Customer</h2>
          <p>
            <strong>{delivery.customerName}</strong>
          </p>
          <p>{delivery.deliveryAddress}</p>
          {delivery.windowStart && delivery.windowEnd ? (
            <p>
              Window {delivery.windowStart} to {delivery.windowEnd}
            </p>
          ) : null}
        </section>
        <section>
          <h2>Loaded at</h2>
          <p>{delivery.depotName}</p>
          {delivery.depotLocation ? <p>{delivery.depotLocation}</p> : null}
          <p>Vehicle {delivery.vehicleNo}</p>
          {delivery.driverName ? <p>Driver {delivery.driverName}</p> : null}
          {delivery.driverPhone ? <p>Driver phone {delivery.driverPhone}</p> : null}
          {delivery.sealNumbers ? <p>Seal nos. {delivery.sealNumbers}</p> : null}
        </section>
      </div>

      <table className="shop-doc__table">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col" className="num">
              Loaded (L)
            </th>
            <th scope="col" className="num">
              Delivered (L)
            </th>
            <th scope="col" className="num">
              Short (L)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const delivered = item.deliveredLitres ?? null;
            const short = delivered === null ? null : item.loadedLitres - delivered;
            return (
              <tr key={item.productCode}>
                <td>{item.label}</td>
                <td className="num">{formatLitres(item.loadedLitres)}</td>
                <td className="num">{delivered === null ? "—" : formatLitres(delivered)}</td>
                <td className="num">{short === null ? "—" : formatLitres(short)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="shop-doc__footer" style={{ marginTop: "2.5rem" }}>
        <div className="shop-doc__sign" style={{ textAlign: "left" }}>
          Driver signature
        </div>
        <div className="shop-doc__sign" style={{ textAlign: "left" }}>
          Received by (name, signature and stamp)
        </div>
      </div>
    </article>
  );
}
