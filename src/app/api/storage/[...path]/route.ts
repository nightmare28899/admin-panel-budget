import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

// The backend returns storage asset URLs (e.g. avatars) as paths relative to
// its own origin, like "/api/storage/avatars/x.jpg". That only loads directly
// in production, where the frontend and backend share one origin — locally
// (and the backend's own Cross-Origin-Resource-Policy header) the browser
// blocks a cross-origin <img> request to it. Proxying the fetch through our
// own server (not subject to browser CORP/CORS rules) keeps every request
// same-origin from the browser's perspective, in dev and in production alike.
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "https://app.kevinlg.cloud";
  }
})();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstream = `${API_ORIGIN}/api/storage/${path.map(encodeURIComponent).join("/")}`;

  const upstreamRes = await fetch(upstream, { cache: "no-store" });
  if (!upstreamRes.ok || !upstreamRes.body) {
    return new NextResponse(null, { status: upstreamRes.status });
  }

  const headers = new Headers();
  const contentType = upstreamRes.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=3600");

  return new NextResponse(upstreamRes.body, { status: 200, headers });
}
