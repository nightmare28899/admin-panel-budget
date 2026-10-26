import { describe, expect, it } from "vitest";
import { applyCardOrder, buildFullOrder, moveCard, shiftCard } from "./cardOrder";

describe("moveCard", () => {
  const ids = ["a", "b", "c", "d"];
  it("drops the card before the target when moving forward", () => {
    expect(moveCard(ids, "a", "c")).toEqual(["b", "a", "c", "d"]);
  });
  it("drops the card before the target when moving backward", () => {
    expect(moveCard(ids, "d", "b")).toEqual(["a", "d", "b", "c"]);
  });
  it("is a no-op for the same or unknown ids", () => {
    expect(moveCard(ids, "b", "b")).toBe(ids);
    expect(moveCard(ids, "x", "b")).toBe(ids);
    expect(moveCard(ids, "b", "x")).toBe(ids);
  });
  it("does not mutate the input", () => {
    moveCard(ids, "a", "d");
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });
});

describe("shiftCard", () => {
  const ids = ["a", "b", "c"];
  it("moves by delta", () => {
    expect(shiftCard(ids, "a", 1)).toEqual(["b", "a", "c"]);
    expect(shiftCard(ids, "c", -1)).toEqual(["a", "c", "b"]);
  });
  it("is a no-op at the edges and for unknown ids", () => {
    expect(shiftCard(ids, "a", -1)).toBe(ids);
    expect(shiftCard(ids, "c", 1)).toBe(ids);
    expect(shiftCard(ids, "x", 1)).toBe(ids);
  });
});

describe("buildFullOrder", () => {
  it("puts the reordered visible ids first, then hidden ids in their current order", () => {
    expect(buildFullOrder(["a", "x", "b", "y", "c"], ["c", "a", "b"])).toEqual(["c", "a", "b", "x", "y"]);
  });
  it("ignores visible ids not in the full list", () => {
    expect(buildFullOrder(["a", "b"], ["b", "z", "a"])).toEqual(["b", "a"]);
  });
});

describe("applyCardOrder", () => {
  it("sorts items by ids, keeping unknown items at the end in their order", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "n" }, { id: "c" }];
    expect(applyCardOrder(items, ["c", "a", "b"]).map((i) => i.id)).toEqual(["c", "a", "b", "n"]);
  });
});
