import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/app/shop/_actions/auth.js";
import { brand } from "@/lib/images.js";

import { ActionButton } from "./ActionButton.js";
import { ShopNav } from "./ShopNav.js";

/** Sidebar and content frame for every signed-in shop page. */
export default function ShopShell({ username, children }) {
  return (
    <div className="shop-root">
      <aside className="shop-sidebar">
        <Link href="/shop" className="shop-sidebar__brand" aria-label="Lucky Petroleum shop dashboard">
          <Image src={brand.logo.src} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} />
        </Link>
        <ShopNav />
        <div className="shop-sidebar__foot">
          <p className="shop-muted" style={{ color: "rgba(237,237,237,.6)", fontSize: ".8rem", margin: "0 0 .5rem .25rem" }}>
            Signed in as {username}
          </p>
          <ActionButton action={logoutAction} label="Sign out" variant="sidebar" />
        </div>
      </aside>
      <div className="shop-main">{children}</div>
    </div>
  );
}
