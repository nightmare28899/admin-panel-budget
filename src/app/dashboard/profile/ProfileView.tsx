"use client";

import { useState } from "react";
import { CurrentUserResponse, UserRow } from "@/lib/api";
import { updateUserAction } from "@/lib/actions";
import { useSessionRenewal } from "@/app/SessionRenewalProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Toast, ToastType } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import {
  clampDailyBudgetInput,
  currencyMessageKey,
  DAILY_BUDGET_MAX,
  normalizeSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/financePreferences";

type Account = CurrentUserResponse["account"];

function formatMemberSince(createdAt: string | undefined, formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string, unknown: string) {
  if (!createdAt) return unknown;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return unknown;
  return formatDate(date, { year: "numeric", month: "long", day: "numeric" });
}

export function ProfileView({
  initialUser,
  initialAccount,
}: {
  initialUser: UserRow;
  initialAccount: Account;
}) {
  const { runServerAction } = useSessionRenewal();
  const { t, formatDate, formatNumber } = useLocale();
  const [user, setUser] = useState(initialUser);
  const memberSince = formatMemberSince(user.createdAt, formatDate, t("unknown"));
  const [isActive] = useState(initialAccount?.isActive ?? initialUser.isActive ?? true);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialUser.name || "",
    dailyBudget: initialUser.dailyBudget || 0,
    currency: normalizeSupportedCurrency(initialUser.currency),
    password: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openEdit = () => {
    setEditForm({
      name: user.name || "",
      dailyBudget: user.dailyBudget || 0,
      currency: normalizeSupportedCurrency(user.currency),
      password: "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name: editForm.name,
        dailyBudget: editForm.dailyBudget,
        currency: editForm.currency,
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
      };

      const res = await runServerAction(() => updateUserAction(user.id, payload));
      if (res.error) throw new Error(res.error);

      setUser((prev) => ({
        ...prev,
        name: editForm.name,
        dailyBudget: editForm.dailyBudget,
        currency: editForm.currency,
      }));
      showToast(t("profileUpdated"), "success");
      setEditOpen(false);
    } catch (err) {
      showToast(frontendError(err instanceof Error ? err.message : undefined, t, "failedUpdateProfile"), "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--bg-2)]">
        <div className="h-[3px] bg-[var(--emerald)]" />
        <div
          className="pointer-events-none absolute inset-x-0 top-[3px] bottom-0 opacity-50"
          style={{
            backgroundImage: "radial-gradient(var(--border-soft) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
        <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:p-9">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={88} className="shrink-0" />

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[34px] font-semibold leading-[1.1] text-[var(--text-1)]">{user.name}</h1>
            <p className="mt-1.5 font-mono text-[13px] text-[var(--text-3)]">{user.email}</p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <Badge ring className="!py-1">{user.role}</Badge>
              {user.isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-dim)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--gold-text)]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2 9.5 8.5 3 9.3l5 4.4L6.4 20 12 16.3 17.6 20 16 13.7l5-4.4-6.5-.8Z" />
                  </svg>
                  {t("premium")}
                </span>
              )}
              <span className="inline-flex items-center gap-[5px] rounded-full bg-[var(--emerald-dim)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)]">
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--emerald)]" : "bg-[var(--text-3)]"}`} />
                {isActive ? t("active") : t("disabled")}
              </span>
            </div>

            <p className="mt-3 text-[11.5px] text-[var(--text-3)]">
              {t("memberSince", { date: memberSince })}
            </p>
          </div>

          <div className="shrink-0">
            <Button variant="primary" onClick={openEdit}>
              {t("editProfile")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          title={t("accountDetails")}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-[var(--text-3)]">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          }
        >
          <dl className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3.5">
              <dt className="text-[12.5px] text-[var(--text-3)]">{t("email")}</dt>
              <dd className="font-mono text-[12.5px] text-[var(--text-1)]">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3.5">
              <dt className="text-[12.5px] text-[var(--text-3)]">{t("role")}</dt>
              <dd className="text-[12.5px] font-medium text-[var(--text-1)]">{user.role}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3.5">
              <dt className="text-[12.5px] text-[var(--text-3)]">{t("memberSince", { date: "" }).trim()}</dt>
              <dd className="text-[12.5px] text-[var(--text-1)]">{memberSince}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[12.5px] text-[var(--text-3)]">{t("accountStatus")}</dt>
              <dd className="inline-flex items-center gap-[5px] text-xs text-[var(--text-2)]">
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--emerald)]" : "bg-[var(--text-3)]"}`} />
                {isActive ? t("active") : t("disabled")}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title={t("preferences")}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-[var(--text-3)]">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        >
          <div className="mb-5">
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">{t("dailyBudget")}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[30px] font-medium tabular-nums text-[var(--text-1)]">
                {typeof user.dailyBudget === "number" ? formatNumber(user.dailyBudget, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </span>
              <span className="text-xs text-[var(--text-3)]">{t("perDay")}</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-3.5">
            <span className="text-[12.5px] text-[var(--text-3)]">{t("currency")}</span>
            <span className="rounded-md border border-[var(--border)] px-2.5 py-[3px] font-mono text-[11.5px] text-[var(--text-2)]">
              {user.currency || "—"}
            </span>
          </div>
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => (actionLoading ? null : setEditOpen(false))} title={t("editProfile")}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-edit-name" className="mb-1 block text-sm text-[var(--text-2)]">{t("name")}</label>
            <input
              id="profile-edit-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Jane Doe"
              className="input"
              disabled={actionLoading}
            />
          </div>
          <div>
            <label htmlFor="profile-edit-daily-budget" className="mb-1 block text-sm text-[var(--text-2)]">{t("dailyBudget")}</label>
            <input
              id="profile-edit-daily-budget"
              name="dailyBudget"
              type="number"
              autoComplete="off"
              step="0.01"
              min="0"
              max={DAILY_BUDGET_MAX}
              required
              value={editForm.dailyBudget}
              onChange={(e) =>
                setEditForm({ ...editForm, dailyBudget: clampDailyBudgetInput(e.target.value) })
              }
              placeholder="0.00"
              className="input"
              disabled={actionLoading}
            />
            <p className="mt-1 text-xs text-[var(--text-3)]">
              {t("maximumPerDay", { amount: formatNumber(DAILY_BUDGET_MAX) })}
            </p>
          </div>
          <div>
            <label htmlFor="profile-edit-currency" className="mb-1 block text-sm text-[var(--text-2)]">{t("currency")}</label>
            <select
              id="profile-edit-currency"
              name="currency"
              required
              value={editForm.currency}
              onChange={(e) =>
                setEditForm({ ...editForm, currency: normalizeSupportedCurrency(e.target.value) })
              }
              className="input"
              disabled={actionLoading}
            >
              {SUPPORTED_CURRENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(currencyMessageKey(option.value))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="profile-edit-password" className="mb-1 block text-sm text-[var(--text-2)]">{t("newPassword")}</label>
            <input
              id="profile-edit-password"
              name="password"
              type="text"
              autoComplete="new-password"
              minLength={6}
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder={t("setNewPassword")}
              className="input"
              disabled={actionLoading}
            />
            <p className="mt-1 text-xs text-[var(--text-3)]">{t("passwordHelp")}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={actionLoading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              {actionLoading ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </section>
  );
}
