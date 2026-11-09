import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/clients",
  "/pipeline",
  "/deals",
  "/tasks",
  "/invoices",
  "/activity",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (protectedPath && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
