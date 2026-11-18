// Pure decision logic for the proxy session gate. No Next.js imports so it can
// be unit-tested in the node environment.

export type GateKind = "protected" | "login";

export type GateInput = {
  kind: GateKind;
  /** Access token present and not expired. */
  accessValid: boolean;
  hasRefreshToken: boolean;
  /** URL carries `?reason=expired` (prevents redirect loops on login pages). */
  reasonExpired: boolean;
  /** Protected routes only: redirect to login when there are no cookies at all. */
  redirectAnonymous: boolean;
};

export type RefreshResult = "ok" | "unauthorized" | "error";

export type GateDecision =
  | { type: "continue"; clearCookies?: boolean }
  | { type: "refresh" }
  | { type: "continueWithSession" }
  | { type: "redirectHome" }
  | { type: "redirectHomeWithSession" }
  | { type: "redirectLogin"; clearCookies: boolean; expired: boolean };

export function decideSessionGate(input: GateInput): GateDecision {
  const { kind, accessValid, hasRefreshToken, reasonExpired, redirectAnonymous } = input;

  if (kind === "login") {
    if (reasonExpired) return { type: "continue" };
    if (accessValid) return { type: "redirectHome" };
    return hasRefreshToken ? { type: "refresh" } : { type: "continue" };
  }

  if (accessValid) return { type: "continue" };
  if (hasRefreshToken) return { type: "refresh" };
  return redirectAnonymous
    ? { type: "redirectLogin", clearCookies: false, expired: false }
    : { type: "continue" };
}

export function decideAfterRefresh(kind: GateKind, result: RefreshResult): GateDecision {
  if (result === "ok") {
    return kind === "login"
      ? { type: "redirectHomeWithSession" }
      : { type: "continueWithSession" };
  }
  if (result === "unauthorized") {
    return kind === "login"
      ? { type: "continue", clearCookies: true }
      : { type: "redirectLogin", clearCookies: true, expired: true };
  }
  return { type: "continue" };
}
