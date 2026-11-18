import { describe, expect, it } from "vitest";
import { nextRadioIndex } from "./radioNavigation";

describe("nextRadioIndex", () => {
  it("moves forward with ArrowRight/ArrowDown and wraps", () => {
    expect(nextRadioIndex(0, "ArrowRight", 2)).toBe(1);
    expect(nextRadioIndex(1, "ArrowDown", 2)).toBe(0);
  });

  it("moves backward with ArrowLeft/ArrowUp and wraps", () => {
    expect(nextRadioIndex(1, "ArrowLeft", 3)).toBe(0);
    expect(nextRadioIndex(0, "ArrowUp", 3)).toBe(2);
  });

  it("jumps to the ends with Home/End", () => {
    expect(nextRadioIndex(1, "Home", 3)).toBe(0);
    expect(nextRadioIndex(0, "End", 3)).toBe(2);
  });

  it("ignores other keys and empty groups", () => {
    expect(nextRadioIndex(0, "Enter", 3)).toBeNull();
    expect(nextRadioIndex(0, "ArrowRight", 0)).toBeNull();
  });
});
