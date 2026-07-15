import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const { pathname, search } = req.nextUrl;

  const isAuthRoute = pathname.startsWith("/auth");

  // If on auth page
  if (isAuthRoute) {
    if (session) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Protect "/questions"
  if (pathname === "/questions") {
    if (!session) {
      const authUrl = new URL("/auth", req.url);
      authUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

      return NextResponse.redirect(authUrl);
    }
  }

  return NextResponse.next();
}