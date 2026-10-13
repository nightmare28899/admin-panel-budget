import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/userSession", () => ({ getUserToken: vi.fn() }));

import { getUserToken } from "@/lib/userSession";
import {
  NutritionSessionError,
  loadNutritionState,
  nutritionCommand,
  requireNutritionSession,
} from "../nutrition.repository";

const uuid = "12345678-1234-4234-8234-123456789abc";
const time = { breakfast: "08:00", morning_snack: "10:30", lunch: "13:00", afternoon_snack: "16:30", dinner: "20:00" };
const state = {
  profile: {
    id: "user_42",
    name: "Kevin",
    timezone: "America/Mexico_City",
    times: time,
    theme: "light",
  },
  diets: [],
  recipes: [],
  plans: [],
  files: [],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("nutrition repository", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getUserToken).mockResolvedValue("tok");
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("requires a user token", async () => {
    vi.mocked(getUserToken).mockResolvedValue(null);
    await expect(requireNutritionSession()).rejects.toBeInstanceOf(NutritionSessionError);
    await expect(loadNutritionState()).rejects.toBeInstanceOf(NutritionSessionError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads state with the bearer token and accepts a non-uuid profile id", async () => {
    fetchMock.mockResolvedValue(json(state));
    const result = await loadNutritionState();
    expect(result.profile.id).toBe("user_42");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/nutrition\/state$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("rejects state that does not match the schema", async () => {
    fetchMock.mockResolvedValue(json({ ...state, profile: { ...state.profile, id: "" } }));
    await expect(loadNutritionState()).rejects.toThrow(/verification/i);
  });

  it("maps a 401 to a session error and other failures to a friendly error", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "no" }, 401));
    await expect(loadNutritionState()).rejects.toBeInstanceOf(NutritionSessionError);
    fetchMock.mockResolvedValueOnce(json({ message: "boom" }, 500));
    await expect(loadNutritionState()).rejects.toThrow(/unavailable/i);
  });

  it("posts commands as {command, payload}", async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    await nutritionCommand("activate_diet", { id: uuid });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/nutrition\/commands$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      command: "activate_diet",
      payload: { id: uuid },
    });
  });

  it("defaults the payload to an empty object", async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    await nutritionCommand("generate_plan");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ command: "generate_plan", payload: {} });
  });

  it("hides backend rejection details and flags expired sessions", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "internal detail" }, 400));
    await expect(nutritionCommand("save_diet", {})).rejects.toThrow(/could not be saved/i);
    fetchMock.mockResolvedValueOnce(json({ message: "x" }, 401));
    await expect(nutritionCommand("save_diet", {})).rejects.toBeInstanceOf(NutritionSessionError);
  });
});
