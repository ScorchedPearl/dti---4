import { NextResponse, type NextRequest } from "next/server";

// Cheap cookie presence check so signed-out visitors land on the right login page.
// Every API handler still validates the session itself.
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p.startsWith("/app") && p !== "/app/login" && !req.cookies.has("arrive_student")) {
    return NextResponse.redirect(new URL("/app/login", req.url));
  }
  if (p.startsWith("/staff") && p !== "/staff/login" && !req.cookies.has("arrive_staff")) {
    return NextResponse.redirect(new URL("/staff/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/staff/:path*"] };
