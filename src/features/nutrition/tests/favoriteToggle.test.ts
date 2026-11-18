import { describe, expect, it } from "vitest";
import { settleFavorite } from "../domain/favoriteToggle";

describe("settleFavorite", () => {
  it("keeps the optimistic value when the server accepted the change", () => {
    expect(settleFavorite({ previous: false, next: true, success: true })).toBe(true);
    expect(settleFavorite({ previous: true, next: false, success: true })).toBe(false);
  });

  it("rolls back to the previous value when the change failed", () => {
    expect(settleFavorite({ previous: false, next: true, success: false })).toBe(false);
    expect(settleFavorite({ previous: true, next: false, success: false })).toBe(true);
  });
});
