import { NextResponse } from "next/server";

import { getSessionSecret } from "./lib/shop/config.js";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/shop/session.js";

const SIGN_IN_PATH = "/shop/login";
const PUBLIC_SHARE_PREFIX = "/share/";

/**
 * The staff system keeps its data in a SQLite file, which needs a server with a writable disk.
 * Vercel does not provide one, so on Vercel the shop and its public invoice links are switched off
 * unless SHOP_ENABLED=true is set on purpose. Locally and on a self-hosted server they stay on.
 */
function isShopSwitchedOff() {
  return Boolean(process.env.VERCEL) && process.env.SHOP_ENABLED !== "true";
}

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Protects /shop pages and /api/shop routes. Everything except the sign-in page needs a valid session cookie.
 * Pages are sent to sign-in; API calls get a 401 JSON response. Public invoice links need no sign-in.
 */
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith(PUBLIC_SHARE_PREFIX)) {
    return isShopSwitchedOff() ? notFound() : NextResponse.next();
  }

  if (isShopSwitchedOff()) {
    return notFound();
  }

  if (pathname === SIGN_IN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token, getSessionSecret());
  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/shop")) {
    return NextResponse.json({ success: false, message: "Sign in to use this." }, { status: 401 });
  }

  const signInUrl = new URL(SIGN_IN_PATH, request.url);
  signInUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/shop/:path*", "/api/shop/:path*", "/share/:path*"],
};
