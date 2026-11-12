import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split("/")[1];

  // An unsupported locale must reach the route's 404 instead of redirecting.
  if (/^[a-z]{2}$/.test(firstSegment) && !routing.locales.some((locale) => locale === firstSegment)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
