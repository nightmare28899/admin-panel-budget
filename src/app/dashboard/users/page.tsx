"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { UserRow } from "@/lib/api";
import {
  getUsersAction,
  disableUserAction,
  updateUserAction,
  activateUserAction,
} from "@/lib/actions";
import { useSessionRenewal } from "@/app/SessionRenewalProvider";

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

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingUser, setConfirmingUser] = useState<UserRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const USERS_PER_PAGE = 10;

  const showToast = (message: string, type: "success" | "error" = "success") => {
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
  }, [searchQuery]);

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
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      dailyBudget: user.dailyBudget || 0,
      currency: user.currency || "MXN",
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

  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-800/80 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-center bg-slate-900/50 p-6">
          <p className="text-sm font-medium text-slate-400">Total users</p>
          <p className="mt-2 text-3xl font-semibold text-white">{users.length}</p>
        </div>
        <div className="flex flex-col justify-center bg-slate-900/50 p-6">
          <p className="text-sm font-medium text-slate-400">Active users</p>
          <p className="mt-2 text-3xl font-semibold text-white">{users.filter((u) => u.isActive).length}</p>
        </div>
        <div className="flex flex-col justify-center bg-slate-900/50 p-6">
          <p className="text-sm font-medium text-slate-400">Inactive users</p>
          <p className="mt-2 text-3xl font-semibold text-white">{users.filter((u) => !u.isActive).length}</p>
        </div>
        <div className="flex flex-col justify-center bg-slate-900/50 p-6">
          <p className="text-sm font-medium text-slate-400">Admin accounts</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {users.filter((u) => u.role.toLowerCase() === "admin").length}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h3 className="text-base font-semibold leading-7 text-white">Latest activity</h3>
        <div className="group relative w-full sm:w-auto">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 text-slate-500 transition-colors group-focus-within:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:w-64"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-indigo-400">Loading users...</p>}
      {error && <p className="break-all text-sm text-red-400">{error}</p>}

      <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full px-4 py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th scope="col" className="py-3 pl-0 pr-3 font-semibold">
                  User
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Email
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Role
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Account Status
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Premium Access
                </th>
                <th scope="col" className="relative py-3 pl-3 pr-0 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {!loading && filteredUsers.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={6}>
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="group transition-colors hover:bg-slate-800/30">
                    <td className="flex items-center gap-x-4 py-4 pl-0 pr-3">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt={u.name || "User Avatar"}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-8 w-8 rounded-full bg-slate-800 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                            e.currentTarget.nextElementSibling?.classList.add("flex");
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-8 w-8 rounded-full bg-slate-800 items-center justify-center text-xs font-medium text-slate-300 ${u.avatarUrl ? "hidden" : "flex"}`}
                      >
                        {(u.name || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-200 transition-colors group-hover:text-white">{u.name}</span>
                    </td>
                    <td className="px-3 py-4 text-slate-400">{u.email}</td>
                    <td className="px-3 py-4 text-slate-400">
                      <span className="inline-flex items-center rounded-md bg-slate-400/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-400/20">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-x-2">
                        <div
                          className={`flex-none rounded-full border p-1 ${u.isActive ? "border-emerald-500/20 bg-emerald-500/10" : "border-slate-500/20 bg-slate-500/10"}`}
                        >
                          <div className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-500"}`} />
                        </div>
                        <span className="text-slate-300">{u.isActive ? "Active" : "Disabled"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.isPremium
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {u.isPremium ? "Premium" : "Free"}
                      </span>
                    </td>
                    <td className="relative py-4 pl-3 pr-0 text-right">
                      <div className="inline-flex flex-col items-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          disabled={actionLoading}
                          className="inline-flex items-center rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 transition-colors duration-200 hover:bg-indigo-500/20 hover:text-indigo-200 disabled:opacity-50"
                        >
                          Edit<span className="sr-only">, {u.name}</span>
                        </button>

                        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/70 px-2.5 py-1.5">
                          <span className="text-[11px] font-medium tracking-wide text-slate-400">PREMIUM</span>
                          <button
                            role="switch"
                            aria-checked={Boolean(u.isPremium)}
                            onClick={() => togglePremium(u)}
                            disabled={actionLoading}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent align-middle transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                              u.isPremium ? "bg-amber-500 hover:bg-amber-400" : "bg-slate-600 hover:bg-slate-500"
                            }`}
                            title={u.isPremium ? "Disable premium" : "Enable premium"}
                          >
                            <span className="sr-only">Toggle premium status</span>
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out ${
                                u.isPremium ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/70 px-2.5 py-1.5">
                          <span className="text-[11px] font-medium tracking-wide text-slate-400">ACCOUNT</span>
                          <button
                            role="switch"
                            aria-checked={u.isActive}
                            onClick={() => setConfirmingUser(u)}
                            disabled={actionLoading || u.role.toLowerCase() === "admin"}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent align-middle transition-colors duration-200 ease-in-out focus:outline-none ${u.role.toLowerCase() === "admin" ? "cursor-not-allowed opacity-30" : ""} ${u.isActive ? "bg-emerald-500 hover:bg-emerald-400" : "bg-slate-600 hover:bg-slate-500"}`}
                            title={u.role.toLowerCase() === "admin" ? "Admins cannot be disabled" : u.isActive ? "Disable User" : "Activate User"}
                          >
                            <span className="sr-only">Toggle user status</span>
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out ${u.isActive ? "translate-x-5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-800/60 pt-4 text-sm text-slate-400 sm:flex-row sm:items-center">
          <p>
            Showing <span className="font-medium text-slate-200">{startIndex + 1}</span>-
            <span className="font-medium text-slate-200">{Math.min(endIndex, filteredUsers.length)}</span> of{" "}
            <span className="font-medium text-slate-200">{filteredUsers.length}</span> users
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 text-slate-300">
              Page <span className="font-semibold text-white">{safeCurrentPage}</span> of{" "}
              <span className="font-semibold text-white">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-modal-enter w-full max-w-md space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-medium text-white">Edit User</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Daily Budget</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editForm.dailyBudget}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dailyBudget: parseFloat(e.target.value) || 0 })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Currency</label>
                <input
                  type="text"
                  required
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Temporary Password (optional)</label>
                <input
                  type="text"
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Set a temporary password"
                  className="input"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Leave empty to keep current password. Minimum 6 characters.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-slate-300 transition-colors duration-200 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:translate-y-0 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`animate-in fixed bottom-4 right-4 z-50 slide-in-from-bottom-5 rounded-xl border px-6 py-3 font-medium shadow-lg ${
            toast.type === "error"
              ? "border-red-800 bg-red-950/80 text-red-200"
              : "border-green-800 bg-green-950/80 text-green-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {confirmingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-modal-enter w-full max-w-sm space-y-4 rounded-xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-medium text-white">Change User Status</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to {confirmingUser.isActive ? "disable" : "activate"}{" "}
              <strong>{confirmingUser.name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setConfirmingUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeToggleStatus}
                disabled={actionLoading}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors duration-200 disabled:opacity-50 ${
                  confirmingUser.isActive
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
