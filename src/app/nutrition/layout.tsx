import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nutrition | Budget Panel",
  description: "Your private diet, recipes and daily meals.",
};

export const dynamic = "force-dynamic";

export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
