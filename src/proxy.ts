import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hashPassword } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const path = nextUrl.pathname;

  const adminPassword = process.env.ADMIN_PASSWORD || "12345678";
  const portalPassword = process.env.PORTAL_PASSWORD || "12345678";

  const expectedAdminHash = await hashPassword(adminPassword);
  const expectedPortalHash = await hashPassword(portalPassword);

  const adminSession = cookies.get("svj_admin_session")?.value;
  const portalSession = cookies.get("svj_portal_session")?.value;

  const isAdminAuthenticated = adminSession === expectedAdminHash;
  const isPortalAuthenticated = portalSession === expectedPortalHash || isAdminAuthenticated;

  // Check authentication for admin panel paths
  if (path.startsWith("/admin")) {
    if (!isAdminAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("admin", "1");
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // For the home page and all other pages, require portal or admin access
    if (!isPortalAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Protect all routes except API, static assets, favicon, and the login page
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login).*)",
  ],
};
