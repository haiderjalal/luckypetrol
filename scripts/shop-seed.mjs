// Adds DEMO data so the shop can be tried locally. Every record is labelled DEMO.
// Runs only on an empty test database. To start again, reset the test database (section 8 of docs/supabase-setup.md).

import { closeSql, getSql } from "../lib/shop/db.js";
import { useTestDatabase } from "../lib/shop/testDatabase.js";
import { todayIso } from "../lib/shop/dates.js";
import { parseInput } from "../lib/shop/validation/parse.js";
import { customerSchema, siteSchema } from "../lib/shop/validation/customers.js";
import { orderSchema } from "../lib/shop/validation/orders.js";
import { paymentSchema } from "../lib/shop/validation/payments.js";
import { depotSchema, receiptSchema, tankSchema } from "../lib/shop/validation/inventory.js";
import { dispatchSchema, deliverySchema } from "../lib/shop/validation/deliveries.js";
import { rateSchema } from "../lib/shop/validation/prices.js";
import { addCustomerSite, createCustomer } from "../lib/shop/services/customers.js";
import { cancelOrder, confirmOrder, createOrder } from "../lib/shop/services/orders.js";
import { completeDelivery, dispatchOrder } from "../lib/shop/services/deliveries.js";
import { createInvoiceFromOrder } from "../lib/shop/services/invoices.js";
import { recordPayment } from "../lib/shop/services/payments.js";
import { createDepot, createTank, receiveStock } from "../lib/shop/services/inventory.js";
import { setRate } from "../lib/shop/services/prices.js";

const ACTOR = "DEMO seed";
const today = todayIso();

function customerInput(overrides) {
  return {
    contactPerson: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "Karachi",
    ntn: "",
    strn: "",
    creditLimit: "0",
    paymentTermsDays: "7",
    discount: "0",
    notes: "DEMO record. Delete before going live.",
    status: "active",
    ...overrides,
  };
}

function idOf(result) {
  return Number(result.redirectTo.split("/").pop());
}

function orderFor(customerId, { litresPMG = "", litresHSD = "", litresHOBC = "", address, siteId = "" }) {
  return parseInput(orderSchema, {
    customerId: String(customerId),
    siteId,
    deliveryAddress: address,
    deliveryDate: today,
    windowStart: "09:00",
    windowEnd: "13:00",
    source: "phone",
    litresPMG,
    litresHSD,
    litresHOBC,
    notes: "DEMO order",
  });
}

