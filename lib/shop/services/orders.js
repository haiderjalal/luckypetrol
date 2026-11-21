// Orders: from the customer's request, through credit approval, to dispatch and delivery (see deliveries.js).

import { CUSTOMER_STATUS_LABELS, ORDER_STATUS_LABELS, PRODUCT_CODES, PRODUCT_LABELS } from "../constants.js";
import { formatDate, todayIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { ShopError, notFoundError } from "../errors.js";
import { joinAddress } from "../address.js";
import { formatPaisa } from "../money.js";
import { nextOrderNumber } from "../numbering.js";
import { pageCount, paginate } from "../pagination.js";
import { cleanDate, cleanSearch, pickAllowed } from "../query.js";
import { findCustomerById, findSiteById } from "../repositories/customers.js";
import { findDeliveryByOrder } from "../repositories/deliveries.js";
import { invoicesForOrder } from "../repositories/invoices.js";
import { customerBalancePaisa } from "../repositories/ledger.js";
import {
  findOrderRow,
  insertOrder,
  insertOrderItem,
  listOrders,
  openOrderExposurePaisa,
  orderItems,
  setOrderCancelled,
  setOrderCreditNote,
  setOrderStatus,
} from "../repositories/orders.js";
import { ratesEffectiveOn } from "../repositories/prices.js";
import { nullable } from "../repositories/rows.js";
import { recordAudit } from "./audit.js";

const ORDER_EDITABLE_BEFORE_DISPATCH = ["received", "confirmed"];

/** Prices each requested product at the rate in force today, less the customer's per-litre discount. */
function priceLines(db, { requested, customer, today }) {
  const rates = new Map(ratesEffectiveOn(db, today).map((row) => [row.productCode, row]));

  return PRODUCT_CODES.filter((code) => requested[code] > 0).map((code) => {
    const listRatePaisa = rates.get(code)?.ratePaisa;
    if (!listRatePaisa) {
      throw new ShopError(`No ${PRODUCT_LABELS[code]} rate is set for ${formatDate(today)}. Set the rate card before taking orders.`, {
        code: "no_rate",
      });
    }

    const discountPaisa = customer.discountPerLitrePaisa;
    if (discountPaisa >= listRatePaisa) {
      throw new ShopError(`The discount on ${customer.name} is not below the ${PRODUCT_LABELS[code]} rate. Correct the customer's discount first.`);
    }

    const orderedLitres = requested[code];
    const ratePaisa = listRatePaisa - discountPaisa;
    return {
      productCode: code,
      orderedLitres,
      listRatePaisa,
      discountPaisa,
      ratePaisa,
      amountPaisa: orderedLitres * ratePaisa,
    };
  });
}

function deliveryAddressFor(db, input, customer) {
  if (input.siteId === null) {
    return input.deliveryAddress;
  }

  const site = findSiteById(db, input.siteId);
  if (!site || site.customerId !== customer.id || !site.isActive) {
    throw new ShopError("That delivery site is not available for this customer.", {
      fieldErrors: { siteId: "Choose one of this customer's active sites." },
    });
  }

  return joinAddress(site.address, site.city);
}

export function createOrder(input, actor) {
  return transaction((db) => {
    const customer = findCustomerById(db, input.customerId);
    if (!customer) {
      throw notFoundError("Customer");
    }
    if (customer.status !== "active") {
      throw new ShopError(`${customer.name} is ${CUSTOMER_STATUS_LABELS[customer.status].toLowerCase()}. Orders can only be taken for active customers.`, {
        fieldErrors: { customerId: "This customer is not active." },
      });
    }

    const today = todayIso();
    if (input.deliveryDate < today) {
      throw new ShopError("The delivery date cannot be in the past.", {
        fieldErrors: { deliveryDate: "Choose today or a later date." },
      });
    }

    const requested = { PMG: input.litresPMG, HSD: input.litresHSD, HOBC: input.litresHOBC };
    const lines = priceLines(db, { requested, customer, today });
    const totalLitres = lines.reduce((sum, line) => sum + line.orderedLitres, 0);
    const estimatedPaisa = lines.reduce((sum, line) => sum + line.amountPaisa, 0);
    const deliveryAddress = deliveryAddressFor(db, input, customer);
    const now = new Date().toISOString();
    const orderNo = nextOrderNumber(db);

    const orderId = insertOrder(db, {
      order_no: orderNo,
      customer_id: customer.id,
      site_id: input.siteId,
      delivery_address: deliveryAddress,
      delivery_date: input.deliveryDate,
      window_start: nullable(input.windowStart),
      window_end: nullable(input.windowEnd),
      source: input.source,
      status: "received",
      total_litres: totalLitres,
      estimated_paisa: estimatedPaisa,
      notes: nullable(input.notes),
      created_by: actor,
      created_at: now,
      updated_at: now,
    });

    for (const line of lines) {
      insertOrderItem(db, {
        order_id: orderId,
        product_code: line.productCode,
        ordered_litres: line.orderedLitres,
        list_rate_paisa: line.listRatePaisa,
        discount_paisa: line.discountPaisa,
        rate_paisa: line.ratePaisa,
      });
    }

    recordAudit(db, {
      actor,
      action: "order.received",
      entityType: "order",
      entityId: orderId,
      summary: `${orderNo} for ${customer.name}: ${totalLitres} L, estimated ${formatPaisa(estimatedPaisa)}`,
    });

    return {
      id: orderId,
      orderNo,
      message: `${orderNo} received for ${customer.name}.`,
      redirectTo: `/shop/orders/${orderId}`,
    };
  });
}

/**
 * Confirms a received order after checking the customer's credit limit.
 * Balance + other open orders + this order must stay within the limit; going over needs an approval note.
 */
export function confirmOrder(input, actor) {
  return transaction((db) => {
    const order = findOrderRow(db, input.orderId);
    if (!order) {
      throw notFoundError("Order");
    }
    if (order.status !== "received") {
      throw new ShopError(`Only received orders can be confirmed. ${order.orderNo} is ${ORDER_STATUS_LABELS[order.status].toLowerCase()}.`);
    }

    const customer = findCustomerById(db, order.customerId);
    if (customer.status !== "active") {
      throw new ShopError(`${customer.name} is ${CUSTOMER_STATUS_LABELS[customer.status].toLowerCase()}. Make the customer active before confirming.`);
    }

    const exposurePaisa = customerBalancePaisa(db, customer.id) + openOrderExposurePaisa(db, customer.id) + order.estimatedPaisa;
    const overLimitPaisa = exposurePaisa - customer.creditLimitPaisa;
    const now = new Date().toISOString();

    if (overLimitPaisa > 0) {
      if (!input.overrideNote) {
        throw new ShopError(
          `Confirming ${order.orderNo} takes ${customer.name} Rs. ${formatPaisa(overLimitPaisa)} over their credit limit. Add an approval note to confirm anyway.`,
          {
            code: "credit_limit",
            fieldErrors: { overrideNote: "Add the approval reason to confirm over the limit." },
          },
        );
      }

      const note = `Approved over credit limit by Rs. ${formatPaisa(overLimitPaisa)}: ${input.overrideNote}`;
      setOrderCreditNote(db, order.id, note, now);
      recordAudit(db, {
        actor,
        action: "order.credit_override",
        entityType: "order",
        entityId: order.id,
        summary: `${order.orderNo}: ${note}`,
      });
    }

    setOrderStatus(db, order.id, "confirmed", now);
    recordAudit(db, {
      actor,
      action: "order.confirmed",
      entityType: "order",
      entityId: order.id,
      summary: `${order.orderNo} confirmed for ${customer.name}`,
    });

    return { message: `${order.orderNo} confirmed.` };
  });
}

export function cancelOrder(input, actor) {
  return transaction((db) => {
    const order = findOrderRow(db, input.orderId);
    if (!order) {
      throw notFoundError("Order");
    }
    if (!ORDER_EDITABLE_BEFORE_DISPATCH.includes(order.status)) {
      throw new ShopError(
        `${order.orderNo} cannot be cancelled because it is ${ORDER_STATUS_LABELS[order.status].toLowerCase()}. Cancel the delivery and invoice records instead.`,
      );
    }

    setOrderCancelled(db, order.id, input.reason, new Date().toISOString());
    recordAudit(db, {
      actor,
      action: "order.cancelled",
      entityType: "order",
      entityId: order.id,
      summary: `${order.orderNo} cancelled: ${input.reason}`,
    });

    return { message: `${order.orderNo} cancelled.` };
  });
}

export function listOrderQueue(filters = {}) {
  const paging = paginate(filters.page);
  const { rows, total } = listOrders(getDb(), {
    status: pickAllowed(filters.status, ORDER_STATUS_LABELS),
    search: cleanSearch(filters.search),
    from: cleanDate(filters.from),
    to: cleanDate(filters.to),
    limit: paging.limit,
    offset: paging.offset,
  });

  return { rows, total, page: paging.page, pageCount: pageCount(total) };
}

export function getOrderDetail(orderId) {
  const db = getDb();
  const order = findOrderRow(db, orderId);
  if (!order) {
    throw notFoundError("Order");
  }

  const items = orderItems(db, orderId).map((item) => ({
    ...item,
    label: PRODUCT_LABELS[item.productCode] ?? item.productCode,
    amountPaisa: item.orderedLitres * item.ratePaisa,
  }));

  const balancePaisa = customerBalancePaisa(db, order.customerId);
  const openOrdersPaisa = openOrderExposurePaisa(db, order.customerId);

  return {
    order,
    items,
    balancePaisa,
    openOrdersPaisa,
    creditAvailablePaisa: order.creditLimitPaisa - balancePaisa - openOrdersPaisa,
    invoices: invoicesForOrder(db, orderId),
    delivery: findDeliveryByOrder(db, orderId),
  };
}
