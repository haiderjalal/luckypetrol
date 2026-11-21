import { redirect } from "next/navigation";

import ShopShell from "@/components/shop/ShopShell.js";
import { getSignedInUser } from "@/lib/shop/session-guard.js";

export const dynamic = "force-dynamic";

/** Every signed-in page sits inside this layout. Middleware checks the cookie; this check is the second line of defence. */
export default async function PanelLayout({ children }) {
  const user = await getSignedInUser();
  if (!user) {
    redirect("/shop/login");
  }

  return <ShopShell username={user.username}>{children}</ShopShell>;
}
