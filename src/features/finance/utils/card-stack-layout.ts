/** Pure layout math for the stacked-cards wallet view. No DOM, no React. */
export const CARD_STACK = {
  maxVisible: 3,
  /** Vertical peek of each card behind the front one. */
  peek: 18,
  /** Vertical strip of each card when the stack is fanned out. */
  stride: 56,
  scaleStep: 0.06,
  opacityStep: 0.28,
} as const;

export type StackOptions = { total: number; selected: number; expanded: boolean };

export type StackSlot = {
  visible: boolean;
  /** 0 = front. Meaningful only when `visible` in collapsed mode. */
  depth: number;
  /** Pixels from the top of the stack container. */
  top: number;
  scale: number;
  opacity: number;
  zIndex: number;
};

export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, index));
}

export function stepIndex(index: number, total: number, delta: number): number {
  return clampIndex(index + delta, total);
}

export function visibleCount(total: number): number {
  return Math.min(Math.max(total, 0), CARD_STACK.maxVisible);
}

export function stackSlot(index: number, { total, selected, expanded }: StackOptions): StackSlot {
  if (expanded) {
    return { visible: true, depth: index, top: index * CARD_STACK.stride, scale: 1, opacity: 1, zIndex: index + 1 };
  }
  const count = visibleCount(total);
  const depth = total > 0 ? (index - selected + total) % total : 0;
  if (depth >= count) {
    return { visible: false, depth, top: 0, scale: 1 - CARD_STACK.scaleStep * (count - 1), opacity: 0, zIndex: 0 };
  }
  return {
    visible: true,
    depth,
    top: (count - 1 - depth) * CARD_STACK.peek,
    scale: Math.round((1 - CARD_STACK.scaleStep * depth) * 100) / 100,
    opacity: Math.round((1 - CARD_STACK.opacityStep * depth) * 100) / 100,
    zIndex: CARD_STACK.maxVisible - depth,
  };
}

export function stackHeight({ total, expanded, cardHeight }: { total: number; expanded: boolean; cardHeight: number }): number {
  if (total <= 0) return 0;
  return cardHeight + (expanded ? total - 1 : visibleCount(total) - 1) * (expanded ? CARD_STACK.stride : CARD_STACK.peek);
}
