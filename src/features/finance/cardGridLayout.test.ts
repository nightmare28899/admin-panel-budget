import { describe, expect, it } from "vitest";
import { cardGridClass } from "./cardGridLayout";

describe("cardGridClass", () => {
  it("keeps a single card narrow instead of stretching it", () => {
    expect(cardGridClass(1)).toContain("max-w-md");
    expect(cardGridClass(1)).not.toMatch(/grid-cols/);
  });

  it("uses two columns for two cards", () => {
    expect(cardGridClass(2)).toContain("sm:grid-cols-2");
    expect(cardGridClass(2)).not.toContain("lg:grid-cols-3");
  });

  it("never leaves a lone card under three on a row for four cards", () => {
    const classes = cardGridClass(4);
    expect(classes).toContain("sm:grid-cols-2");
    expect(classes).toContain("2xl:grid-cols-4");
    expect(classes).not.toContain("lg:grid-cols-3");
  });

  it("fills rows of three for three and six cards", () => {
    expect(cardGridClass(3)).toContain("lg:grid-cols-3");
    expect(cardGridClass(6)).toContain("lg:grid-cols-3");
  });

  it("keeps rows of four for eight cards on very wide screens", () => {
    expect(cardGridClass(8)).toContain("2xl:grid-cols-4");
  });
});
