// End-to-end shop flow against the test database (SHOP_TEST_DATABASE_URL). Steps run in order and build on each other.
// Expected figures are worked out by hand from the rates set in step 1 (all amounts in paisa unless noted).

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { useTestDatabase } from "../lib/shop/testDatabase.js";

useTestDatabase();

const { parseInput } = await import("../lib/shop/validation/parse.js");
const { customerSchema, siteSchema } = await import("../lib/shop/validation/customers.js");
const { orderSchema } = await import("../lib/shop/validation/orders.js");
const { paymentSchema } = await import("../lib/shop/validation/payments.js");
const { depotSchema, tankSchema, receiptSchema, dipSchema } = await import("../lib/shop/validation/inventory.js");
const { dispatchSchema, deliverySchema } = await import("../lib/shop/validation/deliveries.js");
const { rateSchema } = await import("../lib/shop/validation/prices.js");
const { settingsSchema } = await import("../lib/shop/validation/settings.js");
const { createCustomer, editCustomer, addCustomerSite, getCustomerDetail, getOrderFormOptions } = await import("../lib/shop/services/customers.js");
const { createOrder, confirmOrder, cancelOrder, getOrderDetail, listOrderQueue } = await import("../lib/shop/services/orders.js");
const { createInvoiceFromOrder, cancelInvoice, getInvoiceDetail, getPublicInvoice, listInvoices } = await import("../lib/shop/services/invoices.js");
const { recordPayment, voidPayment, getPaymentDetail } = await import("../lib/shop/services/payments.js");
const { getStatement, getAgingReport, getCustomerBalance } = await import("../lib/shop/services/ledger.js");
const { createDepot, createTank, receiveStock, recordDip, getInventoryOverview, getTankHistory } = await import("../lib/shop/services/inventory.js");
const { dispatchOrder, completeDelivery, getDeliveryDetail, getDispatchBoard } = await import("../lib/shop/services/deliveries.js");
const { setRate, getRateCard } = await import("../lib/shop/services/prices.js");
const { saveSettings, getSettings } = await import("../lib/shop/services/settings.js");
const { getDashboard } = await import("../lib/shop/services/dashboard.js");
const { buildCsvExport } = await import("../lib/shop/services/reports.js");
const { getAuditLog } = await import("../lib/shop/services/audit.js");
const { closeSql, getSql } = await import("../lib/shop/db.js");
const { addDays, fiscalYearLabel, todayIso } = await import("../lib/shop/dates.js");

const ACTOR = "lucky petroleum";
const today = todayIso();
const fy = fiscalYearLabel(today);

const idFromRedirect = (result) => Number(result.redirectTo.split("/").pop());

async function assertShopError(fn, messagePattern, code) {
  await assert.rejects(
    async () => fn(),
    (error) => error?.name === "ShopError" && messagePattern.test(error.message) && (code === undefined || error.code === code),
    `expected a ShopError matching ${messagePattern}`,
  );
}

/** Runs a raw query and returns its first row. Placeholders are $1, $2 and so on. */
async function scalar(sql, ...params) {
  const [row] = await getSql().unsafe(sql, params);
  return row;
}

async function tankIdByName(name) {
  return (await scalar("SELECT id FROM shop.tanks WHERE name = $1", name)).id;
}

async function depotIdByCode(code) {
  return (await scalar("SELECT id FROM shop.depots WHERE code = $1", code)).id;
}

/** Ledger balance must equal open invoices minus advances held. This is the core accounting invariant. */
async function assertLedgerMatchesInvoices(customerId) {
  const openInvoices = (
    await scalar(
      `SELECT COALESCE(SUM(i.total_paisa - COALESCE(a.paid, 0)), 0) AS value
     FROM shop.invoices i
     LEFT JOIN (SELECT invoice_id, SUM(amount_paisa) AS paid FROM shop.payment_allocations GROUP BY invoice_id) a ON a.invoice_id = i.id
     WHERE i.customer_id = $1 AND i.status = 'issued'`,
      customerId,
    )
  ).value;

  const advances = (
    await scalar(
      `SELECT COALESCE(SUM(p.amount_paisa - COALESCE(x.paid, 0)), 0) AS value
     FROM shop.payments p
     LEFT JOIN (SELECT payment_id, SUM(amount_paisa) AS paid FROM shop.payment_allocations GROUP BY payment_id) x ON x.payment_id = p.id
     WHERE p.customer_id = $1 AND p.status = 'posted'`,
      customerId,
    )
  ).value;

  assert.equal(await getCustomerBalance(customerId), openInvoices - advances, `ledger should equal open invoices less advances for customer ${customerId}`);
}

