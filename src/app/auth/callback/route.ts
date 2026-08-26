import { NextResponse } from "next/server";

// Kept for backwards-compatible bookmarks. Firebase Google sign-in uses a
// popup in the browser, so no OAuth code exchange is needed here.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/daily`);
}
