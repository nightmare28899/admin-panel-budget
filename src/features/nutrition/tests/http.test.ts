import { describe, expect, it } from "vitest";
import { isSameOrigin, uploadErrorResponse } from "../nutrition.http";

const req = (headers: Record<string, string>) =>
  new Request("http://internal:3000/api/nutrition/diet-files", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("accepts an origin matching the host", () =>
    expect(isSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true));
  it("prefers the forwarded host", () =>
    expect(
      isSameOrigin(
        req({ origin: "https://app.example.com", host: "internal:3000", "x-forwarded-host": "app.example.com" }),
      ),
    ).toBe(true));
  it("rejects missing, foreign or malformed origins", () => {
    expect(isSameOrigin(req({ host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "https://evil.com", host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "null", host: "localhost:3000" }))).toBe(false);
  });
});

describe("uploadErrorResponse", () => {
  it.each([
    [400, 400],
    [401, 401],
    [404, 404],
    [413, 413],
    [429, 429],
    [500, 502],
  ])("maps backend %i to %i", (backend, expected) =>
    expect(uploadErrorResponse(backend).status).toBe(expected));
});