const dealerInput = {
  name: "Test Dealer Alpha",
  customerType: "dealer",
  status: "active",
  contactPerson: "Bilal",
  phone: "021 3530 0031",
  whatsapp: "",
  email: "alpha@example.com",
  address: "Plot 12, Sector 5, Karachi",
  city: "Karachi",
  ntn: "1234567",
  strn: "",
  creditLimit: "5000000",
  paymentTermsDays: "7",
  discount: "0",
  notes: "",
};

const vendorInput = {
  name: "Test Vendor Beta",
  customerType: "shop_owner",
  status: "active",
  contactPerson: "Ali",
  phone: "",
  whatsapp: "0300 1234567",
  email: "",
  address: "Shop 4, Main Market",
  city: "Karachi",
  ntn: "",
  strn: "",
  creditLimit: "0",
  paymentTermsDays: "14",
  discount: "2",
  notes: "",
};

/** Empties every shop table except the seeded products, so each run starts from the same state. */
before(async () => {
  await getSql()`
    truncate shop.counters, shop.settings, shop.product_rates, shop.customers, shop.customer_sites,
      shop.orders, shop.order_items, shop.depots, shop.tanks, shop.stock_movements, shop.dip_readings,
      shop.deliveries, shop.delivery_items, shop.invoices, shop.invoice_lines, shop.payments,
      shop.payment_allocations, shop.ledger_entries, shop.audit_log, shop.login_attempts
    restart identity cascade`;
});

after(async () => {
  await closeSql();
});

