import { NextResponse, type NextRequest } from "next/server";

// Firebase Authentication runs in the browser. We intentionally keep the
// Next.js middleware lightweight so it remains compatible with Vercel's
// Edge runtime. Server-side authorization for sensitive admin/scoring APIs
// should be enforced with Firebase Admin in Route Handlers.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
