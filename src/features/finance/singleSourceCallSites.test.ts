import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guard for the "no duplicate requests" rule: shared endpoints may only be
 * called from their single owner, everything else must read FinanceContext.
 */
const ROOT = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(ROOT);
const callers = (identifier: string) =>
  files
    .filter((file) => new RegExp(`\\b${identifier}\\b`).test(readFileSync(file, "utf8")))
    .map((file) => file.slice(ROOT.length + 1))
    .filter((file) => file !== "lib/userActions.ts");

describe("single owner per shared endpoint", () => {
  it("overview is requested only by FinanceContext", () => {
    expect(callers("getCreditCardsOverviewAction")).toEqual(["features/finance/FinanceContext.tsx"]);
  });

  it("subscriptions list is requested only by FinanceContext", () => {
    expect(callers("getSubscriptionsAction")).toEqual(["features/finance/FinanceContext.tsx"]);
  });

  it("the separate cards list is not requested at all (derived from the overview)", () => {
    expect(callers("getCreditCardsAction")).toEqual([]);
  });

  it("client code never refetches /me (the finance layout resolves it once)", () => {
    expect(callers("getUserMeAction")).toEqual([]);
  });

  it("the card-change event is always referenced through its constant", () => {
    const literal = files.filter((file) => /["'`]CREDIT_CARDS_CHANGED["'`]/.test(readFileSync(file, "utf8")));
    expect(literal).toEqual([]);
  });
});
