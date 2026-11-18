import { describe, expect, it } from "vitest";
import { shellUser } from "../domain/shellUser";

describe("shellUser", () => {
  it("carries the avatar from the account so the sidebar can render it", () => {
    expect(
      shellUser("Kevin", { email: "k@example.test", avatarUrl: "/api/storage/avatars/x.jpg" }),
    ).toEqual({ name: "Kevin", email: "k@example.test", avatarUrl: "/api/storage/avatars/x.jpg" });
  });

  it("falls back to empty email and no avatar when the account is unavailable", () => {
    expect(shellUser("Kevin", null)).toEqual({ name: "Kevin", email: "", avatarUrl: null });
    expect(shellUser("Kevin", undefined)).toEqual({ name: "Kevin", email: "", avatarUrl: null });
  });
});
