import { NextResponse } from "next/server";

import { getSessionSecret } from "./lib/shop/config.js";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/shop/session.js";

const SIGN_IN_PATH = "/shop/login";

/**
 * Protects /shop pages and /api/shop routes. Everything except the sign-in page needs a valid session cookie.
 * Pages are sent to sign-in; API calls get a 401 JSON response.
 */
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
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
  matcher: ["/shop/:path*", "/api/shop/:path*"],
};