describe("setup: rates, customers and depots", () => {
  it("sets today's rate card and refuses back-dated rates", async () => {
    for (const [productCode, rate] of [["PMG", "377.71"], ["HSD", "391.75"], ["HOBC", "350"]]) {
      await setRate(parseInput(rateSchema, { productCode, rate, effectiveFrom: today }), ACTOR);
    }

    const card = (await getRateCard(today)).products;
    assert.deepEqual(
      card.map((row) => [row.productCode, row.ratePaisa]),
      [["PMG", 37771], ["HSD", 39175], ["HOBC", 35000]],
    );

    await assertShopError(
      () => setRate(parseInput(rateSchema, { productCode: "PMG", rate: "380", effectiveFrom: addDays(today, -1) }), ACTOR),
      /back-dated/,
    );
  });

  it("validates customer forms before saving", async () => {
    await assertShopError(
      () => parseInput(customerSchema, { ...dealerInput, whatsapp: "0321" }),
      /Please check|Pakistani mobile/,
      "validation",
    );

    try {
      parseInput(customerSchema, { ...dealerInput, whatsapp: "0321", ntn: "12" });
      assert.fail("expected validation to fail");
    } catch (error) {
      assert.equal(error.code, "validation");
      assert.match(error.fieldErrors.whatsapp, /Pakistani mobile/);
      assert.match(error.fieldErrors.ntn, /must be 7 or 13 digits/);
    }
  });

  it("creates customers with codes and refuses duplicate names", async () => {
    const dealer = await createCustomer(parseInput(customerSchema, dealerInput), ACTOR);
    const vendor = await createCustomer(parseInput(customerSchema, vendorInput), ACTOR);

    assert.equal(idFromRedirect(dealer), 1);
    assert.equal(idFromRedirect(vendor), 2);
    assert.equal((await scalar("SELECT whatsapp FROM shop.customers WHERE id = 2")).whatsapp, "923001234567");

    await assertShopError(
      () => createCustomer(parseInput(customerSchema, { ...dealerInput, name: "test dealer alpha" }), ACTOR),
      /already called/,
    );
  });

  it("adds a delivery site that appears in the order form", async () => {
    await addCustomerSite(
      parseInput(siteSchema, {
        customerId: "1",
        label: "Pump 1 Landhi",
        address: "Landhi Industrial Area",
        city: "Karachi",
        contactName: "",
        contactPhone: "",
      }),
      ACTOR,
    );

    const options = await getOrderFormOptions();
    const dealer = options.find((customer) => customer.id === 1);
    assert.equal(dealer.sites.length, 1);
    assert.equal(dealer.sites[0].label, "Pump 1 Landhi");
  });

  it("sets up a depot with tanks and receives stock within capacity", async () => {
    await createDepot(parseInput(depotSchema, { code: "dau", name: "Daulatpur Depot", location: "Benazirabad" }), ACTOR);
    const depotId = await depotIdByCode("DAU");
    assert.equal(depotId, 1);

    await createTank(parseInput(tankSchema, { depotId: String(depotId), name: "PMG-1", productCode: "PMG", capacityLitres: "100000" }), ACTOR);
    await createTank(parseInput(tankSchema, { depotId: String(depotId), name: "HSD-1", productCode: "HSD", capacityLitres: "100000" }), ACTOR);
    await createTank(parseInput(tankSchema, { depotId: String(depotId), name: "HOBC-1", productCode: "HOBC", capacityLitres: "50000" }), ACTOR);

    await receiveStock(parseInput(receiptSchema, { tankId: String(await tankIdByName("PMG-1")), litres: "60000", reference: "CH-1001", occurredOn: today }), ACTOR);
    await receiveStock(parseInput(receiptSchema, { tankId: String(await tankIdByName("HSD-1")), litres: "60000", reference: "CH-1002", occurredOn: today }), ACTOR);
    await receiveStock(parseInput(receiptSchema, { tankId: String(await tankIdByName("HOBC-1")), litres: "20000", reference: "CH-1003", occurredOn: today }), ACTOR);

    const totals = Object.fromEntries((await getInventoryOverview()).productTotals.map((row) => [row.productCode, row.bookLitres]));
    assert.deepEqual(totals, { PMG: 60000, HSD: 60000, HOBC: 20000 });

    await assertShopError(
      async () =>
        receiveStock(parseInput(receiptSchema, { tankId: String(await tankIdByName("HOBC-1")), litres: "31001", reference: "", occurredOn: today }), ACTOR),
      /room for 30,000 more litres/,
    );
  });
});

