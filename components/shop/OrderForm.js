"use client";

import { useState } from "react";

import { joinAddress } from "../../lib/shop/address.js";
import { ORDER_SOURCE_LABELS, PRODUCT_CODES, PRODUCT_LABELS } from "../../lib/shop/constants.js";
import { formatLitres, formatRupees, parseLitres } from "../../lib/shop/money.js";
import { filterOptions } from "../../lib/shop/presentation.js";

import { ActionForm } from "./ActionForm.js";
import { Field } from "./Field.js";

const EMPTY_LITRES = { PMG: "", HSD: "", HOBC: "" };

function addressOf(customer) {
  return customer ? joinAddress(customer.address, customer.city) : "";
}

/**
 * New-order form. Picking a customer loads their delivery sites and discount, and the estimate updates as litres are typed.
 * The server recalculates everything on submit; the estimate here is for the person taking the order.
 * @param {{ action: Function, customers: object[], rates: Record<string, number | null>, today: string, initialCustomerId?: string }} props
 */
export function OrderForm({ action, customers, rates, today, initialCustomerId = "" }) {
  const initialCustomer = customers.find((customer) => String(customer.id) === initialCustomerId) ?? null;
  const [customerId, setCustomerId] = useState(initialCustomer ? String(initialCustomer.id) : "");
  const [siteId, setSiteId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(addressOf(initialCustomer));
  const [litres, setLitres] = useState(EMPTY_LITRES);

  const customer = customers.find((item) => String(item.id) === customerId) ?? null;
  const site = customer?.sites.find((item) => String(item.id) === siteId) ?? null;
  const discountPaisa = customer?.discountPerLitrePaisa ?? 0;

  const lines = PRODUCT_CODES.map((code) => {
    const quantity = parseLitres(litres[code]) ?? 0;
    const listRate = rates[code] ?? null;
    const netRate = listRate === null ? null : Math.max(0, listRate - discountPaisa);
    return { code, quantity, listRate, netRate, amountPaisa: netRate === null ? 0 : quantity * netRate };
  });

  const totalLitres = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalPaisa = lines.reduce((sum, line) => sum + line.amountPaisa, 0);
  const missingRate = lines.some((line) => line.quantity > 0 && line.listRate === null);

  const customerOptions = [
    { value: "", label: "Choose a customer" },
    ...customers.map((item) => ({ value: String(item.id), label: `${item.name} (${item.code})` })),
  ];
  const siteOptions = [
    { value: "", label: "Customer's address" },
    ...(customer?.sites ?? []).map((item) => ({ value: String(item.id), label: `${item.label}, ${joinAddress(item.address, item.city)}` })),
  ];

  function handleCustomerChange(value) {
    const next = customers.find((item) => String(item.id) === value) ?? null;
    setCustomerId(value);
    setSiteId("");
    setDeliveryAddress(addressOf(next));
  }

  function handleLitresChange(code, value) {
    setLitres((current) => ({ ...current, [code]: value }));
  }

  return (
    <ActionForm action={action} submitLabel="Take order" pendingLabel="Saving order…" className="shop-form">
      <div className="shop-form__grid">
        <fieldset className="shop-fieldset shop-form__wide">
          <legend>Customer and delivery</legend>
          <Field
            name="customerId"
            label="Customer"
            as="select"
            required
            options={customerOptions}
            value={customerId}
            onChange={(event) => handleCustomerChange(event.target.value)}
          />
          <Field
            name="siteId"
            label="Delivery site"
            as="select"
            options={siteOptions}
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            hint={customer && customer.sites.length === 0 ? "This customer has no saved sites. Enter an address below." : "Pick a saved site, or deliver to the address below."}
            disabled={!customer}
          />
          <Field
            name="deliveryAddress"
            label="Delivery address"
            as="textarea"
            rows={2}
            className="shop-form__wide"
            value={site ? joinAddress(site.address, site.city) : deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            disabled={Boolean(site)}
            hint={site ? "Using the selected site address." : "Required when no saved site is chosen."}
          />
          <Field name="deliveryDate" label="Delivery date" type="date" required min={today} defaultValue={today} />
          <Field name="windowStart" label="Window from" type="time" hint="Optional" />
          <Field name="windowEnd" label="Window to" type="time" hint="Optional" />
          <Field name="source" label="Order came by" as="select" options={filterOptions(ORDER_SOURCE_LABELS, "Choose").slice(1)} defaultValue="shop" />
        </fieldset>

        <fieldset className="shop-fieldset shop-form__wide">
          <legend>Litres</legend>
          {PRODUCT_CODES.map((code) => (
            <Field
              key={code}
              name={`litres${code}`}
              label={`${PRODUCT_LABELS[code]}, litres`}
              inputMode="numeric"
              placeholder="0"
              value={litres[code]}
              onChange={(event) => handleLitresChange(code, event.target.value)}
              hint={rates[code] ? `Rate ${formatRupees(Math.max(0, rates[code] - discountPaisa))} per litre` : "No rate set for today"}
            />
          ))}
          <Field name="notes" label="Notes for the depot or driver" as="textarea" rows={2} className="shop-form__wide" />
        </fieldset>
      </div>

      <section className="shop-card shop-form__wide" aria-live="polite" aria-labelledby="estimate-title">
        <h2 id="estimate-title" style={{ marginBottom: ".75rem" }}>
          Estimate
        </h2>
        <div className="shop-table-wrap" style={{ border: 0 }}>
          <table className="shop-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" className="num">
                  Litres
                </th>
                <th scope="col" className="num">
                  Rate (Rs/L)
                </th>
                <th scope="col" className="num">
                  Value (Rs)
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.code}>
                  <td>{PRODUCT_LABELS[line.code]}</td>
                  <td className="num">{formatLitres(line.quantity)}</td>
                  <td className="num">{line.netRate === null ? "—" : (line.netRate / 100).toFixed(2)}</td>
                  <td className="num">{(line.amountPaisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num">{formatLitres(totalLitres)}</td>
                <td />
                <td className="num">{(totalPaisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="shop-muted" style={{ marginTop: ".6rem", fontSize: ".88rem" }}>
          {discountPaisa > 0 ? `Includes the customer's discount of ${formatRupees(discountPaisa)} per litre. ` : ""}
          The value is an estimate at today&apos;s rates. The invoice uses the rates in force on the invoice date.
        </p>
        {missingRate ? (
          <p className="shop-field__error" role="alert" style={{ marginTop: ".5rem" }}>
            Today&apos;s rate is missing for a product you have entered. Set the rate card before taking this order.
          </p>
        ) : null}
      </section>
    </ActionForm>
  );
}
