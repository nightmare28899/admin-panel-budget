/** Same-origin check for browser-initiated POSTs, honoring reverse-proxy host headers. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

const UPLOAD_ERRORS: Record<number, [number, string]> = {
  400: [400, "The original must be a valid JPG, PNG or PDF up to 5 MiB."],
  401: [401, "Your session expired. Sign in again."],
  404: [404, "Diet unavailable."],
  413: [413, "Upload exceeds the 5 MiB limit."],
  429: [429, "Too many uploads. Wait a minute and try again."],
};

/** Maps a backend upload failure status to a safe, generic client response. */
export function uploadErrorResponse(backendStatus: number): Response {
  const [status, error] = UPLOAD_ERRORS[backendStatus] ?? [
    502,
    "Upload failed. Try again in a moment.",
  ];
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

const IMPORT_ERRORS: Record<number, [number, string]> = {
  400: [400, "Attach 1 to 3 JPG, PNG or WebP photos, or a single PDF."],
  401: [401, "Your session expired. Sign in again."],
  413: [413, "A photo must be up to 5 MiB and a PDF up to 10 MiB."],
  422: [422, "Could not read a diet from this file."],
  429: [429, "Too many imports. Wait a few minutes and try again."],
  503: [503, "Diet import is not available right now."],
};

/** Maps a backend diet-import failure status to a safe, generic client response. */
export function importErrorResponse(backendStatus: number): Response {
  const [status, error] = IMPORT_ERRORS[backendStatus] ?? [502, "Diet import failed. Try again in a moment."];
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

const SUGGESTION_ERRORS: Record<number, [number, string]> = {
  400: [400, "Choose a valid diet option."],
  401: [401, "Your session expired. Sign in again."],
  404: [404, "Diet option unavailable."],
  422: [422, "The AI could not create dishes for this option."],
  429: [429, "Too many requests. Wait a few minutes and try again."],
  503: [503, "Dish generation is not available right now."],
};

/** Maps a backend recipe-suggestion failure status to a safe, generic client response. */
export function suggestionsErrorResponse(backendStatus: number): Response {
  const [status, error] = SUGGESTION_ERRORS[backendStatus] ?? [
    502,
    "Dish generation failed. Try again in a moment.",
  ];
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}