async function main() {
  useTestDatabase();
  const sql = getSql();
  try {
    const [{ total: existing }] = await sql`SELECT COUNT(*) AS total FROM shop.customers`;
    if (existing > 0) {
      console.error("The database already has customers, so the DEMO seed was not run.");
      console.error("To start again, reset the test database (section 8 of docs/supabase-setup.md).");
      process.exitCode = 1;
      return;
    }

    console.info("Setting today's rate card (DEMO rates)...");
    await setRate(parseInput(rateSchema, { productCode: "PMG", rate: "377.71", effectiveFrom: today }), ACTOR);
    await setRate(parseInput(rateSchema, { productCode: "HSD", rate: "391.75", effectiveFrom: today }), ACTOR);
    await setRate(parseInput(rateSchema, { productCode: "HOBC", rate: "350.00", effectiveFrom: today }), ACTOR);

    console.info("Creating a DEMO depot and tanks...");
    await createDepot(parseInput(depotSchema, { code: "DEMO", name: "DEMO depot", location: "Placeholder location" }), ACTOR);
    const [{ id: depotId }] = await sql`SELECT id FROM shop.depots WHERE code = 'DEMO'`;
    const tanks = [
      ["DEMO PMG-1", "PMG", "500000", "400000"],
      ["DEMO HSD-1", "HSD", "500000", "400000"],
      ["DEMO HOBC-1", "HOBC", "200000", "100000"],
    ];
    for (const [name, productCode, capacity, stock] of tanks) {
      await createTank(parseInput(tankSchema, { depotId: String(depotId), name, productCode, capacityLitres: capacity }), ACTOR);
      const [{ id: tankId }] = await sql`SELECT id FROM shop.tanks WHERE name = ${name}`;
      await receiveStock(parseInput(receiptSchema, { tankId: String(tankId), litres: stock, reference: "DEMO challan", occurredOn: today }), ACTOR);
    }

    console.info("Adding DEMO customers...");
    const station = idOf(await createCustomer(parseInput(customerSchema, customerInput({
      name: "DEMO – Sample filling station",
      customerType: "dealer",
      address: "Plot 12, Sector 5, Karachi",
      creditLimit: "5000000",
      paymentTermsDays: "7",
    })), ACTOR));
    await addCustomerSite(parseInput(siteSchema, { customerId: String(station), label: "DEMO Pump 1", address: "Landhi Industrial Area", city: "Karachi", contactName: "", contactPhone: "" }), ACTOR);

    const bank = idOf(await createCustomer(parseInput(customerSchema, customerInput({
      name: "DEMO – City bank branch",
      customerType: "bank",
      address: "DEMO branch, Clifton",
      creditLimit: "20000000",
      discount: "0.50",
      paymentTermsDays: "30",
    })), ACTOR));

    const vendor = idOf(await createCustomer(parseInput(customerSchema, customerInput({
      name: "DEMO – Corner shop vendor",
      customerType: "shop_owner",
      address: "Shop 4, Main Market",
      whatsapp: "0300 1234567",
      creditLimit: "0",
      discount: "2",
      paymentTermsDays: "14",
    })), ACTOR));

    const restaurant = idOf(await createCustomer(parseInput(customerSchema, customerInput({
      name: "DEMO – Restaurant and grill",
      customerType: "restaurant",
      address: "DEMO road, Gulshan",
      creditLimit: "500000",
    })), ACTOR));

    const courier = idOf(await createCustomer(parseInput(customerSchema, customerInput({
      name: "DEMO – Logistics courier",
      customerType: "logistics",
      address: "DEMO warehouse, SITE",
      creditLimit: "10000000",
      paymentTermsDays: "15",
    })), ACTOR));

    console.info("Taking DEMO orders and running them through to invoices...");
    const stationOrder = (await createOrder(orderFor(station, { litresPMG: "5000", litresHSD: "3000", address: "Plot 12, Sector 5, Karachi" }), ACTOR)).id;
    await confirmOrder({ orderId: stationOrder, overrideNote: "" }, ACTOR);
    const stationLoad = await dispatchOrder(parseInput(dispatchSchema, { orderId: String(stationOrder), depotId: String(depotId), vehicleNo: "DEMO-1001", driverName: "DEMO driver", driverPhone: "", sealNumbers: "DEMO-S1" }), ACTOR);
    await completeDelivery(parseInput(deliverySchema, { deliveryId: String(stationLoad.id), deliveredOn: today, deliveredPMG: "5000", deliveredHSD: "3000", deliveredHOBC: "0" }), ACTOR);
    await createInvoiceFromOrder({ orderId: stationOrder }, ACTOR);
    await recordPayment(parseInput(paymentSchema, { customerId: String(station), amount: "2000000", method: "bank_transfer", reference: "DEMO transfer", bankName: "DEMO bank", receivedOn: today, notes: "" }), ACTOR);

    const courierOrder = (await createOrder(orderFor(courier, { litresHSD: "12000", address: "DEMO warehouse, SITE" }), ACTOR)).id;
    await confirmOrder({ orderId: courierOrder, overrideNote: "" }, ACTOR);
    const courierLoad = await dispatchOrder(parseInput(dispatchSchema, { orderId: String(courierOrder), depotId: String(depotId), vehicleNo: "DEMO-2002", driverName: "", driverPhone: "", sealNumbers: "" }), ACTOR);
    await completeDelivery(parseInput(deliverySchema, { deliveryId: String(courierLoad.id), deliveredOn: today, deliveredPMG: "0", deliveredHSD: "12000", deliveredHOBC: "0" }), ACTOR);
    await createInvoiceFromOrder({ orderId: courierOrder }, ACTOR);
    await recordPayment(parseInput(paymentSchema, { customerId: String(courier), amount: "4701000", method: "cheque", reference: "DEMO cheque 001", bankName: "DEMO bank", receivedOn: today, notes: "" }), ACTOR);

    const bankOrder = (await createOrder(orderFor(bank, { litresHSD: "8000", address: "DEMO branch, Clifton" }), ACTOR)).id;
    await confirmOrder({ orderId: bankOrder, overrideNote: "" }, ACTOR);
    await dispatchOrder(parseInput(dispatchSchema, { orderId: String(bankOrder), depotId: String(depotId), vehicleNo: "DEMO-3003", driverName: "", driverPhone: "", sealNumbers: "" }), ACTOR);

    const vendorOrder = (await createOrder(orderFor(vendor, { litresHOBC: "500", address: "Shop 4, Main Market" }), ACTOR)).id;
    await confirmOrder({ orderId: vendorOrder, overrideNote: "DEMO approval for a cash-on-delivery top-up" }, ACTOR);

    const restaurantOrder = (await createOrder(orderFor(restaurant, { litresPMG: "300", address: "DEMO road, Gulshan" }), ACTOR)).id;
    const cancelled = (await createOrder(orderFor(restaurant, { litresPMG: "100", address: "DEMO road, Gulshan" }), ACTOR)).id;
    await cancelOrder({ orderId: cancelled, reason: "DEMO: customer changed the quantity" }, ACTOR);

    console.info("");
    console.info("DEMO data added:");
    console.info("  - 5 customers (DEMO), 1 delivery site, 1 depot with 3 tanks");
    console.info("  - 2 invoices fully or partly paid, 1 order on the road, 1 confirmed order awaiting loading, 1 received order");
    console.info(`  - rates set for ${today}`);
    console.info(`  - order ${restaurantOrder} is the received order to confirm; order ${cancelled} shows a cancelled order`);
    console.info("Sign in at http://localhost:3000/shop with the username and password from .env.local.");
  } finally {
    await closeSql();
  }
}

await main();
