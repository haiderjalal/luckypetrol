import Image from "next/image";

import { loginAction } from "@/app/shop/_actions/auth.js";
import { LoginForm } from "@/components/shop/LoginForm.js";
import Notice from "@/components/shop/Notice.js";
import { brand } from "@/lib/images.js";
import { isShopConfigured } from "@/lib/shop/config.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function ShopLoginPage({ searchParams }) {
  const params = await searchParams;
  const nextPath = typeof params?.next === "string" && params.next.startsWith("/shop") ? params.next : "/shop";

  return (
    <main className="shop-login">
      <div className="shop-login__card">
        <Image src={brand.logo.src} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} className="shop-login__logo" priority />
        <h1>Internal sign-in</h1>
        <p className="shop-muted" style={{ margin: ".4rem 0 1.25rem" }}>
          For Lucky Petroleum staff only.
        </p>
        {isShopConfigured() ? null : (
          <Notice tone="error" title="Not configured.">
            Set SHOP_USERNAME, SHOP_PASSWORD and SHOP_SESSION_SECRET in .env.local, then restart the server.
          </Notice>
        )}
        <LoginForm action={loginAction} nextPath={nextPath} />
      </div>
    </main>
  );
}
