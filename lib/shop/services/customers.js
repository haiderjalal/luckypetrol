import { CUSTOMER_STATUS_LABELS, CUSTOMER_TYPE_LABELS } from "../constants.js";
import { currentDb, transaction } from "../db.js";
import { ShopError, notFoundError } from "../errors.js";
import { nextCustomerCode } from "../numbering.js";
import { pageCount, paginate } from "../pagination.js";
import { cleanSearch, pickAllowed } from "../query.js";
import { openInvoicesForCustomer } from "../repositories/invoices.js";
import {
  findCustomerById,
  findCustomerByName,
  findSiteById,
  insertCustomer,
  insertSite,
  listActiveSites,
  listCustomers,
  listOrderableCustomers,
  listSitesForCustomer,
  setSiteActive,
  updateCustomer as updateCustomerRow,
} from "../repositories/customers.js";
import { listOrders, openOrderExposurePaisa } from "../repositories/orders.js";
import { listPaymentRows } from "../repositories/payments.js";
import { nullable } from "../repositories/rows.js";
import { recordAudit } from "./audit.js";
import { getCustomerBalance } from "./ledger.js";

// [stored field, form field, label used in the audit trail]
const TRACKED_FIELDS = [
  ["name", "name", "name"],
  ["customerType", "customerType", "customer type"],
  ["status", "status", "status"],
  ["creditLimitPaisa", "creditLimit", "credit limit"],
  ["discountPerLitrePaisa", "discount", "discount per litre"],
  ["paymentTermsDays", "paymentTermsDays", "payment terms"],
];

function customerColumns(input) {
  return {
    name: input.name,
    customer_type: input.customerType,
    status: input.status,
    contact_person: nullable(input.contactPerson),
    phone: nullable(input.phone),
    whatsapp: nullable(input.whatsapp),
    email: nullable(input.email),
    address: nullable(input.address),
    city: nullable(input.city),
    ntn: nullable(input.ntn),
    strn: nullable(input.strn),
    credit_limit_paisa: input.creditLimit,
    payment_terms_days: input.paymentTermsDays,
    discount_per_litre_paisa: input.discount,
    notes: nullable(input.notes),
  };
}

async function assertNameIsFree(db, name, customerId) {
  const existing = await findCustomerByName(db, name);
  if (existing && existing.id !== customerId) {
    throw new ShopError(`${existing.code} is already called "${existing.name}". Use a different name.`, {
      fieldErrors: { name: "Another customer already uses this name." },
    });
  }
}

function describeChanges(existing, input) {
  return TRACKED_FIELDS.filter(([storedKey, formKey]) => existing[storedKey] !== input[formKey]).map(([, , label]) => label);
}

export async function listCustomerDirectory(filters = {}) {
  const db = currentDb();
  const paging = paginate(filters.page);
  const { rows, total } = await listCustomers(db, {
    search: cleanSearch(filters.search),
    customerType: pickAllowed(filters.customerType, CUSTOMER_TYPE_LABELS),
    status: pickAllowed(filters.status, CUSTOMER_STATUS_LABELS),
    limit: paging.limit,
    offset: paging.offset,
  });

  return { rows, total, page: paging.page, pageCount: pageCount(total) };
}

export async function getCustomerDetail(customerId) {
  const db = currentDb();
  const customer = await findCustomerById(db, customerId);
  if (!customer) {
    throw notFoundError("Customer");
  }

  const balancePaisa = await getCustomerBalance(customerId);
  const openOrdersPaisa = await openOrderExposurePaisa(db, customerId);

  return {
    customer,
    sites: await listSitesForCustomer(db, customerId),
    balancePaisa,
    openOrdersPaisa,
    creditAvailablePaisa: customer.creditLimitPaisa - balancePaisa - openOrdersPaisa,
    openInvoices: await openInvoicesForCustomer(db, customerId),
    recentOrders: (await listOrders(db, { customerId, limit: 8, offset: 0 })).rows,
    recentPayments: (await listPaymentRows(db, { customerId, limit: 8, offset: 0 })).rows,
  };
}

