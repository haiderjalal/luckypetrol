// Sidebar structure for the shop. Kept separate so it can be used by client and server components alike.

export const SHOP_NAV_ITEMS = [
  { href: "/shop", label: "Dashboard" },
  { href: "/shop/orders", label: "Orders" },
  { href: "/shop/deliveries", label: "Dispatch" },
  { href: "/shop/invoices", label: "Invoices" },
  { href: "/shop/payments", label: "Payments" },
  { href: "/shop/ledger", label: "Ledger and aging" },
  { href: "/shop/customers", label: "Customers" },
  { href: "/shop/inventory", label: "Depots and stock" },
  { href: "/shop/prices", label: "Rate card" },
  { href: "/shop/reports", label: "Reports" },
  { href: "/shop/settings", label: "Settings" },
  { href: "/shop/audit", label: "Audit log" },
];

/** The dashboard is active only on its exact path; other sections also match their sub-pages. */
export function isActivePath(pathname, href) {
  if (href === "/shop") {
    return pathname === "/shop";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