describe("orders: credit control and confirmation", () => {
  let orderA;
  let orderB;

  it("prices an order at today's rates and records the estimate", async () => {
    const result = await createOrder(
      parseInput(orderSchema, {
        customerId: "1",
        siteId: "",
        deliveryAddress: "Plot 12, Sector 5, Karachi",
        deliveryDate: today,
        windowStart: "09:00",
        windowEnd: "12:00",
        source: "phone",
        litresPMG: "5,000",
        litresHSD: "2000",
        litresHOBC: "",
        notes: "",
      }),
      ACTOR,
    );

    orderA = result.id;
    assert.equal(result.orderNo, "ORD-000001");

    const detail = await getOrderDetail(orderA);
    assert.equal(detail.order.totalLitres, 7000);
    // 5,000 x 377.71 + 2,000 x 391.75 = 2,67,20,500.00 (Rs.)
    assert.equal(detail.order.estimatedPaisa, 267205000);
    assert.equal(detail.order.status, "received");
  });

  it("applies the customer's per-litre discount to the rate", async () => {
    const result = await createOrder(
      parseInput(orderSchema, {
        customerId: "2",
        siteId: "",
        deliveryAddress: "Shop 4, Main Market",
        deliveryDate: today,
        windowStart: "",
        windowEnd: "",
        source: "whatsapp",
        litresPMG: "",
        litresHSD: "",
        litresHOBC: "1000",
        notes: "Weekly top-up",
      }),
      ACTOR,
    );

    orderB = result.id;
    const detail = await getOrderDetail(orderB);
    assert.equal(detail.items[0].ratePaisa, 34800, "HOBC list rate 350.00 less Rs. 2.00 discount");
    assert.equal(detail.order.estimatedPaisa, 34800000);
  });

  it("refuses to confirm over the credit limit without an approval note", async () => {
    await assertShopError(() => confirmOrder({ orderId: orderB, overrideNote: "" }, ACTOR), /credit limit/, "credit_limit");

    try {
      await confirmOrder({ orderId: orderB, overrideNote: "" }, ACTOR);
      assert.fail("expected the credit limit check to fail");
    } catch (error) {
      assert.match(error.fieldErrors.overrideNote, /approval reason/);
    }
  });

  it("confirms within the limit, and over it with an approval note that is kept", async () => {
    await confirmOrder({ orderId: orderA, overrideNote: "" }, ACTOR);
    assert.equal((await getOrderDetail(orderA)).order.status, "confirmed");

    await confirmOrder({ orderId: orderB, overrideNote: "Owner guarantees payment on Friday" }, ACTOR);
    const detail = await getOrderDetail(orderB);
    assert.equal(detail.order.status, "confirmed");
    assert.match(detail.order.creditOverrideNote, /Owner guarantees payment on Friday/);
  });

  it("lists orders in the queue with a status filter", async () => {
    const queue = await listOrderQueue({ status: "confirmed" });
    assert.equal(queue.total, 2);
    assert.equal((await listOrderQueue({ status: "bogus" })).total, 2, "unknown status falls back to all orders");
  });
});

describe("dispatch, delivery and stock", () => {
  let dispatchA;
  let orderD;

  it("loads an order from depot tanks and reduces stock", async () => {
    dispatchA = await dispatchOrder(
      parseInput(dispatchSchema, {
        orderId: "1",
        depotId: String(await depotIdByCode("DAU")),
        vehicleNo: "lea-1234",
        driverName: "Imran",
        driverPhone: "0300 1112223",
        sealNumbers: "S-1001, S-1002",
      }),
      ACTOR,
    );

    assert.equal(dispatchA.message, "DN-000001 dispatched for ORD-000001.");
    assert.equal((await scalar("SELECT vehicle_no FROM shop.deliveries WHERE id = $1", dispatchA.id)).vehicleNo, "LEA-1234");
    assert.equal((await getInventoryOverview()).tanks.find((tank) => tank.name === "PMG-1").bookLitres, 55000);
    assert.equal((await getInventoryOverview()).tanks.find((tank) => tank.name === "HSD-1").bookLitres, 58000);
    assert.equal((await getOrderDetail(1)).order.status, "dispatched");
  });

  it("refuses to load more than the depot holds, and writes nothing", async () => {
    const result = await createOrder(
      parseInput(orderSchema, {
        customerId: "1",
        siteId: "",
        deliveryAddress: "Plot 12, Sector 5, Karachi",
        deliveryDate: today,
        windowStart: "",
        windowEnd: "",
        source: "phone",
        litresPMG: "",
        litresHSD: "60000",
        litresHOBC: "",
        notes: "",
      }),
      ACTOR,
    );
    orderD = result.id;

    await confirmOrder({ orderId: orderD, overrideNote: "Large tanker order, approved by owner" }, ACTOR);
    await assertShopError(
      async () =>
        dispatchOrder(
          parseInput(dispatchSchema, { orderId: String(orderD), depotId: String(await depotIdByCode("DAU")), vehicleNo: "LEA-9999", driverName: "", driverPhone: "", sealNumbers: "" }),
          ACTOR,
        ),
      /2,000 litres short/,
      "stock",
    );

    assert.equal((await getOrderDetail(orderD)).order.status, "confirmed");
    assert.equal((await getInventoryOverview()).tanks.find((tank) => tank.name === "HSD-1").bookLitres, 58000);
  });

  it("cancels an order that was never dispatched", async () => {
    await cancelOrder({ orderId: orderD, reason: "Customer reduced the quantity" }, ACTOR);
    assert.equal((await getOrderDetail(orderD)).order.status, "cancelled");
    await assertShopError(() => cancelOrder({ orderId: 1, reason: "Too late" }, ACTOR), /cannot be cancelled/);
  });

  it("completes a delivery and returns any shortfall to the depot", async () => {
    await completeDelivery(
      parseInput(deliverySchema, {
        deliveryId: String(dispatchA.id),
        deliveredOn: today,
        deliveredPMG: "5000",
        deliveredHSD: "1990",
        deliveredHOBC: "",
      }),
      ACTOR,
    );

    assert.equal((await getInventoryOverview()).tanks.find((tank) => tank.name === "HSD-1").bookLitres, 58010, "10 litres returned");
    assert.equal((await getOrderDetail(1)).order.status, "delivered");
    assert.equal((await getDeliveryDetail(dispatchA.id)).delivery.status, "delivered");
    await assertShopError(
      () => completeDelivery(parseInput(deliverySchema, { deliveryId: String(dispatchA.id), deliveredOn: today, deliveredPMG: "0", deliveredHSD: "0", deliveredHOBC: "0" }), ACTOR),
      /already marked as delivered/,
    );
  });

  it("shows the dispatch board", async () => {
    const board = await getDispatchBoard();
    assert.equal(board.inTransit.length, 0);
    assert.equal(board.recentlyDelivered.length, 1);
    assert.equal(board.awaiting.length, 1, "order B is confirmed and waiting to load");
  });
});

