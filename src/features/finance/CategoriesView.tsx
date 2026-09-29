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
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

export function CategoriesView() {
  const router = useRouter();
  const { t } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [deletingCategoryId, setDeletingCategoryId] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    const profile = await getUserMeAction();

    if (profile.error || !profile.data?.user?.isActive) {
      router.push("/user-login");
      return;
    }

    const cats = await getCategoriesAction();
    if (cats.error) setError(frontendError(cats.error, t, "requestFailedGeneric"));
    else setCategories(cats.data ?? []);
    setLoading(false);
  }, [router, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const saveCategory = async (
    operation: () => Promise<{ error?: string }>,
    successMessage: "categoryCreated" | "categoryUpdated",
  ): Promise<boolean> => {
    setError(undefined);
    setNotice(undefined);

    const result = await operation();
    if (result.error) {
      setError(frontendError(result.error, t, "requestFailedGeneric"));
      return false;
    }

    setNotice(t(successMessage));
    await reload();
    return true;
  };

  const handleDelete = async (id: string) => {
    if (deletingCategoryId) return;

    setDeletingCategoryId(id);
    setError(undefined);
    setNotice(undefined);

    try {
      const result = await deleteCategoryAction(id);
      if (result.error) {
        setError(frontendError(result.error, t, "requestFailedGeneric"));
        return;
      }

      setNotice(t("categoryDeleted"));
      await reload();
    } finally {
      setDeletingCategoryId(undefined);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
          {t("yourCategories")}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-3)]">
          {t("categoriesDescription")}
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
            aria-label={t("dismissError")}
            className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
          >
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald-dim)] px-4 py-3 text-sm text-[var(--emerald-text)]"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(undefined)}
            aria-label={t("dismissNotification")}
            className="shrink-0 cursor-pointer text-[var(--emerald-text)]/70 transition-colors hover:text-[var(--emerald-text)]"
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
            onCreate={(body: CategoryWritePayload) =>
              saveCategory(() => createCategoryAction(body), "categoryCreated")
            }
            onUpdate={(id, body: CategoryWritePayload) =>
              saveCategory(() => updateCategoryAction(id, body), "categoryUpdated")
            }
            onDelete={handleDelete}
            deletingCategoryId={deletingCategoryId}
          />
        )}
      </Card>
    </div>
  );
}
