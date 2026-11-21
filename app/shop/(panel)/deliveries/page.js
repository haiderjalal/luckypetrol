import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { formatDate, todayIso } from "@/lib/shop/dates.js";
import { formatLitres } from "@/lib/shop/money.js";
import { DELIVERY_STATUS_TONE, toneFor } from "@/lib/shop/presentation.js";
import { getDispatchBoard } from "@/lib/shop/services/deliveries.js";
import { DELIVERY_STATUS_LABELS } from "@/lib/shop/constants.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dispatch",
};

export default function DispatchPage() {
  const today = todayIso();
  const board = getDispatchBoard();

  return (
    <>
      <PageHeader
        title="Dispatch and deliveries"
        description="Confirmed orders waiting to be loaded, tankers on the road, and recent deliveries. Stock leaves the depot when an order is dispatched."
      />

      <section className="shop-section" style={{ marginTop: 0 }} aria-labelledby="ready-title">
        <div className="shop-section__head">
          <h2 id="ready-title">Ready to load ({board.awaiting.length})</h2>
          <p>Open an order to choose the depot and vehicle.</p>
        </div>
        {board.awaiting.length === 0 ? (
          <EmptyState title="Nothing waiting to load.">Confirmed orders appear here.</EmptyState>
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Delivery</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Deliver to</th>
                  <th scope="col" className="num">
                    Litres
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.awaiting.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/shop/orders/${order.id}`}>{order.orderNo}</Link>
                    </td>
                    <td>
                      {formatDate(order.deliveryDate)}
                      {order.deliveryDate < today ? (
                        <div>
                          <StatusBadge tone="red">Past due date</StatusBadge>
                        </div>
                      ) : null}
                      {order.windowStart && order.windowEnd ? (
                        <div className="shop-muted">
                          {order.windowStart} to {order.windowEnd}
                        </div>
                      ) : null}
                    </td>
                    <td>{order.customerName}</td>
                    <td>{order.deliveryAddress}</td>
                    <td className="num">{formatLitres(order.totalLitres)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="shop-section" aria-labelledby="road-title">
        <div className="shop-section__head">
          <h2 id="road-title">On the road ({board.inTransit.length})</h2>
          <p>Record the litres delivered when the tanker returns or the customer confirms receipt.</p>
        </div>
        {board.inTransit.length === 0 ? (
          <EmptyState title="No deliveries in transit." />
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Delivery</th>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Dispatched</th>
                  <th scope="col" className="num">
                    Litres
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.inTransit.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>
                      <Link href={`/shop/deliveries/${delivery.id}`}>{delivery.deliveryNo}</Link>
                    </td>
                    <td>{delivery.orderNo}</td>
                    <td>{delivery.customerName}</td>
                    <td>{delivery.vehicleNo}</td>
                    <td>{formatDate(delivery.dispatchedOn)}</td>
                    <td className="num">{formatLitres(delivery.totalLitres)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="shop-section" aria-labelledby="delivered-title">
        <div className="shop-section__head">
          <h2 id="delivered-title">Recently delivered</h2>
        </div>
        {board.recentlyDelivered.length === 0 ? (
          <EmptyState title="No completed deliveries yet." />
        ) : (
          <div className="shop-table-wrap">
            <table className="shop-table">
              <thead>
                <tr>
                  <th scope="col">Delivery</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Delivered</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {board.recentlyDelivered.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>
                      <Link href={`/shop/deliveries/${delivery.id}`}>{delivery.deliveryNo}</Link>
                    </td>
                    <td>{delivery.customerName}</td>
                    <td>{formatDate(delivery.deliveredOn)}</td>
                    <td>
                      <StatusBadge tone={toneFor(DELIVERY_STATUS_TONE, delivery.status)}>{DELIVERY_STATUS_LABELS[delivery.status]}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="shop-muted" style={{ marginTop: "1.5rem", fontSize: ".88rem" }}>
        Stock at the depots is on the{" "}
        <Link href="/shop/inventory" style={{ fontWeight: 700 }}>
          depots and stock
        </Link>{" "}
        page. Value of this month&apos;s loaded litres is recorded on each order.
      </p>
    </>
  );
}