describe("invoices and payments", () => {
  it("invoices only what was delivered, after delivery", async () => {
    await assertShopError(() => createInvoiceFromOrder({ orderId: 2 }, ACTOR), /issued after delivery/);

    const invoice = await createInvoiceFromOrder({ orderId: 1 }, ACTOR);
    assert.equal(invoice.invoiceNo, `LP/${fy}/0001`);

    const detail = await getInvoiceDetail(invoice.id);
    assert.equal(detail.invoice.totalPaisa, 266813250, "5,000 L at 377.71 plus 1,990 L at 391.75");
    assert.equal(detail.invoice.totalLitres, 6990);
    assert.equal(detail.invoice.paymentState, "unpaid");
    assert.equal(detail.lines.length, 2);
    assert.equal(await getCustomerBalance(1), 266813250);

    await assertShopError(() => createInvoiceFromOrder({ orderId: 1 }, ACTOR), /already invoiced/);
  });

  it("applies a payment to the oldest invoice first", async () => {
    const payment = await recordPayment(
      parseInput(paymentSchema, {
        customerId: "1",
        amount: "1000000",
        method: "bank_transfer",
        reference: "IBFT-778812",
        bankName: "HBL",
        receivedOn: today,
        notes: "",
      }),
      ACTOR,
    );

    assert.equal(payment.receiptNo, "RCT-000001");
    assert.equal((await getInvoiceDetail(1)).invoice.outstandingPaisa, 166813250);
    assert.equal((await getInvoiceDetail(1)).invoice.paymentState, "partial");
  });

  it("holds money paid before an invoice exists as an advance", async () => {
    const result = await recordPayment(
      parseInput(paymentSchema, { customerId: "2", amount: "50000", method: "cash", reference: "", bankName: "", receivedOn: today, notes: "" }),
      ACTOR,
    );

    assert.match(result.message, /held as advance/);
    const aging = await getAgingReport(today);
    assert.equal(aging.rows.find((row) => row.customerId === 2).advancePaisa, 5000000);
    assert.equal(await getCustomerBalance(2), -5000000);
  });

  it("applies an advance to the next invoice automatically", async () => {
    await dispatchOrder(
      parseInput(dispatchSchema, { orderId: "2", depotId: String(await depotIdByCode("DAU")), vehicleNo: "LEA-2222", driverName: "", driverPhone: "", sealNumbers: "" }),
      ACTOR,
    );
    await completeDelivery(parseInput(deliverySchema, { deliveryId: "2", deliveredOn: today, deliveredPMG: "", deliveredHSD: "", deliveredHOBC: "1000" }), ACTOR);

    const invoice = await createInvoiceFromOrder({ orderId: 2 }, ACTOR);
    assert.equal(invoice.invoiceNo, `LP/${fy}/0002`);
    const detail = await getInvoiceDetail(invoice.id);
    assert.equal(detail.invoice.totalPaisa, 34800000);
    assert.equal(detail.invoice.outstandingPaisa, 29800000, "Rs. 50,000 advance applied");
    assert.equal(await getCustomerBalance(2), 29800000);
  });

  it("allocates a later payment across two invoices, oldest first", async () => {
    await createOrderAndDeliver({ customerId: "1", litresPMG: "1000" });
    const invoice = await createInvoiceFromOrder({ orderId: 4 }, ACTOR);
    assert.equal(invoice.invoiceNo, `LP/${fy}/0003`);

    await recordPayment(parseInput(paymentSchema, { customerId: "1", amount: "2000000", method: "online", reference: "", bankName: "", receivedOn: today, notes: "" }), ACTOR);

    const first = (await getInvoiceDetail(1)).invoice;
    const second = (await getInvoiceDetail(invoice.id)).invoice;
    assert.equal(first.paymentState, "paid");
    assert.equal(second.paymentState, "partial");
    assert.equal(second.outstandingPaisa, 4584250);
    assert.equal(await getCustomerBalance(1), 4584250);
    await assertLedgerMatchesInvoices(1);
  });

  it("voids a payment so the invoices it paid are open again", async () => {
    const advance = (await scalar("SELECT id FROM shop.payments WHERE customer_id = 2 AND method = 'cash'")).id;
    await voidPayment({ paymentId: advance, reason: "Cash receipt entered twice" }, ACTOR);

    assert.equal((await getPaymentDetail(advance)).payment.status, "voided");
    assert.equal((await getInvoiceDetail(2)).invoice.outstandingPaisa, 34800000);
    assert.equal(await getCustomerBalance(2), 34800000);
    await assertLedgerMatchesInvoices(2);
  });

  it("cancels an invoice once its payments are voided, then re-invoices the order", async () => {
    const paidAfterVoid = (await getInvoiceDetail(2)).invoice;
    assert.equal(paidAfterVoid.paidPaisa, 0);

    await cancelInvoice({ invoiceId: 2, reason: "Wrong litres entered" }, ACTOR);
    assert.equal((await getInvoiceDetail(2)).invoice.status, "cancelled");
    assert.equal(await getCustomerBalance(2), 0);

    const reissued = await createInvoiceFromOrder({ orderId: 2 }, ACTOR);
    assert.equal(reissued.invoiceNo, `LP/${fy}/0004`);
    assert.equal(await getCustomerBalance(2), 34800000);
  });

  it("refuses to cancel an invoice while payments are applied to it", async () => {
    await assertShopError(() => cancelInvoice({ invoiceId: 1, reason: "Test" }, ACTOR), /Void those payments/);
  });
});

