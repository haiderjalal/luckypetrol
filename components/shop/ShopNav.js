"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, SHOP_NAV_ITEMS } from "../../lib/shop/navigation.js";

export function ShopNav() {
  const pathname = usePathname();

  return (
    <nav className="shop-nav" aria-label="Shop sections">
      {SHOP_NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
