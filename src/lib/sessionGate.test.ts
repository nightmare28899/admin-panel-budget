import { describe, expect, it } from "vitest";
import { decideAfterRefresh, decideSessionGate } from "./sessionGate";

const base = {
  kind: "protected" as const,
  accessValid: false,
  hasRefreshToken: false,
  reasonExpired: false,
  redirectAnonymous: true,
};

describe("decideSessionGate", () => {
  it("lets a valid token through on a protected route", () => {
    expect(decideSessionGate({ ...base, accessValid: true })).toEqual({ type: "continue" });
  });

  it("redirects a valid token on the login page to home", () => {
    expect(decideSessionGate({ ...base, kind: "login", accessValid: true })).toEqual({
      type: "redirectHome",
    });
  });

  it("requests a refresh when expired and a refresh cookie exists", () => {
    expect(decideSessionGate({ ...base, hasRefreshToken: true })).toEqual({ type: "refresh" });
    expect(decideSessionGate({ ...base, kind: "login", hasRefreshToken: true })).toEqual({
      type: "refresh",
    });
  });

  it("passes through on the login page without cookies", () => {
    expect(decideSessionGate({ ...base, kind: "login" })).toEqual({ type: "continue" });
  });

  it("passes through on the login page with reason=expired, even with a valid token", () => {
    expect(
      decideSessionGate({ ...base, kind: "login", reasonExpired: true, accessValid: true }),
    ).toEqual({ type: "continue" });
    expect(
      decideSessionGate({ ...base, kind: "login", reasonExpired: true, hasRefreshToken: true }),
    ).toEqual({ type: "continue" });
  });

  it("redirects anonymous visitors of protected routes to login when configured", () => {
    expect(decideSessionGate(base)).toEqual({ type: "redirectLogin", clearCookies: false, expired: false });
  });

  it("lets anonymous visitors through when redirectAnonymous is off", () => {
    expect(decideSessionGate({ ...base, redirectAnonymous: false })).toEqual({ type: "continue" });
  });
});

describe("decideAfterRefresh", () => {
  it("continues with new cookies on a protected route", () => {
    expect(decideAfterRefresh("protected", "ok")).toEqual({ type: "continueWithSession" });
  });

  it("redirects home with new cookies on the login page", () => {
    expect(decideAfterRefresh("login", "ok")).toEqual({ type: "redirectHomeWithSession" });
  });

  it("clears cookies and redirects with reason=expired on 401 from a protected route", () => {
    expect(decideAfterRefresh("protected", "unauthorized")).toEqual({
      type: "redirectLogin",
      clearCookies: true,
      expired: true,
    });
  });

  it("clears cookies and stays on the login page on 401", () => {
    expect(decideAfterRefresh("login", "unauthorized")).toEqual({
      type: "continue",
      clearCookies: true,
    });
  });

  it("passes through on transient errors", () => {
    expect(decideAfterRefresh("protected", "error")).toEqual({ type: "continue" });
    expect(decideAfterRefresh("login", "error")).toEqual({ type: "continue" });
  });
});