describe("ledger, aging and statements", () => {
  it("reconciles the statement, the aging report and the customer balance", async () => {
    const statement = await getStatement(1, {});
    assert.equal(statement.debitPaisa, 304584250, "two invoices");
    assert.equal(statement.creditPaisa, 300000000, "two payments");
    assert.equal(statement.closingPaisa, 4584250);
    assert.equal(await getCustomerBalance(1), statement.closingPaisa);

    const aging = await getAgingReport(today);
    const dealerRow = aging.rows.find((row) => row.customerId === 1);
    assert.equal(dealerRow.outstandingPaisa, 4584250);
    assert.equal(dealerRow.buckets.current, 4584250, "due in 7 days, so not yet overdue");
    assert.equal(aging.totals.outstandingPaisa, aging.rows.reduce((sum, row) => sum + row.outstandingPaisa, 0));
  });

  it("buckets overdue invoices by days past due", async () => {
    const futureToday = addDays(today, 40);
    const aging = await getAgingReport(futureToday);
    const dealerRow = aging.rows.find((row) => row.customerId === 1);
    assert.equal(dealerRow.buckets.current, 0);
    assert.equal(dealerRow.buckets["31-60"], 4584250, "invoice due 7 days from today is 33 days overdue on day 40");
  });

  it("keeps the ledger equal to open invoices less advances for every customer", async () => {
    await assertLedgerMatchesInvoices(1);
    await assertLedgerMatchesInvoices(2);
  });
});

