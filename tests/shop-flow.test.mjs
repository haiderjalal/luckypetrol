// End-to-end shop flow against an in-memory database. Steps run in order and build on each other.
// Expected figures are worked out by hand from the rates set in step 1 (all amounts in paisa unless noted).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.SHOP_DB_PATH = ":memory:";

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
const { getDb } = await import("../lib/shop/db.js");
const { addDays, fiscalYearLabel, todayIso } = await import("../lib/shop/dates.js");

const ACTOR = "lucky petroleum";
const today = todayIso();
const fy = fiscalYearLabel(today);

const idFromRedirect = (result) => Number(result.redirectTo.split("/").pop());

function assertShopError(fn, messagePattern, code) {
  assert.throws(
    fn,
    (error) => error?.name === "ShopError" && messagePattern.test(error.message) && (code === undefined || error.code === code),
    `expected a ShopError matching ${messagePattern}`,
  );
}

function scalar(sql, ...params) {
  return getDb().prepare(sql).get(...params);
}

function tankIdByName(name) {
  return scalar("SELECT id FROM tanks WHERE name = ?", name).id;
}

function depotIdByCode(code) {
  return scalar("SELECT id FROM depots WHERE code = ?", code).id;
}

/** Ledger balance must equal open invoices minus advances held. This is the core accounting invariant. */
function assertLedgerMatchesInvoices(customerId) {
  const openInvoices = scalar(
    `SELECT COALESCE(SUM(i.total_paisa - COALESCE(a.paid, 0)), 0) AS value
     FROM invoices i
     LEFT JOIN (SELECT invoice_id, SUM(amount_paisa) AS paid FROM payment_allocations GROUP BY invoice_id) a ON a.invoice_id = i.id
     WHERE i.customer_id = ? AND i.status = 'issued'`,
    customerId,
  ).value;

  const advances = scalar(
    `SELECT COALESCE(SUM(p.amount_paisa - COALESCE(x.paid, 0)), 0) AS value
     FROM payments p
     LEFT JOIN (SELECT payment_id, SUM(amount_paisa) AS paid FROM payment_allocations GROUP BY payment_id) x ON x.payment_id = p.id
     WHERE p.customer_id = ? AND p.status = 'posted'`,
    customerId,
  ).value;

  assert.equal(getCustomerBalance(customerId), openInvoices - advances, `ledger should equal open invoices less advances for customer ${customerId}`);
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

describe("setup: rates, customers and depots", () => {
  it("sets today's rate card and refuses back-dated rates", () => {
    for (const [productCode, rate] of [["PMG", "377.71"], ["HSD", "391.75"], ["HOBC", "350"]]) {
      setRate(parseInput(rateSchema, { productCode, rate, effectiveFrom: today }), ACTOR);
    }

    const card = getRateCard(today).products;
    assert.deepEqual(
      card.map((row) => [row.productCode, row.ratePaisa]),
      [["PMG", 37771], ["HSD", 39175], ["HOBC", 35000]],
    );

    assertShopError(
      () => setRate(parseInput(rateSchema, { productCode: "PMG", rate: "380", effectiveFrom: addDays(today, -1) }), ACTOR),
      /back-dated/,
    );
  });

  it("validates customer forms before saving", () => {
    assertShopError(
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

  it("creates customers with codes and refuses duplicate names", () => {
    const dealer = createCustomer(parseInput(customerSchema, dealerInput), ACTOR);
    const vendor = createCustomer(parseInput(customerSchema, vendorInput), ACTOR);

    assert.equal(idFromRedirect(dealer), 1);
    assert.equal(idFromRedirect(vendor), 2);
    assert.equal(scalar("SELECT whatsapp FROM customers WHERE id = 2").whatsapp, "923001234567");

    assertShopError(
      () => createCustomer(parseInput(customerSchema, { ...dealerInput, name: "test dealer alpha" }), ACTOR),
      /already called/,
    );
  });

  it("adds a delivery site that appears in the order form", () => {
    addCustomerSite(
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

    const options = getOrderFormOptions();
    const dealer = options.find((customer) => customer.id === 1);
    assert.equal(dealer.sites.length, 1);
    assert.equal(dealer.sites[0].label, "Pump 1 Landhi");
  });

  it("sets up a depot with tanks and receives stock within capacity", () => {
    createDepot(parseInput(depotSchema, { code: "dau", name: "Daulatpur Depot", location: "Benazirabad" }), ACTOR);
    const depotId = depotIdByCode("DAU");
    assert.equal(depotId, 1);

    createTank(parseInput(tankSchema, { depotId: String(depotId), name: "PMG-1", productCode: "PMG", capacityLitres: "100000" }), ACTOR);
    createTank(parseInput(tankSchema, { depotId: String(depotId), name: "HSD-1", productCode: "HSD", capacityLitres: "100000" }), ACTOR);
    createTank(parseInput(tankSchema, { depotId: String(depotId), name: "HOBC-1", productCode: "HOBC", capacityLitres: "50000" }), ACTOR);

    receiveStock(parseInput(receiptSchema, { tankId: String(tankIdByName("PMG-1")), litres: "60000", reference: "CH-1001", occurredOn: today }), ACTOR);
    receiveStock(parseInput(receiptSchema, { tankId: String(tankIdByName("HSD-1")), litres: "60000", reference: "CH-1002", occurredOn: today }), ACTOR);
    receiveStock(parseInput(receiptSchema, { tankId: String(tankIdByName("HOBC-1")), litres: "20000", reference: "CH-1003", occurredOn: today }), ACTOR);

    const totals = Object.fromEntries(getInventoryOverview().productTotals.map((row) => [row.productCode, row.bookLitres]));
    assert.deepEqual(totals, { PMG: 60000, HSD: 60000, HOBC: 20000 });

    assertShopError(
      () => receiveStock(parseInput(receiptSchema, { tankId: String(tankIdByName("HOBC-1")), litres: "31001", reference: "", occurredOn: today }), ACTOR),
      /room for 30,000 more litres/,
    );
  });
});

describe("orders: credit control and confirmation", () => {
  let orderA;
  let orderB;

  it("prices an order at today's rates and records the estimate", () => {
    const result = createOrder(
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

    const detail = getOrderDetail(orderA);
    assert.equal(detail.order.totalLitres, 7000);
    // 5,000 x 377.71 + 2,000 x 391.75 = 2,67,20,500.00 (Rs.)
    assert.equal(detail.order.estimatedPaisa, 267205000);
    assert.equal(detail.order.status, "received");
  });

  it("applies the customer's per-litre discount to the rate", () => {
    const result = createOrder(
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
    const detail = getOrderDetail(orderB);
    assert.equal(detail.items[0].ratePaisa, 34800, "HOBC list rate 350.00 less Rs. 2.00 discount");
    assert.equal(detail.order.estimatedPaisa, 34800000);
  });

  it("refuses to confirm over the credit limit without an approval note", () => {
    assertShopError(() => confirmOrder({ orderId: orderB, overrideNote: "" }, ACTOR), /credit limit/, "credit_limit");

    try {
      confirmOrder({ orderId: orderB, overrideNote: "" }, ACTOR);
      assert.fail("expected the credit limit check to fail");
    } catch (error) {
      assert.match(error.fieldErrors.overrideNote, /approval reason/);
    }
  });

  it("confirms within the limit, and over it with an approval note that is kept", () => {
    confirmOrder({ orderId: orderA, overrideNote: "" }, ACTOR);
    assert.equal(getOrderDetail(orderA).order.status, "confirmed");

    confirmOrder({ orderId: orderB, overrideNote: "Owner guarantees payment on Friday" }, ACTOR);
    const detail = getOrderDetail(orderB);
    assert.equal(detail.order.status, "confirmed");
    assert.match(detail.order.creditOverrideNote, /Owner guarantees payment on Friday/);
  });

  it("lists orders in the queue with a status filter", () => {
    const queue = listOrderQueue({ status: "confirmed" });
    assert.equal(queue.total, 2);
    assert.equal(listOrderQueue({ status: "bogus" }).total, 2, "unknown status falls back to all orders");
  });
});

describe("dispatch, delivery and stock", () => {
  let dispatchA;
  let orderD;

  it("loads an order from depot tanks and reduces stock", () => {
    dispatchA = dispatchOrder(
      parseInput(dispatchSchema, {
        orderId: "1",
        depotId: String(depotIdByCode("DAU")),
        vehicleNo: "lea-1234",
        driverName: "Imran",
        driverPhone: "0300 1112223",
        sealNumbers: "S-1001, S-1002",
      }),
      ACTOR,
    );

    assert.equal(dispatchA.message, "DN-000001 dispatched for ORD-000001.");
    assert.equal(scalar("SELECT vehicle_no FROM deliveries WHERE id = ?", dispatchA.id).vehicle_no, "LEA-1234");
    assert.equal(getInventoryOverview().tanks.find((tank) => tank.name === "PMG-1").bookLitres, 55000);
    assert.equal(getInventoryOverview().tanks.find((tank) => tank.name === "HSD-1").bookLitres, 58000);
    assert.equal(getOrderDetail(1).order.status, "dispatched");
  });

  it("refuses to load more than the depot holds, and writes nothing", () => {
    const result = createOrder(
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

    confirmOrder({ orderId: orderD, overrideNote: "Large tanker order, approved by owner" }, ACTOR);
    assertShopError(
      () => dispatchOrder(parseInput(dispatchSchema, { orderId: String(orderD), depotId: String(depotIdByCode("DAU")), vehicleNo: "LEA-9999", driverName: "", driverPhone: "", sealNumbers: "" }), ACTOR),
      /2,000 litres short/,
      "stock",
    );

    assert.equal(getOrderDetail(orderD).order.status, "confirmed");
    assert.equal(getInventoryOverview().tanks.find((tank) => tank.name === "HSD-1").bookLitres, 58000);
  });

  it("cancels an order that was never dispatched", () => {
    cancelOrder({ orderId: orderD, reason: "Customer reduced the quantity" }, ACTOR);
    assert.equal(getOrderDetail(orderD).order.status, "cancelled");
    assertShopError(() => cancelOrder({ orderId: 1, reason: "Too late" }, ACTOR), /cannot be cancelled/);
  });

  it("completes a delivery and returns any shortfall to the depot", () => {
    completeDelivery(
      parseInput(deliverySchema, {
        deliveryId: String(dispatchA.id),
        deliveredOn: today,
        deliveredPMG: "5000",
        deliveredHSD: "1990",
        deliveredHOBC: "",
      }),
      ACTOR,
    );

    assert.equal(getInventoryOverview().tanks.find((tank) => tank.name === "HSD-1").bookLitres, 58010, "10 litres returned");
    assert.equal(getOrderDetail(1).order.status, "delivered");
    assert.equal(getDeliveryDetail(dispatchA.id).delivery.status, "delivered");
    assertShopError(
      () => completeDelivery(parseInput(deliverySchema, { deliveryId: String(dispatchA.id), deliveredOn: today, deliveredPMG: "0", deliveredHSD: "0", deliveredHOBC: "0" }), ACTOR),
      /already marked as delivered/,
    );
  });

  it("shows the dispatch board", () => {
    const board = getDispatchBoard();
    assert.equal(board.inTransit.length, 0);
    assert.equal(board.recentlyDelivered.length, 1);
    assert.equal(board.awaiting.length, 1, "order B is confirmed and waiting to load");
  });
});

describe("invoices and payments", () => {
  it("invoices only what was delivered, after delivery", () => {
    assertShopError(() => createInvoiceFromOrder({ orderId: 2 }, ACTOR), /issued after delivery/);

    const invoice = createInvoiceFromOrder({ orderId: 1 }, ACTOR);
    assert.equal(invoice.invoiceNo, `LP/${fy}/0001`);

    const detail = getInvoiceDetail(invoice.id);
    assert.equal(detail.invoice.totalPaisa, 266813250, "5,000 L at 377.71 plus 1,990 L at 391.75");
    assert.equal(detail.invoice.totalLitres, 6990);
    assert.equal(detail.invoice.paymentState, "unpaid");
    assert.equal(detail.lines.length, 2);
    assert.equal(getCustomerBalance(1), 266813250);

    assertShopError(() => createInvoiceFromOrder({ orderId: 1 }, ACTOR), /already invoiced/);
  });

  it("applies a payment to the oldest invoice first", () => {
    const payment = recordPayment(
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
    assert.equal(getInvoiceDetail(1).invoice.outstandingPaisa, 166813250);
    assert.equal(getInvoiceDetail(1).invoice.paymentState, "partial");
  });

  it("holds money paid before an invoice exists as an advance", () => {
    const result = recordPayment(
      parseInput(paymentSchema, { customerId: "2", amount: "50000", method: "cash", reference: "", bankName: "", receivedOn: today, notes: "" }),
      ACTOR,
    );

    assert.match(result.message, /held as advance/);
    const aging = getAgingReport(today);
    assert.equal(aging.rows.find((row) => row.customerId === 2).advancePaisa, 5000000);
    assert.equal(getCustomerBalance(2), -5000000);
  });

  it("applies an advance to the next invoice automatically", () => {
    dispatchOrder(parseInput(dispatchSchema, { orderId: "2", depotId: String(depotIdByCode("DAU")), vehicleNo: "LEA-2222", driverName: "", driverPhone: "", sealNumbers: "" }), ACTOR);
    completeDelivery(parseInput(deliverySchema, { deliveryId: "2", deliveredOn: today, deliveredPMG: "", deliveredHSD: "", deliveredHOBC: "1000" }), ACTOR);

    const invoice = createInvoiceFromOrder({ orderId: 2 }, ACTOR);
    assert.equal(invoice.invoiceNo, `LP/${fy}/0002`);
    const detail = getInvoiceDetail(invoice.id);
    assert.equal(detail.invoice.totalPaisa, 34800000);
    assert.equal(detail.invoice.outstandingPaisa, 29800000, "Rs. 50,000 advance applied");
    assert.equal(getCustomerBalance(2), 29800000);
  });

  it("allocates a later payment across two invoices, oldest first", () => {
    createOrderAndDeliver({ customerId: "1", litresPMG: "1000" });
    const invoice = createInvoiceFromOrder({ orderId: 4 }, ACTOR);
    assert.equal(invoice.invoiceNo, `LP/${fy}/0003`);

    recordPayment(parseInput(paymentSchema, { customerId: "1", amount: "2000000", method: "online", reference: "", bankName: "", receivedOn: today, notes: "" }), ACTOR);

    const first = getInvoiceDetail(1).invoice;
    const second = getInvoiceDetail(invoice.id).invoice;
    assert.equal(first.paymentState, "paid");
    assert.equal(second.paymentState, "partial");
    assert.equal(second.outstandingPaisa, 4584250);
    assert.equal(getCustomerBalance(1), 4584250);
    assertLedgerMatchesInvoices(1);
  });

  it("voids a payment so the invoices it paid are open again", () => {
    const advance = scalar("SELECT id FROM payments WHERE customer_id = 2 AND method = 'cash'").id;
    voidPayment({ paymentId: advance, reason: "Cash receipt entered twice" }, ACTOR);

    assert.equal(getPaymentDetail(advance).payment.status, "voided");
    assert.equal(getInvoiceDetail(2).invoice.outstandingPaisa, 34800000);
    assert.equal(getCustomerBalance(2), 34800000);
    assertLedgerMatchesInvoices(2);
  });

  it("cancels an invoice once its payments are voided, then re-invoices the order", () => {
    const paidAfterVoid = getInvoiceDetail(2).invoice;
    assert.equal(paidAfterVoid.paidPaisa, 0);

    cancelInvoice({ invoiceId: 2, reason: "Wrong litres entered" }, ACTOR);
    assert.equal(getInvoiceDetail(2).invoice.status, "cancelled");
    assert.equal(getCustomerBalance(2), 0);

    const reissued = createInvoiceFromOrder({ orderId: 2 }, ACTOR);
    assert.equal(reissued.invoiceNo, `LP/${fy}/0004`);
    assert.equal(getCustomerBalance(2), 34800000);
  });

  it("refuses to cancel an invoice while payments are applied to it", () => {
    assertShopError(() => cancelInvoice({ invoiceId: 1, reason: "Test" }, ACTOR), /Void those payments/);
  });
});

describe("ledger, aging and statements", () => {
  it("reconciles the statement, the aging report and the customer balance", () => {
    const statement = getStatement(1, {});
    assert.equal(statement.debitPaisa, 304584250, "two invoices");
    assert.equal(statement.creditPaisa, 300000000, "two payments");
    assert.equal(statement.closingPaisa, 4584250);
    assert.equal(getCustomerBalance(1), statement.closingPaisa);

    const aging = getAgingReport(today);
    const dealerRow = aging.rows.find((row) => row.customerId === 1);
    assert.equal(dealerRow.outstandingPaisa, 4584250);
    assert.equal(dealerRow.buckets.current, 4584250, "due in 7 days, so not yet overdue");
    assert.equal(aging.totals.outstandingPaisa, aging.rows.reduce((sum, row) => sum + row.outstandingPaisa, 0));
  });

  it("buckets overdue invoices by days past due", () => {
    const futureToday = addDays(today, 40);
    const aging = getAgingReport(futureToday);
    const dealerRow = aging.rows.find((row) => row.customerId === 1);
    assert.equal(dealerRow.buckets.current, 0);
    assert.equal(dealerRow.buckets["31-60"], 4584250, "invoice due 7 days from today is 33 days overdue on day 40");
  });

  it("keeps the ledger equal to open invoices less advances for every customer", () => {
    assertLedgerMatchesInvoices(1);
    assertLedgerMatchesInvoices(2);
  });
});

describe("settings, tax and reports", () => {
  it("applies saved tax settings to the next invoice", () => {
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
    saveSettings(settings, ACTOR);

    assert.equal(getSettings().billing.taxRateBps, 1800);
    createOrderAndDeliver({ customerId: "1", litresPMG: "100" });
    const invoice = createInvoiceFromOrder({ orderId: 5 }, ACTOR);
    const detail = getInvoiceDetail(invoice.id).invoice;
    assert.equal(detail.totalPaisa, 3777100, "100 L at 377.71, tax included in the price");
    assert.equal(detail.subtotalPaisa, 3200932);
    assert.equal(detail.taxPaisa, 576168);
    assert.equal(detail.subtotalPaisa + detail.taxPaisa, detail.totalPaisa);
  });

  it("exposes a public view of an invoice only through its share token", () => {
    const token = scalar("SELECT share_token FROM invoices WHERE invoice_no = ?", `LP/${fy}/0001`).share_token;
    const view = getPublicInvoice(token);
    assert.equal(view.invoice.invoiceNo, `LP/${fy}/0001`);
    assert.equal(view.bankAccounts.length, 1);
    assert.equal(view.invoice.createdBy, undefined, "internal fields are not exposed");

    assert.equal(getPublicInvoice("short"), null);
    assert.equal(getPublicInvoice("A".repeat(43)), null);
  });

  it("builds the dashboard and reports from the same figures", () => {
    const dashboard = getDashboard(today);
    assert.equal(dashboard.sales.today.invoices, 4, "four issued invoices today (one was cancelled)");
    assert.equal(dashboard.receivables.outstandingPaisa, getAgingReport(today).totals.outstandingPaisa);
    assert.equal(dashboard.trend.length, 14);

    const { filename, csv } = buildCsvExport("invoices", {});
    assert.match(filename, /^lucky-petroleum-invoices-/);
    assert.match(csv, /Invoice no/);
    assert.match(csv, new RegExp(`LP/${fy}/0001`));

    assert.throws(() => buildCsvExport("nonsense", {}), /Unknown report/);
  });

  it("records every change in the audit log", () => {
    const log = getAuditLog({ page: 1 });
    assert.ok(log.total > 20, `expected many audit entries, found ${log.total}`);
    assert.ok(log.rows.some((row) => row.action === "invoice.issued"));
    assert.ok(log.rows.some((row) => row.action === "payment.voided"));
  });
});

describe("stock adjustments and blocked customers", () => {
  it("rejects receipts beyond tank capacity and posts an adjusted dip", () => {
    receiveStock(parseInput(receiptSchema, { tankId: String(tankIdByName("HOBC-1")), litres: "31000", reference: "CH-1004", occurredOn: today }), ACTOR);
    assert.equal(getInventoryOverview().tanks.find((tank) => tank.name === "HOBC-1").bookLitres, 50000);

    const result = recordDip(
      parseInput(dipSchema, { tankId: String(tankIdByName("HSD-1")), measuredLitres: "58000", measuredOn: today, notes: "Morning dip", postAdjustment: "on" }),
      ACTOR,
    );
    assert.match(result.message, /Variance -10 litres and posted as an adjustment/);

    const history = getTankHistory(tankIdByName("HSD-1"));
    assert.equal(history.tank.bookLitres, 58000);
    assert.equal(history.dips[0].varianceLitres, -10);
    assert.equal(history.dips[0].adjusted, 1);
  });

  it("refuses new orders for a blocked customer", () => {
    editCustomer(2, parseInput(customerSchema, { ...vendorInput, status: "blocked" }), ACTOR);
    assertShopError(
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

    const detail = getCustomerDetail(2);
    assert.equal(detail.customer.status, "blocked");
    assert.equal(detail.balancePaisa, 34800000);
  });

  it("lists invoices with payment state filters", () => {
    assert.equal(listInvoices({ paymentState: "partial" }).total, 1);
    assert.equal(listInvoices({ paymentState: "unpaid" }).total, 2);
    assert.equal(listInvoices({ status: "cancelled" }).total, 1);
    assert.equal(listPaymentsCount(), 2, "one advance voided; two posted receipts remain");
  });
});

function listPaymentsCount() {
  return scalar("SELECT COUNT(*) AS total FROM payments WHERE status = 'posted'").total;
}

/** Test helper: places an order, confirms it, dispatches it and marks it delivered in full. */
function createOrderAndDeliver({ customerId, litresPMG = "0", litresHSD = "0", litresHOBC = "0" }) {
  const order = createOrder(
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

  confirmOrder({ orderId: order.id, overrideNote: "" }, ACTOR);
  const dispatch = dispatchOrder(
    parseInput(dispatchSchema, { orderId: String(order.id), depotId: String(depotIdByCode("DAU")), vehicleNo: "LEA-3333", driverName: "", driverPhone: "", sealNumbers: "" }),
    ACTOR,
  );
  const loaded = scalar("SELECT id FROM deliveries WHERE id = ?", dispatch.id);
  assert.ok(loaded, "delivery saved");

  completeDelivery(
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
