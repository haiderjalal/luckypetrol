import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { joinAddress } from "../lib/shop/address.js";

describe("delivery addresses", () => {
  it("adds the city when the street address does not mention it", () => {
    assert.equal(joinAddress("Plot 12, Sector 5", "Karachi"), "Plot 12, Sector 5, Karachi");
  });

  it("does not repeat the city when the address already names it", () => {
    assert.equal(joinAddress("Plot 12, Sector 5, Karachi", "Karachi"), "Plot 12, Sector 5, Karachi");
    assert.equal(joinAddress("plot 12, karachi", "KARACHI"), "plot 12, karachi");
  });

  it("handles missing parts", () => {
    assert.equal(joinAddress("Plot 12", ""), "Plot 12");
    assert.equal(joinAddress("", "Karachi"), "Karachi");
    assert.equal(joinAddress(undefined, null), "");
  });
});
