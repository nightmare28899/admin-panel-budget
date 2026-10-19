import { describe, expect, it } from "vitest";
import {
  CARD_STACK,
  clampIndex,
  stackHeight,
  stackSlot,
  stepIndex,
  visibleCount,
} from "./card-stack-layout";

describe("clampIndex / stepIndex", () => {
  it("clamps into [0, total-1] and tolerates empty lists", () => {
    expect(clampIndex(-3, 4)).toBe(0);
    expect(clampIndex(9, 4)).toBe(3);
    expect(clampIndex(2, 4)).toBe(2);
    expect(clampIndex(5, 0)).toBe(0);
  });
  it("steps without wrapping", () => {
    expect(stepIndex(0, 3, -1)).toBe(0);
    expect(stepIndex(2, 3, 1)).toBe(2);
    expect(stepIndex(1, 3, 1)).toBe(2);
    expect(stepIndex(1, 3, -1)).toBe(0);
  });
});

describe("visibleCount", () => {
  it("caps the collapsed stack at 3 cards", () => {
    expect(visibleCount(0)).toBe(0);
    expect(visibleCount(1)).toBe(1);
    expect(visibleCount(2)).toBe(2);
    expect(visibleCount(7)).toBe(3);
  });
});

describe("collapsed slots", () => {
  const opts = { total: 5, selected: 1, expanded: false };
  it("puts the selected card in front at full size, lowest in the stack", () => {
    const front = stackSlot(1, opts);
    expect(front).toMatchObject({ visible: true, depth: 0, scale: 1, opacity: 1 });
    expect(front.top).toBe(2 * CARD_STACK.peek);
  });
  it("peeks the next two cards 18px / 36px higher, smaller and fainter", () => {
    const a = stackSlot(2, opts);
    const b = stackSlot(3, opts);
    expect(a).toMatchObject({ visible: true, depth: 1, scale: 0.94 });
    expect(b).toMatchObject({ visible: true, depth: 2, scale: 0.88 });
    expect(a.top).toBe(CARD_STACK.peek);
    expect(b.top).toBe(0);
    expect(a.opacity).toBeLessThan(1);
    expect(b.opacity).toBeLessThan(a.opacity);
    expect(a.zIndex).toBeLessThan(stackSlot(1, opts).zIndex);
    expect(b.zIndex).toBeLessThan(a.zIndex);
  });
  it("wraps behind cards around the end of the list", () => {
    const o = { total: 4, selected: 3, expanded: false };
    expect(stackSlot(0, o).depth).toBe(1);
    expect(stackSlot(1, o).depth).toBe(2);
    expect(stackSlot(2, o).visible).toBe(false);
  });
  it("hides cards beyond the window", () => {
    expect(stackSlot(0, opts).visible).toBe(false);
    expect(stackSlot(4, opts).visible).toBe(false);
  });
  it("uses fewer layers when there are fewer cards", () => {
    const two = { total: 2, selected: 0, expanded: false };
    expect(stackSlot(0, two).top).toBe(CARD_STACK.peek);
    expect(stackSlot(1, two)).toMatchObject({ depth: 1, top: 0 });
    expect(stackSlot(0, { total: 1, selected: 0, expanded: false }).top).toBe(0);
  });
});

describe("expanded slots", () => {
  const opts = { total: 4, selected: 2, expanded: true };
  it("lists every card at full size with a generous strip (>= 48px)", () => {
    expect(CARD_STACK.stride).toBeGreaterThanOrEqual(48);
    for (let i = 0; i < 4; i += 1) {
      const slot = stackSlot(i, opts);
      expect(slot).toMatchObject({ visible: true, scale: 1, opacity: 1, top: i * CARD_STACK.stride });
    }
  });
  it("stacks later cards above earlier ones so each strip shows its header", () => {
    expect(stackSlot(3, opts).zIndex).toBeGreaterThan(stackSlot(0, opts).zIndex);
  });
});

describe("stackHeight", () => {
  it("collapsed: card plus peek strips", () => {
    expect(stackHeight({ total: 5, expanded: false, cardHeight: 176 })).toBe(176 + 2 * CARD_STACK.peek);
    expect(stackHeight({ total: 1, expanded: false, cardHeight: 176 })).toBe(176);
    expect(stackHeight({ total: 0, expanded: false, cardHeight: 176 })).toBe(0);
  });
  it("expanded: card plus one stride per extra card", () => {
    expect(stackHeight({ total: 4, expanded: true, cardHeight: 176 })).toBe(176 + 3 * CARD_STACK.stride);
  });
});
