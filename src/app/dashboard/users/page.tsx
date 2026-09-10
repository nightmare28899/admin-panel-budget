"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserRow } from "@/lib/api";
import {
  getUsersAction,
  disableUserAction,
  updateUserAction,
  activateUserAction,
} from "@/lib/actions";
import { useSessionRenewal } from "@/app/SessionRenewalProvider";
import { useHeaderSlot } from "../DashboardShell";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MetricCardsSkeleton, SkeletonBlock, TableSkeleton } from "@/components/ui/ContentSkeleton";
import { Modal } from "@/components/ui/Modal";
import { Toast, ToastType } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import {
  clampDailyBudgetInput,
  DAILY_BUDGET_MAX,
  normalizeSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/financePreferences";

type StatusFilter = "all" | "active" | "premium";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "premium", label: "Premium" },
];

function formatDailyBudget(value: UserRow["dailyBudget"]): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

export default function UsersPage() {
  const { runServerAction } = useSessionRenewal();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    dailyBudget: 0,
    currency: "MXN",
    password: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmingUser, setConfirmingUser] = useState<UserRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const setHeaderSlot = useHeaderSlot();

  const USERS_PER_PAGE = 10;

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await runServerAction(() => getUsersAction(true));
      if (res.error) {
        setError(res.error);
      } else {
        setError("");
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [runServerAction]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setHeaderSlot(
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <svg
            className="h-[15px] w-[15px] text-[var(--text-3)] transition-colors group-focus-within:text-[var(--emerald-text)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <input
          id="users-search"
          name="usersSearch"
          type="search"
          aria-label="Search users"
          placeholder="Search users…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-32 rounded-full border border-[var(--border-soft)] bg-[var(--bg-2)] py-[7px] pl-9 pr-[14px] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none transition-colors focus:border-[var(--emerald)] sm:w-[240px]"
        />
      </div>,
    );
    return () => setHeaderSlot(null);
  }, [searchQuery, setHeaderSlot]);

  useEffect(() => {
    if (!openMenuId) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setOpenMenuId(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }

    function handleScroll() {
      setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenuId]);

  const toggleMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 6, left: Math.max(8, rect.right - 200) });
    setOpenMenuId(id);
  };

  const executeToggleStatus = async () => {
    if (!confirmingUser) return;

    setActionLoading(true);
    try {
      const res = await runServerAction(() =>
        confirmingUser.isActive
          ? disableUserAction(confirmingUser.id)
          : activateUserAction(confirmingUser.id),
      );
      if (res.error) throw new Error(res.error);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmingUser.id ? { ...u, isActive: !confirmingUser.isActive } : u,
        ),
      );
      showToast(`User ${confirmingUser.isActive ? "disabled" : "activated"} successfully`, "success");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : `Failed to ${confirmingUser.isActive ? "disable" : "activate"} user`,
        "error",
      );
    } finally {
      setActionLoading(false);
      setConfirmingUser(null);
    }
  };

  const openEdit = (user: UserRow) => {
    setOpenMenuId(null);
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      dailyBudget: user.dailyBudget || 0,
      currency: normalizeSupportedCurrency(user.currency),
      password: "",
    });
  };

  const togglePremium = async (target: UserRow) => {
    setActionLoading(true);
    try {
      const res = await runServerAction(() =>
        updateUserAction(target.id, { isPremium: !target.isPremium }),
      );
      if (res.error) throw new Error(res.error);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, isPremium: !target.isPremium } : u,
        ),
      );

      showToast(
        `Premium ${target.isPremium ? "disabled" : "enabled"} for ${target.name}`,
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update premium status", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    try {
      const payload = {
        name: editForm.name,
        dailyBudget: editForm.dailyBudget,
        currency: editForm.currency,
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
      };

      const res = await runServerAction(() =>
        updateUserAction(editingUser.id, payload),
      );
      if (res.error) throw new Error(res.error);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: editForm.name,
                dailyBudget: editForm.dailyBudget,
                currency: editForm.currency,
              }
            : u,
        ),
      );
      showToast("User updated successfully", "success");
      setEditingUser(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "active") return Boolean(u.isActive);
    if (statusFilter === "premium") return Boolean(u.isPremium);
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const premiumUsers = users.filter((u) => u.isPremium).length;
  const adminUsers = users.filter((u) => u.role.toLowerCase() === "admin").length;
  const activePct = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const premiumPct = totalUsers ? Math.round((premiumUsers / totalUsers) * 100) : 0;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newThisMonth = users.filter(
    (u) => u.createdAt && new Date(u.createdAt) >= monthStart,
  ).length;

  return (
    <section>
      {loading ? (
        <MetricCardsSkeleton count={4} className="mb-6 sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="relative mb-6 flex flex-col overflow-hidden rounded-2xl border border-[var(--emerald)]/25 bg-[var(--bg-2)]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:flex-row">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,var(--emerald-dim),transparent_55%)]"
            aria-hidden="true"
          />
        <div className="relative flex-1 border-b border-[var(--border-soft)] px-6 py-5 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Total users</p>
          <p className="mt-2.5 font-mono text-[28px] font-medium tabular-nums text-[var(--text-1)]">{totalUsers}</p>
          <p className="mt-2 text-[11.5px] text-[var(--text-3)]">
            {newThisMonth > 0 ? (
              <span className="inline-flex items-center gap-1 text-[var(--emerald-text)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
                {newThisMonth} this month
              </span>
            ) : (
              "No new signups"
            )}
          </p>
        </div>
        <div className="relative flex-1 border-b border-[var(--border-soft)] px-6 py-5 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Active users</p>
          <p className="mt-2.5 font-mono text-[28px] font-medium tabular-nums text-[var(--text-1)]">{activeUsers}</p>
          <p className="mt-2 text-[11.5px] text-[var(--text-3)]">{activePct}% of total</p>
        </div>
        <div className="relative flex-1 border-b border-[var(--border-soft)] px-6 py-5 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Premium accounts</p>
          <p className="mt-2.5 font-mono text-[28px] font-medium tabular-nums text-[var(--gold-text)]">{premiumUsers}</p>
          <p className="mt-2 text-[11.5px] text-[var(--gold-text)]">{premiumPct}% of total</p>
        </div>
        <div className="relative flex-1 px-6 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Admin accounts</p>
          <p className="mt-2.5 font-mono text-[28px] font-medium tabular-nums text-[var(--text-1)]">{adminUsers}</p>
          <p className="mt-2 text-[11.5px] text-[var(--text-3)]">Elevated access</p>
        </div>
        </div>
      )}

      <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-medium text-[var(--text-1)]">All users</span>
          {loading ? (
            <SkeletonBlock className="h-3 w-6" aria-hidden="true" />
          ) : (
            <span className="font-mono text-xs tabular-nums text-[var(--text-3)]">{filteredUsers.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`cursor-pointer rounded-full px-[13px] py-1.5 text-xs transition-colors ${
                statusFilter === f.key
                  ? "bg-[var(--emerald-dim)] font-medium text-[var(--emerald-text)]"
                  : "text-[var(--text-3)] hover:text-[var(--text-1)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-3 break-all text-sm text-[var(--rose)]">{error}</p>}

      {loading ? (
        <TableSkeleton rows={7} columns={6} />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--emerald)]/25 bg-[var(--bg-2)]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,var(--emerald-dim),transparent_55%)]"
            aria-hidden="true"
          />
        <div className="relative overflow-x-auto">
          <table className="min-w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-soft)]">
                <th scope="col" className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                  User
                </th>
                <th scope="col" className="px-3 py-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Role
                </th>
                <th scope="col" className="px-3 py-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Plan
                </th>
                <th scope="col" className="px-3 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Daily budget
                </th>
                <th scope="col" className="px-6 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-[var(--text-3)]" colSpan={6}>
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      className="group border-b border-[var(--border-soft)] transition-colors last:border-b-0 hover:bg-[var(--bg-3)]/40"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={u.name} avatarUrl={u.avatarUrl} size={34} />
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-medium text-[var(--text-1)]">{u.name}</div>
                            <div className="truncate font-mono text-[11.5px] text-[var(--text-3)]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge ring>{u.role}</Badge>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-[7px]">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-[var(--emerald)]" : "bg-[var(--text-3)]"}`}
                            style={{
                              boxShadow: `0 0 0 3px ${u.isActive ? "var(--emerald-dim)" : "var(--bg-3)"}`,
                            }}
                          />
                          <span className="text-[12.5px] text-[var(--text-2)]">{u.isActive ? "Active" : "Disabled"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {u.isPremium ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-dim)] px-[9px] py-[3px] text-[11.5px] font-medium text-[var(--gold-text)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2 9.5 8.5 3 9.3l5 4.4L6.4 20 12 16.3 17.6 20 16 13.7l5-4.4-6.5-.8Z" />
                            </svg>
                            Premium
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-[var(--text-3)]">Free</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-[13px] tabular-nums text-[var(--text-1)]">
                        {u.currency ? `${u.currency} ` : ""}
                        {formatDailyBudget(u.dailyBudget)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            disabled={actionLoading}
                            title={`Edit ${u.name}`}
                            aria-label={`Edit ${u.name}`}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-3)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            ref={openMenuId === u.id ? menuButtonRef : undefined}
                            onClick={(e) => toggleMenu(u.id, e)}
                            disabled={actionLoading}
                            title="More actions"
                            aria-label="More actions"
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === u.id}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-3)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                              <circle cx="12" cy="5" r="1.4" />
                              <circle cx="12" cy="12" r="1.4" />
                              <circle cx="12" cy="19" r="1.4" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredUsers.length > 0 && (
          <div className="relative flex flex-col items-start justify-between gap-3 px-6 py-3.5 text-xs text-[var(--text-3)] sm:flex-row sm:items-center">
            <p>
              Showing <span className="text-[var(--text-2)]">{startIndex + 1}</span>-
              <span className="text-[var(--text-2)]">{Math.min(endIndex, filteredUsers.length)}</span> of{" "}
              <span className="text-[var(--text-2)]">{filteredUsers.length}</span> users
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
              >
                Previous
              </Button>
              <span className="px-2 text-[var(--text-2)]">
                Page <span className="font-semibold text-[var(--text-1)]">{safeCurrentPage}</span> of{" "}
                <span className="font-semibold text-[var(--text-1)]">{totalPages}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </div>
      )}

      {openMenuId &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const menuUser = users.find((u) => u.id === openMenuId);
            if (!menuUser) return null;
            const menuUserIsAdmin = menuUser.role.toLowerCase() === "admin";
            return (
              <div
                ref={menuRef}
                role="menu"
                style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left }}
                className="z-50 w-[200px] rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)] p-2 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                  <span className="text-[12px] text-[var(--text-2)]">Premium</span>
                  <Toggle
                    checked={Boolean(menuUser.isPremium)}
                    onChange={() => togglePremium(menuUser)}
                    disabled={actionLoading}
                    onColor="gold"
                    title={menuUser.isPremium ? "Disable premium" : "Enable premium"}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                  <span
                    className={`text-[12px] ${menuUserIsAdmin ? "text-[var(--text-3)]" : "text-[var(--text-2)]"}`}
                  >
                    Account active
                  </span>
                  <Toggle
                    checked={Boolean(menuUser.isActive)}
                    onChange={() => {
                      setConfirmingUser(menuUser);
                      setOpenMenuId(null);
                    }}
                    disabled={actionLoading || menuUserIsAdmin}
                    onColor="emerald"
                    title={
                      menuUserIsAdmin
                        ? "Admins cannot be disabled"
                        : menuUser.isActive
                          ? "Disable user"
                          : "Activate user"
                    }
                    className={menuUserIsAdmin ? "cursor-not-allowed opacity-30" : ""}
                  />
                </div>
              </div>
            );
          })(),
          document.body,
        )}

      <Modal open={Boolean(editingUser)} onClose={() => setEditingUser(null)} title="Edit User">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-user-name" className="mb-1 block text-sm text-[var(--text-2)]">Name</label>
                <input
                  id="edit-user-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Jane Doe"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="edit-user-daily-budget" className="mb-1 block text-sm text-[var(--text-2)]">Daily Budget</label>
                <input
                  id="edit-user-daily-budget"
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
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Maximum {DAILY_BUDGET_MAX.toLocaleString()} per day.
                </p>
              </div>
              <div>
                <label htmlFor="edit-user-currency" className="mb-1 block text-sm text-[var(--text-2)]">Currency</label>
                <select
                  id="edit-user-currency"
                  name="currency"
                  required
                  value={editForm.currency}
                  onChange={(e) =>
                    setEditForm({ ...editForm, currency: normalizeSupportedCurrency(e.target.value) })
                  }
                  className="input"
                >
                  {SUPPORTED_CURRENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-user-password" className="mb-1 block text-sm text-[var(--text-2)]">Temporary Password (optional)</label>
                <input
                  id="edit-user-password"
                  name="password"
                  type="text"
                  autoComplete="new-password"
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Set a temporary password"
                  className="input"
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Leave empty to keep current password. Minimum 6 characters.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} />}

      <Modal
        open={Boolean(confirmingUser)}
        onClose={() => setConfirmingUser(null)}
        title="Change User Status"
        maxWidth="max-w-sm"
      >
            <p className="text-sm text-[var(--text-2)]">
              Are you sure you want to {confirmingUser?.isActive ? "disable" : "activate"}{" "}
              <strong>{confirmingUser?.name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setConfirmingUser(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={confirmingUser?.isActive ? "danger" : "success"}
                onClick={executeToggleStatus}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </Button>
            </div>
      </Modal>
    </section>
  );
}
