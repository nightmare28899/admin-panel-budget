"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { UserRow } from "@/lib/api";
import {
  activateUserAction,
  getUsersAction,
  disableUserAction,
  updateUserAction,
} from "@/lib/actions";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", dailyBudget: 0, currency: "MXN" });
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getUsersAction(true);
      if (res.error) {
        setError(res.error);
      } else {
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) =>
      [u.name, u.email, u.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [users, search]);

  const totals = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const disabled = users.length - active;
    const admins = users.filter((u) => (u.role || "").toLowerCase() === "admin").length;

    return {
      all: users.length,
      active,
      disabled,
      admins,
    };
  }, [users]);

  const handleToggleUserStatus = async (target: UserRow) => {
    if ((target.role || "").toLowerCase() === "admin") {
      alert("Admin users cannot be inactivated from this panel.");
      return;
    }

    setActionLoading(true);
    try {
      const res = target.isActive
        ? await disableUserAction(target.id)
        : await activateUserAction(target.id);
      if (res.error) throw new Error(res.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, isActive: !u.isActive } : u)),
      );

      const message =
        (res.data as { message?: string } | undefined)?.message ||
        (target.isActive ? "User inactivated successfully" : "User activated successfully");
      alert(message);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      dailyBudget: user.dailyBudget || 0,
      currency: user.currency || "MXN",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    try {
      const res = await updateUserAction(editingUser.id, editForm);
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
      setEditingUser(null);
      alert((res.data as { message?: string } | undefined)?.message || "User updated successfully");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1836]">
        <div className="flex flex-wrap items-center gap-6 border-b border-slate-800 px-5 py-3 text-sm text-slate-300 md:px-6">
          <span className="font-semibold text-indigo-300">Overview</span>
          <span className="text-slate-400">Activity</span>
          <span className="text-slate-400">Settings</span>
          <span className="text-slate-400">Collaborators</span>
          <span className="text-slate-400">Notifications</span>
        </div>

        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Users Dashboard</h2>
            <p className="mt-1 text-sm text-slate-400">Manage and monitor platform accounts.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Production
          </span>
        </div>

        <div className="px-5 py-4 md:px-6">
          <div className="w-full md:w-80">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Search users
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or role"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-800 bg-slate-800 md:grid-cols-4">
          <StatCard label="Total users" value={totals.all} />
          <StatCard label="Active users" value={totals.active} accent="text-emerald-300" />
          <StatCard label="Disabled users" value={totals.disabled} accent="text-rose-300" />
          <StatCard label="Admins" value={totals.admins} accent="text-indigo-300" />
        </div>
      </div>

      {loading && <p className="text-amber-300">Loading users...</p>}
      {error && <p className="break-all text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm text-slate-100">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="p-3 text-left font-medium">Avatar</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium">Role</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredUsers.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-slate-400" colSpan={6}>
                    No users found for this search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-800 transition-colors duration-150 hover:bg-slate-800/40"
                  >
                    <td className="p-3">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt={u.name || "User avatar"}
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 rounded-full border border-slate-700 object-cover"
                        />
                      ) : null}
                      <div
                        className={`h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold ${
                          u.avatarUrl ? "hidden" : "flex"
                        }`}
                      >
                        {(u.name || "U").slice(0, 1).toUpperCase()}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-100">{u.name}</td>
                    <td className="p-3 text-slate-300">{u.email}</td>
                    <td className="p-3">
                      <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-indigo-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.isActive
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          disabled={actionLoading}
                          className="cursor-pointer rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500/20 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={actionLoading || (u.role || "").toLowerCase() === "admin"}
                          className={`relative inline-flex h-7 w-14 cursor-pointer items-center rounded-full border transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                            u.isActive
                              ? "border-emerald-500/40 bg-emerald-500/20"
                              : "border-slate-600 bg-slate-700/60"
                          }`}
                          title={(u.role || "").toLowerCase() === "admin" ? "Admin users cannot be inactivated" : u.isActive ? "Click to inactivate" : "Click to activate"}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              u.isActive ? "translate-x-8" : "translate-x-1"
                            }`}
                          />
                          <span className="sr-only">Toggle user status</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


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
                    setEditForm({ ...editForm, dailyBudget: Number(e.target.value) || 0 })
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

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={actionLoading}
                  className="cursor-pointer px-4 py-2 text-slate-300 transition-colors duration-200 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 active:translate-y-0 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, accent = "text-white" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-[#0b1836] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