describe("settings, tax and reports", () => {
  it("applies saved tax settings to the next invoice", async () => {
    const settings = parseInput(settingsSchema, {
      companyName: "Lucky Petroleum Pvt. Limited",
      companyLegalName: "Lucky Petroleum Pvt. Limited",
      companyAddress: "Suite No. 308, The Forum, G-20, Block-9, Clifton, Karachi",
      companyPhone: "+92 334 7266695",
      companyOfficePhone: "021-35300031-35",
      companyEmail: "info@luckypetroleum.pk",
      companyNtn: "",
      companyStrn: "",
      companyWhatsapp: "0334 7266695",
      invoicePrefix: "lp",
      paymentTermsDays: "7",
      taxRateBps: "18",
      taxMode: "inclusive",
      invoiceFooter: "Thank you",
      bank1Name: "HBL",
      bank1Title: "Lucky Petroleum",
      bank1Account: "1234-5678",
      bank1Iban: "pk36 hbls 0000 0012 3456 7890",
      bank2Name: "",
      bank2Title: "",
      bank2Account: "",
      bank2Iban: "",
      varianceTolerancePercent: "0.5",
      lowStockPercent: "10",
    });
    assert.equal(settings.taxRateBps, 1800);
    assert.equal(settings.bank1Iban, "PK36HBLS0000001234567890");
    await saveSettings(settings, ACTOR);

    assert.equal((await getSettings()).billing.taxRateBps, 1800);
    await createOrderAndDeliver({ customerId: "1", litresPMG: "100" });
    const invoice = await createInvoiceFromOrder({ orderId: 5 }, ACTOR);
    const detail = (await getInvoiceDetail(invoice.id)).invoice;
    assert.equal(detail.totalPaisa, 3777100, "100 L at 377.71, tax included in the price");
    assert.equal(detail.subtotalPaisa, 3200932);
    assert.equal(detail.taxPaisa, 576168);
    assert.equal(detail.subtotalPaisa + detail.taxPaisa, detail.totalPaisa);
  });

  it("exposes a public view of an invoice only through its share token", async () => {
    const token = (await scalar("SELECT share_token FROM shop.invoices WHERE invoice_no = $1", `LP/${fy}/0001`)).shareToken;
    const view = await getPublicInvoice(token);
    assert.equal(view.invoice.invoiceNo, `LP/${fy}/0001`);
    assert.equal(view.bankAccounts.length, 1);
    assert.equal(view.invoice.createdBy, undefined, "internal fields are not exposed");

    assert.equal(await getPublicInvoice("short"), null);
    assert.equal(await getPublicInvoice("A".repeat(43)), null);
  });

  it("builds the dashboard and reports from the same figures", async () => {
    const dashboard = await getDashboard(today);
    assert.equal(dashboard.sales.today.invoices, 4, "four issued invoices today (one was cancelled)");
    assert.equal(dashboard.receivables.outstandingPaisa, (await getAgingReport(today)).totals.outstandingPaisa);
    assert.equal(dashboard.trend.length, 14);

    const { filename, csv } = await buildCsvExport("invoices", {});
    assert.match(filename, /^lucky-petroleum-invoices-/);
    assert.match(csv, /Invoice no/);
    assert.match(csv, new RegExp(`LP/${fy}/0001`));

    await assert.rejects(async () => buildCsvExport("nonsense", {}), /Unknown report/);
  });

  it("records every change in the audit log", async () => {
    const log = await getAuditLog({ page: 1 });
    assert.ok(log.total > 20, `expected many audit entries, found ${log.total}`);
    assert.ok(log.rows.some((row) => row.action === "invoice.issued"));
    assert.ok(log.rows.some((row) => row.action === "payment.voided"));
  });
});

