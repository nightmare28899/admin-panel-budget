import { z } from "zod";
import { mealTypes } from "./nutrition.types";
const id = z.uuid();
const date = z.iso.date();
export const portionSchema = z.object({
  id,
  foodId: z.string().trim().min(1).max(100),
  foodName: z.string().trim().min(1).max(120),
  quantity: z.string().max(40).nullable(),
  unit: z.string().trim().max(40),
  preparation: z.string().trim().max(300),
  free: z.boolean(),
});
export const optionSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  portions: z.array(portionSchema).min(1).max(30),
  notes: z.string().max(2000),
  recipeId: id.nullable(),
});
export const dietSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  startDate: date,
  endDate: date.nullable(),
  status: z.enum(["draft", "pending_verification", "verified"]),
  active: z.boolean(),
  meals: z
    .array(z.object({ id, type: z.enum(mealTypes), options: z.array(optionSchema).max(12) }))
    .length(5),
});
export const recipeSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  type: z.enum(mealTypes),
  ingredients: z.array(portionSchema).min(1).max(30),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(30),
  duration: z.number().int().min(0).max(1440),
  notes: z.string().max(3000),
  imageUrl: z
    .string()
    .url()
    .max(2048)
    .refine((value) => new URL(value).protocol === "https:", "Use an HTTPS image URL.")
    .nullable(),
  demo: z.boolean(),
  seedKey: z.string().max(100).nullable(),
  favorite: z.boolean(),
  cookCount: z.number().int().min(0),
  lastCookedAt: z.iso.datetime({ offset: true }).nullable(),
});
// Backend state may predate cook tracking: default the fields instead of rejecting the payload.
export const storedRecipeSchema = recipeSchema.extend({
  cookCount: recipeSchema.shape.cookCount.default(0),
  lastCookedAt: recipeSchema.shape.lastCookedAt.default(null),
});
export const profileSchema = z.object({
  // Backend user id (opaque text), not necessarily a uuid.
  id: z.string().min(1).max(128),
  name: z.string().trim().min(1).max(100),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone."),
  times: z.object(
    Object.fromEntries(
      mealTypes.map((type) => [type, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
    ) as Record<(typeof mealTypes)[number], z.ZodString>,
  ),
  theme: z.enum(["light", "dark"]),
});
export const stateSchema = z.object({
  profile: profileSchema,
  diets: z.array(dietSchema),
  recipes: z.array(storedRecipeSchema),
  plans: z.array(
    z.object({
      id,
      date,
      timezone: z.string(),
      dietId: id,
      meals: z.array(
        z.object({
          id,
          type: z.enum(mealTypes),
          time: z.string(),
          snapshot: z.object({
            title: z.string(),
            optionId: id,
            recipeId: id.nullable(),
            ingredients: z.array(portionSchema),
            steps: z.array(z.string()),
            notes: z.string(),
          }),
          status: z.enum(["pending", "completed", "skipped"]),
          completedAt: z.string().nullable(),
        }),
      ),
    }),
  ),
  files: z.array(
    z.object({
      id,
      dietId: id,
      name: z.string(),
      mime: z.string(),
      size: z.number(),
      createdAt: z.string(),
    }),
  ),
});
