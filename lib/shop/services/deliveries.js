// Dispatch and delivery. Loading takes stock out of the depot's tanks; undelivered litres go back in.

import { ORDER_STATUS_LABELS, PRODUCT_CODES, PRODUCT_LABELS } from "../constants.js";
import { todayIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { ShopError, notFoundError } from "../errors.js";
import { formatLitres } from "../money.js";
import { nextDeliveryNumber } from "../numbering.js";
import {
  deliveryItems,
  findDeliveryByOrder,
  findDeliveryRow,
  insertDelivery,
  insertDeliveryItem,
  listDeliveries,
  markDeliveryCompleted,
  ordersAwaitingDispatch,
} from "../repositories/deliveries.js";
import { findDepot, firstActiveTankForProduct, insertMovement, listDepots, tankBookLitres, tanksForDispatch } from "../repositories/inventory.js";
import { findOrderRow, orderItems, setItemDelivered, setOrderStatus } from "../repositories/orders.js";
import { nullable } from "../repositories/rows.js";
import { recordAudit } from "./audit.js";

/** Chooses which tanks the order is loaded from. Fails before anything is written if stock is short. */
function planLoad(db, depot, item) {
  const tanks = tanksForDispatch(db, depot.id, item.productCode);
  let remaining = item.orderedLitres;
  const draws = [];

  for (const tank of tanks) {
    if (remaining === 0) {
      break;
    }

    const take = Math.min(remaining, tank.bookLitres);
    if (take > 0) {
      draws.push({ tankId: tank.id, litres: take });
      remaining -= take;
    }
  }

  if (remaining > 0) {
    throw new ShopError(
      `Not enough ${PRODUCT_LABELS[item.productCode]} at ${depot.name}: ${formatLitres(remaining)} litres short. Load from another depot or receive stock first.`,
      { code: "stock" },
    );
  }

  return { productCode: item.productCode, litres: item.orderedLitres, draws };
}

export function dispatchOrder(input, actor) {
  return transaction((db) => {
    const order = findOrderRow(db, input.orderId);
    if (!order) {
      throw notFoundError("Order");
    }
    if (order.status !== "confirmed") {
      throw new ShopError(`Only confirmed orders can be dispatched. ${order.orderNo} is ${ORDER_STATUS_LABELS[order.status].toLowerCase()}.`);
    }
    if (findDeliveryByOrder(db, order.id)) {
      throw new ShopError(`${order.orderNo} already has a delivery record.`);
    }

    const depot = findDepot(db, input.depotId);
    if (!depot || !depot.isActive) {
      throw new ShopError("Choose an active depot to load from.", { fieldErrors: { depotId: "Choose an active depot." } });
    }

    const loads = orderItems(db, order.id).map((item) => planLoad(db, depot, item));
    const now = new Date().toISOString();
    const today = todayIso();
    const deliveryNo = nextDeliveryNumber(db);

    const deliveryId = insertDelivery(db, {
      delivery_no: deliveryNo,
      order_id: order.id,
      depot_id: depot.id,
      vehicle_no: input.vehicleNo,
      driver_name: nullable(input.driverName),
      driver_phone: nullable(input.driverPhone),
      seal_numbers: nullable(input.sealNumbers),
      status: "in_transit",
      dispatched_on: today,
      dispatched_at: now,
      created_by: actor,
    });

    for (const load of loads) {
      insertDeliveryItem(db, { delivery_id: deliveryId, product_code: load.productCode, loaded_litres: load.litres });
      for (const draw of load.draws) {
        insertMovement(db, {
          tank_id: draw.tankId,
          movement_type: "dispatch",
          litres: -draw.litres,
          reference: deliveryNo,
          occurred_on: today,
          created_by: actor,
          created_at: now,
        });
      }
    }

    setOrderStatus(db, order.id, "dispatched", now);
    recordAudit(db, {
      actor,
      action: "delivery.dispatched",
      entityType: "delivery",
      entityId: deliveryId,
      summary: `${deliveryNo} for ${order.orderNo} loaded at ${depot.name}, vehicle ${input.vehicleNo}`,
    });

    return { id: deliveryId, message: `${deliveryNo} dispatched for ${order.orderNo}.`, redirectTo: `/shop/deliveries/${deliveryId}` };
  });
}

/** Puts undelivered litres back into the depot's first active tank for that product. */
function returnToDepot(db, { delivery, productCode, litres, date, actor, now }) {
  const tank = firstActiveTankForProduct(db, delivery.depotId, productCode);
  if (!tank) {
    throw new ShopError(`No active ${PRODUCT_LABELS[productCode]} tank at ${delivery.depotName} to take back ${formatLitres(litres)} litres.`);
  }

  const bookLitres = tankBookLitres(db, tank.id);
  if (bookLitres + litres > tank.capacityLitres) {
    throw new ShopError(`${tank.name} does not have room to take back ${formatLitres(litres)} litres.`);
  }

  insertMovement(db, {
    tank_id: tank.id,
    movement_type: "return",
    litres,
    reference: `Return ${delivery.deliveryNo}`,
    occurred_on: date,
    created_by: actor,
    created_at: now,
  });
}

export function completeDelivery(input, actor) {
  return transaction((db) => {
    const delivery = findDeliveryRow(db, input.deliveryId);
    if (!delivery) {
      throw notFoundError("Delivery");
    }
    if (delivery.status !== "in_transit") {
      throw new ShopError(`${delivery.deliveryNo} is already marked as delivered.`);
    }

    const deliveredByProduct = { PMG: input.deliveredPMG, HSD: input.deliveredHSD, HOBC: input.deliveredHOBC };
    const items = deliveryItems(db, delivery.id);

    for (const code of PRODUCT_CODES) {
      const loaded = items.find((item) => item.productCode === code)?.loadedLitres ?? 0;
      if (deliveredByProduct[code] > loaded) {
        throw new ShopError(`${PRODUCT_LABELS[code]}: delivered litres cannot exceed the ${formatLitres(loaded)} litres loaded.`, {
          fieldErrors: { [`delivered${code}`]: `Cannot be more than ${formatLitres(loaded)} litres.` },
        });
      }
    }

    const now = new Date().toISOString();
    for (const item of items) {
      const delivered = deliveredByProduct[item.productCode];
      setItemDelivered(db, item.orderItemId, delivered);

      const shortfall = item.loadedLitres - delivered;
      if (shortfall > 0) {
        returnToDepot(db, {
          delivery,
          productCode: item.productCode,
          litres: shortfall,
          date: input.deliveredOn,
          actor,
          now,
        });
      }
    }

    markDeliveryCompleted(db, delivery.id, input.deliveredOn, now);
    setOrderStatus(db, delivery.orderId, "delivered", now);
    recordAudit(db, {
      actor,
      action: "delivery.completed",
      entityType: "delivery",
      entityId: delivery.id,
      summary: `${delivery.deliveryNo} delivered on ${input.deliveredOn} for ${delivery.orderNo}`,
    });

    return { message: `${delivery.deliveryNo} marked as delivered.`, redirectTo: `/shop/deliveries/${delivery.id}` };
  });
}

export function getDispatchBoard() {
  const db = getDb();
  return {
    awaiting: ordersAwaitingDispatch(db),
    inTransit: listDeliveries(db, { status: "in_transit", limit: 100, offset: 0 }).rows,
    recentlyDelivered: listDeliveries(db, { status: "delivered", limit: 10, offset: 0 }).rows,
    depots: listDepots(db).filter((depot) => depot.isActive),
  };
}

export function getDeliveryDetail(deliveryId) {
  const db = getDb();
  const delivery = findDeliveryRow(db, deliveryId);
  if (!delivery) {
    throw notFoundError("Delivery");
  }

  return {
    delivery,
    items: deliveryItems(db, delivery.id).map((item) => ({
      productCode: item.productCode,
      label: PRODUCT_LABELS[item.productCode] ?? item.productCode,
      loadedLitres: item.loadedLitres,
      deliveredLitres: item.deliveredLitres,
    })),
  };
}
