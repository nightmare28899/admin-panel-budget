"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryManager } from "./CategoryManager";
import type { Category, CategoryWritePayload } from "./finance.types";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoriesAction,
  updateCategoryAction,
} from "@/lib/userActions";
import { Card } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/ContentSkeleton";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { useToast } from "@/components/ui/ToastProvider";

export function CategoriesView() {
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [deletingCategoryId, setDeletingCategoryId] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    // The session/active-user check already ran in the server layout; no /me request here.
    const cats = await getCategoriesAction();
    if (cats.sessionExpired) {
      router.push("/user-login");
      return;
    }
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

    try {
      const result = await operation();
      if (result.error) {
        const message = frontendError(result.error, t, "requestFailedGeneric");
        setError(message);
        toast.error(message);
        return false;
      }

      toast.success(t(successMessage));
      await reload();
      return true;
    } catch (err) {
      const message = frontendError(err instanceof Error ? err.message : undefined, t, "requestFailedGeneric");
      setError(message);
      toast.error(message);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingCategoryId) return;

    setDeletingCategoryId(id);
    setError(undefined);

    try {
      const result = await deleteCategoryAction(id);
      if (result.error) {
        const message = frontendError(result.error, t, "requestFailedGeneric");
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(t("categoryDeleted"));
      await reload();
    } catch (err) {
      const message = frontendError(err instanceof Error ? err.message : undefined, t, "requestFailedGeneric");
      setError(message);
      toast.error(message);
    } finally {
      setDeletingCategoryId(undefined);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6">
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
