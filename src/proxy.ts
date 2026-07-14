import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hashPassword } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const path = nextUrl.pathname;

  // Check authentication only on /admin paths
  if (path.startsWith("/admin")) {
    const sessionCookie = cookies.get("svj_admin_session")?.value;
    const adminPassword = process.env.ADMIN_PASSWORD || "super-secret-password";
    const expectedHash = await hashPassword(adminPassword);

    if (!sessionCookie || sessionCookie !== expectedHash) {
      // Redirect to the login page
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Only match the admin panel and its sub-pages
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
