"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryManager } from "./CategoryManager";
import type { Category, CategoryWritePayload } from "./finance.types";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoriesAction,
  getUserMeAction,
  updateCategoryAction,
} from "@/lib/userActions";
import { Card } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/ContentSkeleton";

export function CategoriesView() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    const profile = await getUserMeAction();

    if (profile.error || !profile.data?.user?.isActive) {
      router.push("/user-login");
      return;
    }

    const cats = await getCategoriesAction();
    if (cats.error) setError(cats.error);
    else setCategories(cats.data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const refreshAfter = async (result: { error?: string }) => {
    if (result.error) setError(result.error);
    else void reload();
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
          Your categories
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-3)]">
          Organize expenses and configure category budgets.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(undefined)}
            aria-label="Dismiss error"
            className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
          >
            ✕
          </button>
        </div>
      )}

      <Card className="!p-4">
        {loading && categories.length === 0 ? (
          <ListSkeleton />
        ) : (
          <CategoryManager
            categories={categories}
            onCreate={async (body: CategoryWritePayload) =>
              refreshAfter(await createCategoryAction(body))
            }
            onUpdate={async (id, body: CategoryWritePayload) =>
              refreshAfter(await updateCategoryAction(id, body))
            }
            onDelete={async (id) =>
              refreshAfter(await deleteCategoryAction(id))
            }
          />
        )}
      </Card>
    </div>
  );
}
