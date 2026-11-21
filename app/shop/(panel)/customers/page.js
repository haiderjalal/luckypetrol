import Link from "next/link";

import EmptyState from "@/components/shop/EmptyState.js";
import FilterBar from "@/components/shop/FilterBar.js";
import Pagination from "@/components/shop/Pagination.js";
import PageHeader from "@/components/shop/PageHeader.js";
import StatusBadge from "@/components/shop/StatusBadge.js";
import { CUSTOMER_STATUS_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/shop/constants.js";
import { formatMobileForDisplay } from "@/lib/shop/phone.js";
import { formatRupees } from "@/lib/shop/money.js";
import { CUSTOMER_STATUS_TONE, filterOptions, toneFor } from "@/lib/shop/presentation.js";
import { readParam } from "@/lib/shop/query.js";
import { listCustomerDirectory } from "@/lib/shop/services/customers.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers",
};

export default async function CustomersPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    customerType: readParam(params.type),
    status: readParam(params.status),
    page: readParam(params.page),
  };
  const result = await listCustomerDirectory(filters);
  const query = { search: filters.search, type: filters.customerType, status: filters.status };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Dealers, vendors, banks, restaurants, fast-food outlets and other business customers, with their credit terms and delivery sites."
        actions={
          <Link className="shop-button" href="/shop/customers/new">
            Add customer
          </Link>
        }
      />

      <FilterBar clearHref="/shop/customers">
        <div className="shop-field">
          <label htmlFor="search">Search</label>
          <input id="search" name="search" defaultValue={filters.search} placeholder="Name, code, city or phone" />
        </div>
        <div className="shop-field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={filters.customerType}>
            {filterOptions(CUSTOMER_TYPE_LABELS, "All types").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="shop-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status}>
            {filterOptions(CUSTOMER_STATUS_LABELS, "All statuses").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {result.rows.length === 0 ? (
        <EmptyState title="No customers match.">
          Try a different search, or{" "}
          <Link href="/shop/customers/new" style={{ fontWeight: 700 }}>
            add a new customer
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="shop-table-wrap">
          <table className="shop-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Business</th>
                <th scope="col">Type</th>
                <th scope="col">Contact</th>
                <th scope="col">City</th>
                <th scope="col" className="num">
                  Credit limit (Rs)
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((customer) => (
                <tr key={customer.id}>
                  <td className="shop-num">{customer.code}</td>
                  <td>
                    <Link href={`/shop/customers/${customer.id}`}>{customer.name}</Link>
                    {customer.contactPerson ? <div className="shop-muted">{customer.contactPerson}</div> : null}
                  </td>
                  <td>{CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType}</td>
                  <td>
                    {customer.whatsapp ? formatMobileForDisplay(customer.whatsapp) : customer.phone ?? <span className="shop-muted">None</span>}
                  </td>
                  <td>{customer.city ?? ""}</td>
                  <td className="num">{formatRupees(customer.creditLimitPaisa).replace("Rs. ", "")}</td>
                  <td>
                    <StatusBadge tone={toneFor(CUSTOMER_STATUS_TONE, customer.status)}>{CUSTOMER_STATUS_LABELS[customer.status]}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/shop/customers" query={query} />
    </>
  );
}
