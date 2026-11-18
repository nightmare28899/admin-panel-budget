import { describe, expect, it } from "vitest";
import { formatRailBadge, isNavItemActive, resolveCurrentPageLabel, toRailItems } from "./railNav";

const items = [
  { label: "Expenses", href: "/finance/expenses" },
  { label: "Cards", href: "/finance/cards", badge: 3, matchNested: true },
  { label: "Pending", href: "/finance/pending", badge: 0 },
  { label: "Settings", href: null, soon: true },
];

describe("isNavItemActive", () => {
  it("matches the exact path", () => {
    expect(isNavItemActive("/finance/expenses", items[0])).toBe(true);
  });
  it("ignores nested paths unless matchNested is set", () => {
    expect(isNavItemActive("/finance/expenses/1", items[0])).toBe(false);
    expect(isNavItemActive("/finance/cards/42", items[1])).toBe(true);
  });
  it("does not match sibling prefixes", () => {
    expect(isNavItemActive("/finance/cards-old", items[1])).toBe(false);
  });
  it("is never active without an href", () => {
    expect(isNavItemActive("/anything", items[3])).toBe(false);
  });
});

describe("formatRailBadge", () => {
  it("returns null when there is no count", () => {
    expect(formatRailBadge(undefined)).toBeNull();
  });
  it("uses the zero tone for 0", () => {
    expect(formatRailBadge(0)).toEqual({ text: "0", tone: "zero" });
  });
  it("uses the pending tone for positive counts", () => {
    expect(formatRailBadge(7)).toEqual({ text: "7", tone: "pending" });
  });
  it("caps large counts", () => {
    expect(formatRailBadge(150)).toEqual({ text: "99+", tone: "pending" });
  });
  it("treats negative or non-finite counts as no badge", () => {
    expect(formatRailBadge(-1)).toBeNull();
    expect(formatRailBadge(Number.NaN)).toBeNull();
  });
});

describe("toRailItems", () => {
  const rail = toRailItems(items, "/finance/cards/9", "Soon");
  it("flags the active item", () => {
    expect(rail.map((entry) => entry.active)).toEqual([false, true, false, false]);
  });
  it("marks href-less items disabled", () => {
    expect(rail[3].disabled).toBe(true);
    expect(rail[0].disabled).toBe(false);
  });
  it("builds the accessible name with count and soon suffix", () => {
    expect(rail[0].tooltip).toBe("Expenses");
    expect(rail[1].tooltip).toBe("Cards (3)");
    expect(rail[3].tooltip).toBe("Settings — Soon");
  });
  it("attaches badge descriptors", () => {
    expect(rail[1].badge).toEqual({ text: "3", tone: "pending" });
    expect(rail[2].badge).toEqual({ text: "0", tone: "zero" });
    expect(rail[0].badge).toBeNull();
  });
});

describe("resolveCurrentPageLabel", () => {
  it("prefers an explicit page title", () => {
    expect(resolveCurrentPageLabel("/x", items, { "/x": "Custom" }, "Default")).toBe("Custom");
  });
  it("falls back to the active nav item label", () => {
    expect(resolveCurrentPageLabel("/finance/cards/5", items, undefined, "Default")).toBe("Cards");
  });
  it("falls back to the default title, then undefined", () => {
    expect(resolveCurrentPageLabel("/nope", items, undefined, "Default")).toBe("Default");
    expect(resolveCurrentPageLabel("/nope", items)).toBeUndefined();
  });
});
