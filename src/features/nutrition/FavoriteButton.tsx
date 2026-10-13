"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { favoriteRecipeAction } from "./nutrition.actions";
import { icons } from "./NutritionUi";
import { settleFavorite } from "./domain/favoriteToggle";

/**
 * Heart toggle that updates instantly (optimistic) and animates smoothly:
 * no disabled flash, no label-width jump, rolled back if the server rejects it.
 */
export function FavoriteButton({
  recipeId,
  favorite,
  activeLabel,
  inactiveLabel,
  errorMessage,
  size = "md",
  onError,
}: {
  recipeId: string;
  favorite: boolean;
  activeLabel: string;
  inactiveLabel: string;
  errorMessage: string;
  size?: "sm" | "md";
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(favorite);
  const [pop, setPop] = useState(false);
  const busy = useRef(false);

  // Follow the server once a refresh brings a new value.
  useEffect(() => setValue(favorite), [favorite]);

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    const previous = value;
    const next = !previous;
    setValue(next);
    if (next) {
      setPop(true);
      window.setTimeout(() => setPop(false), 220);
    }
    let success = false;
    try {
      const result = await favoriteRecipeAction(recipeId, next);
      success = result.success;
      if (!result.success) onError?.(result.error);
    } catch {
      onError?.(errorMessage);
    } finally {
      setValue(settleFavorite({ previous, next, success }));
      busy.current = false;
      if (success) router.refresh();
    }
  };

  return (
    <Button
      type="button"
      variant={value ? "tinted" : "outline"}
      size={size}
      aria-pressed={value}
      aria-busy={busy.current || undefined}
      className="min-w-[9.5rem] justify-center"
      onClick={() => void toggle()}
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="currentColor"
        fillOpacity={value ? 1 : 0}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          transition: "fill-opacity 200ms ease-out, transform 200ms ease-out",
          transform: pop ? "scale(1.18)" : "scale(1)",
        }}
        className="motion-reduce:!transition-none"
      >
        {icons.heart}
      </svg>
      {value ? activeLabel : inactiveLabel}
    </Button>
  );
}