export async function createCustomer(input, actor) {
  return transaction(async (db) => {
    await assertNameIsFree(db, input.name, null);
    const code = await nextCustomerCode(db);
    const id = await insertCustomer(db, { code, ...customerColumns(input), created_by: actor });

    await recordAudit(db, {
      actor,
      action: "customer.created",
      entityType: "customer",
      entityId: id,
      summary: `Added ${code} ${input.name}`,
    });

    return { message: `${input.name} added as ${code}.`, redirectTo: `/shop/customers/${id}` };
  });
}

export async function editCustomer(customerId, input, actor) {
  return transaction(async (db) => {
    const existing = await findCustomerById(db, customerId);
    if (!existing) {
      throw notFoundError("Customer");
    }

    await assertNameIsFree(db, input.name, customerId);
    const changes = describeChanges(existing, input);
    await updateCustomerRow(db, customerId, customerColumns(input));

    if (changes.length > 0) {
      await recordAudit(db, {
        actor,
        action: "customer.updated",
        entityType: "customer",
        entityId: customerId,
        summary: `${existing.code}: changed ${changes.join(", ")}`,
      });
    }

    return { message: "Customer details saved.", redirectTo: `/shop/customers/${customerId}` };
  });
}

export async function addCustomerSite(input, actor) {
  return transaction(async (db) => {
    const customer = await findCustomerById(db, input.customerId);
    if (!customer) {
      throw notFoundError("Customer");
    }

    const siteId = await insertSite(db, {
      customer_id: customer.id,
      label: input.label,
      address: input.address,
      city: nullable(input.city),
      contact_name: nullable(input.contactName),
      contact_phone: nullable(input.contactPhone),
      is_active: true,
    });

    await recordAudit(db, {
      actor,
      action: "customer.site_added",
      entityType: "customer",
      entityId: customer.id,
      summary: `${customer.code}: added delivery site "${input.label}"`,
    });

    return { message: `Delivery site "${input.label}" added.`, redirectTo: `/shop/customers/${customer.id}` };
  });
}

export async function setCustomerSiteActive(input, actor) {
  return transaction(async (db) => {
    const site = await findSiteById(db, input.siteId);
    if (!site) {
      throw notFoundError("Delivery site");
    }

    await setSiteActive(db, site.id, input.active);
    await recordAudit(db, {
      actor,
      action: input.active ? "customer.site_enabled" : "customer.site_disabled",
      entityType: "customer",
      entityId: site.customerId,
      summary: `Delivery site "${site.label}" ${input.active ? "enabled" : "disabled"}`,
    });

    return { message: `Delivery site "${site.label}" ${input.active ? "enabled" : "disabled"}.` };
  });
}

/** Active customers with their active delivery sites, for the order form's pickers. */
/** Every customer, for pickers such as the payment form. */
export async function getCustomerOptions() {
  const db = currentDb();
  const { rows } = await listCustomers(db, { limit: 2000, offset: 0 });
  return rows.map((customer) => ({
    id: customer.id,
    code: customer.code,
    name: customer.name,
    status: customer.status,
  }));
}

export async function getOrderFormOptions() {
  const db = currentDb();
  const sitesByCustomer = new Map();

  for (const site of await listActiveSites(db)) {
    const sites = sitesByCustomer.get(site.customerId) ?? [];
    sites.push({ id: site.id, label: site.label, address: site.address, city: site.city ?? "" });
    sitesByCustomer.set(site.customerId, sites);
  }

  const customers = await listOrderableCustomers(db);
  return customers.map((customer) => ({
    id: customer.id,
    code: customer.code,
    name: customer.name,
    typeLabel: CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType,
    creditLimitPaisa: customer.creditLimitPaisa,
    discountPerLitrePaisa: customer.discountPerLitrePaisa,
    address: customer.address ?? "",
    city: customer.city ?? "",
    sites: sitesByCustomer.get(customer.id) ?? [],
  }));
}
