// Pure business rules: money, dates, totals, phone numbers, CSV, sessions and login throttling.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { toCsv } from "../lib/shop/csv.js";
import {
  addDays,
  agingBucket,
  daysBetween,
  fiscalYearLabel,
  fiscalYearStart,
  formatDate,
  isIsoDate,
  monthStart,
  todayIso,
} from "../lib/shop/dates.js";
import { amountInWords, formatLitres, formatPaisa, parseLitres, parseRupeesToPaisa } from "../lib/shop/money.js";
import { normalisePakistaniMobile, formatMobileForDisplay } from "../lib/shop/phone.js";
import { lockoutMinutes } from "../lib/shop/rateLimit.js";
import { createSessionToken, verifySessionToken } from "../lib/shop/session.js";
import { basisPointsToPercent, computeInvoiceTotals, percentToBasisPoints } from "../lib/shop/totals.js";
import { buildWhatsAppLink } from "../lib/shop/whatsapp.js";

describe("money", () => {
  it("parses rupee amounts into whole paisa without floating-point error", () => {
    assert.equal(parseRupeesToPaisa("377.71"), 37771);
    assert.equal(parseRupeesToPaisa("1,234.5"), 123450);
    assert.equal(parseRupeesToPaisa("Rs. 350"), 35000);
    assert.equal(parseRupeesToPaisa(391.75), 39175);
    assert.equal(parseRupeesToPaisa("0"), 0);
  });

  it("rejects negative, over-precise, empty and non-numeric amounts", () => {
    for (const bad of ["-3", "1.234", "abc", "", "1e5", "12.3.4"]) {
      assert.equal(parseRupeesToPaisa(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
    }
  });

  it("parses litres as whole numbers only", () => {
    assert.equal(parseLitres("5,000"), 5000);
    assert.equal(parseLitres("0"), 0);
    assert.equal(parseLitres("5.5"), null);
    assert.equal(parseLitres("-1"), null);
    assert.equal(parseLitres(""), null);
  });

  it("formats amounts with Pakistani lakh grouping", () => {
    assert.equal(formatPaisa(123456789), "12,34,567.89");
    assert.equal(formatPaisa(100000), "1,000.00");
    assert.equal(formatPaisa(-250), "-2.50");
    assert.equal(formatLitres(5000), "5,000");
    assert.equal(formatLitres(1234567), "12,34,567");
  });

  it("spells out amounts for invoices", () => {
    assert.equal(amountInWords(0), "Rupees Zero Only");
    assert.equal(amountInWords(500000), "Rupees Five Thousand Only");
    assert.equal(amountInWords(12345678), "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paisa Only");
    assert.equal(amountInWords(1000000000), "Rupees One Crore Only");
  });
});

describe("dates", () => {
  it("returns today as YYYY-MM-DD in Pakistan time", () => {
    assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
    // 2026-11-20 23:30 UTC is already 2026-11-21 in Karachi (UTC+5).
    assert.equal(todayIso(new Date("2026-11-20T23:30:00Z")), "2026-11-21");
  });

  it("validates ISO dates, including leap years", () => {
    assert.equal(isIsoDate("2026-02-29"), false);
    assert.equal(isIsoDate("2028-02-29"), true);
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("21/11/2026"), false);
  });

  it("calculates days, due dates and month boundaries", () => {
    assert.equal(addDays("2026-11-30", 7), "2026-12-07");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(daysBetween("2026-11-01", "2026-11-21"), 20);
    assert.equal(monthStart("2026-11-21"), "2026-11-01");
    assert.equal(formatDate("2026-11-05"), "5 Nov 2026");
  });

  it("uses the Pakistan financial year (July to June)", () => {
    assert.equal(fiscalYearLabel("2026-06-30"), "2025-26");
    assert.equal(fiscalYearLabel("2026-07-01"), "2026-27");
    assert.equal(fiscalYearStart("2026-11-21"), "2026-07-01");
  });

  it("puts overdue days into aging buckets", () => {
    assert.equal(agingBucket(-5), "current");
    assert.equal(agingBucket(0), "current");
    assert.equal(agingBucket(1), "1-30");
    assert.equal(agingBucket(30), "1-30");
    assert.equal(agingBucket(31), "31-60");
    assert.equal(agingBucket(61), "61-90");
    assert.equal(agingBucket(91), "90+");
  });
});

describe("invoice totals", () => {
  it("backs sales tax out of inclusive prices", () => {
    assert.deepEqual(computeInvoiceTotals({ linesTotalPaisa: 1180000, taxMode: "inclusive", taxRateBps: 1800 }), {
      subtotalPaisa: 1000000,
      taxPaisa: 180000,
      totalPaisa: 1180000,
    });
  });

  it("adds sales tax on top of exclusive prices", () => {
    assert.deepEqual(computeInvoiceTotals({ linesTotalPaisa: 1000000, taxMode: "exclusive", taxRateBps: 1800 }), {
      subtotalPaisa: 1000000,
      taxPaisa: 180000,
      totalPaisa: 1180000,
    });
  });

  it("charges no tax at 0%", () => {
    assert.deepEqual(computeInvoiceTotals({ linesTotalPaisa: 3777100, taxMode: "inclusive", taxRateBps: 0 }), {
      subtotalPaisa: 3777100,
      taxPaisa: 0,
      totalPaisa: 3777100,
    });
  });

  it("keeps subtotal plus tax equal to the total for inclusive prices that do not divide evenly", () => {
    const totals = computeInvoiceTotals({ linesTotalPaisa: 3777100, taxMode: "inclusive", taxRateBps: 1800 });
    assert.equal(totals.subtotalPaisa + totals.taxPaisa, totals.totalPaisa);
    assert.equal(totals.subtotalPaisa, 3200932);
    assert.equal(totals.taxPaisa, 576168);
  });

  it("refuses rates and modes it does not understand", () => {
    assert.throws(() => computeInvoiceTotals({ linesTotalPaisa: 100, taxMode: "inclusive", taxRateBps: 6000 }), RangeError);
    assert.throws(() => computeInvoiceTotals({ linesTotalPaisa: 100, taxMode: "other", taxRateBps: 100 }), RangeError);
  });

  it("converts percentages to basis points and back", () => {
    assert.equal(percentToBasisPoints("18"), 1800);
    assert.equal(percentToBasisPoints("17.5"), 1750);
    assert.equal(percentToBasisPoints("51"), null);
    assert.equal(percentToBasisPoints("18.123"), null);
    assert.equal(basisPointsToPercent(1800), "18");
    assert.equal(basisPointsToPercent(1750), "17.5");
    assert.equal(basisPointsToPercent(0), "0");
  });
});

describe("phone numbers", () => {
  it("normalises Pakistani mobile numbers to 92XXXXXXXXXX", () => {
    assert.equal(normalisePakistaniMobile("0334 7266695"), "923347266695");
    assert.equal(normalisePakistaniMobile("+92 334-7266695"), "923347266695");
    assert.equal(normalisePakistaniMobile("00923347266695"), "923347266695");
    assert.equal(normalisePakistaniMobile("3347266695"), "923347266695");
  });

  it("rejects numbers that are not Pakistani mobiles", () => {
    assert.equal(normalisePakistaniMobile("0321"), null);
    assert.equal(normalisePakistaniMobile("021-35300031"), null);
    assert.equal(normalisePakistaniMobile("+44 7700 900123"), null);
  });

  it("formats digits for display", () => {
    assert.equal(formatMobileForDisplay("923347266695"), "+92 334 7266695");
  });

  it("builds click-to-chat links with the message encoded", () => {
    assert.equal(buildWhatsAppLink("923347266695", "Hi there & welcome"), "https://wa.me/923347266695?text=Hi%20there%20%26%20welcome");
  });
});

describe("CSV export", () => {
  it("writes a UTF-8 byte-order mark and escapes commas, quotes and formulas", () => {
    const csv = toCsv(["Name", "Amount"], [
      ["=HYPERLINK(\"x\")", 12.5],
      ['Dealer, "Alpha"', null],
      ["-5", -3],
    ]);

    assert.equal(csv.charCodeAt(0), 0xfeff);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    assert.equal(lines[0], "Name,Amount");
    assert.equal(lines[1], "\"'=HYPERLINK(\"\"x\"\")\",12.5");
    assert.equal(lines[2], "\"Dealer, \"\"Alpha\"\"\",");
    assert.equal(lines[3], "'-5,-3");
  });
});

describe("sessions and login throttling", () => {
  const secret = "s".repeat(40);

  it("accepts a fresh token and returns the username", async () => {
    const token = await createSessionToken({ username: "lucky petroleum", secret });
    const session = await verifySessionToken(token, secret);
    assert.equal(session?.username, "lucky petroleum");
  });

  it("rejects tampered, foreign and expired tokens", async () => {
    const token = await createSessionToken({ username: "lucky petroleum", secret });
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    assert.equal(await verifySessionToken(tampered, secret), null);
    assert.equal(await verifySessionToken(token, "t".repeat(40)), null);
    assert.equal(await verifySessionToken(token, secret, Date.now() + 13 * 60 * 60 * 1000), null);
    assert.equal(await verifySessionToken("not-a-token", secret), null);
    assert.equal(await verifySessionToken(undefined, secret), null);
  });

  it("locks a client out after five failures and releases it after the window", () => {
    const start = Date.parse("2026-11-21T08:00:00Z");
    const failures = [0, 1, 2, 3, 4].map((attempt) => start + attempt * 1000);

    assert.ok(lockoutMinutes(failures, start + 5000) > 0);
    assert.equal(lockoutMinutes(failures, start + 16 * 60 * 1000), 0);
  });
});