describe("stock adjustments and blocked customers", () => {
  it("rejects receipts beyond tank capacity and posts an adjusted dip", async () => {
    await receiveStock(parseInput(receiptSchema, { tankId: String(await tankIdByName("HOBC-1")), litres: "31000", reference: "CH-1004", occurredOn: today }), ACTOR);
    assert.equal((await getInventoryOverview()).tanks.find((tank) => tank.name === "HOBC-1").bookLitres, 50000);

    const result = await recordDip(
      parseInput(dipSchema, { tankId: String(await tankIdByName("HSD-1")), measuredLitres: "58000", measuredOn: today, notes: "Morning dip", postAdjustment: "on" }),
      ACTOR,
    );
    assert.match(result.message, /Variance -10 litres and posted as an adjustment/);

    const history = await getTankHistory(await tankIdByName("HSD-1"));
    assert.equal(history.tank.bookLitres, 58000);
    assert.equal(history.dips[0].varianceLitres, -10);
    assert.equal(history.dips[0].adjusted, true);
  });

  it("refuses new orders for a blocked customer", async () => {
    await editCustomer(2, parseInput(customerSchema, { ...vendorInput, status: "blocked" }), ACTOR);
    await assertShopError(
      () =>
        createOrder(
          parseInput(orderSchema, {
            customerId: "2",
            siteId: "",
            deliveryAddress: "Shop 4, Main Market",
            deliveryDate: today,
            windowStart: "",
            windowEnd: "",
            source: "shop",
            litresPMG: "100",
            litresHSD: "",
            litresHOBC: "",
            notes: "",
          }),
          ACTOR,
        ),
      /blocked/,
    );

    const detail = await getCustomerDetail(2);
    assert.equal(detail.customer.status, "blocked");
    assert.equal(detail.balancePaisa, 34800000);
  });

  it("lists invoices with payment state filters", async () => {
    assert.equal((await listInvoices({ paymentState: "partial" })).total, 1);
    assert.equal((await listInvoices({ paymentState: "unpaid" })).total, 2);
    assert.equal((await listInvoices({ status: "cancelled" })).total, 1);
    assert.equal(await listPaymentsCount(), 2, "one advance voided; two posted receipts remain");
  });
});

async function listPaymentsCount() {
  return (await scalar("SELECT COUNT(*) AS total FROM shop.payments WHERE status = 'posted'")).total;
}

/** Test helper: places an order, confirms it, dispatches it and marks it delivered in full. */
async function createOrderAndDeliver({ customerId, litresPMG = "0", litresHSD = "0", litresHOBC = "0" }) {
  const order = await createOrder(
    parseInput(orderSchema, {
      customerId,
      siteId: "",
      deliveryAddress: "Plot 12, Sector 5, Karachi",
      deliveryDate: today,
      windowStart: "",
      windowEnd: "",
      source: "shop",
      litresPMG,
      litresHSD,
      litresHOBC,
      notes: "",
    }),
    ACTOR,
  );

  await confirmOrder({ orderId: order.id, overrideNote: "" }, ACTOR);
  const dispatch = await dispatchOrder(
    parseInput(dispatchSchema, { orderId: String(order.id), depotId: String(await depotIdByCode("DAU")), vehicleNo: "LEA-3333", driverName: "", driverPhone: "", sealNumbers: "" }),
    ACTOR,
  );
  const loaded = await scalar("SELECT id FROM shop.deliveries WHERE id = $1", dispatch.id);
  assert.ok(loaded, "delivery saved");

  await completeDelivery(
    parseInput(deliverySchema, {
      deliveryId: String(dispatch.id),
      deliveredOn: today,
      deliveredPMG: litresPMG,
      deliveredHSD: litresHSD,
      deliveredHOBC: litresHOBC,
    }),
    ACTOR,
  );
  return order.id;
}
