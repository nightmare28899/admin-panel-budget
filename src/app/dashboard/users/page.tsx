"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRow } from "@/lib/api";
import { getUsersAction, disableUserAction, updateUserAction } from "@/lib/actions";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userToInactivate, setUserToInactivate] = useState<UserRow | null>(null);
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

  const handleInactivateUser = async () => {
    if (!userToInactivate) return;

    setActionLoading(true);
    try {
      const res = await disableUserAction(userToInactivate.id);
      if (res.error) throw new Error(res.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === userToInactivate.id ? { ...u, isActive: false } : u)),
      );
      setUserToInactivate(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to inactivate user");
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Users</h2>
            <p className="mt-1 text-sm text-slate-400">Manage and monitor platform accounts.</p>
          </div>

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

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total" value={totals.all} />
          <StatCard label="Active" value={totals.active} accent="text-emerald-300" />
          <StatCard label="Disabled" value={totals.disabled} accent="text-rose-300" />
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
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-9 w-9 rounded-full border border-slate-700 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                            e.currentTarget.nextElementSibling?.classList.add("flex");
                          }}
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
                        {u.isActive && (
                          <button
                            onClick={() => setUserToInactivate(u)}
                            disabled={actionLoading}
                            className="cursor-pointer rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Inactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {userToInactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-modal-enter w-full max-w-md space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-medium text-white">Confirm Inactivation</h3>
            <p className="text-sm text-slate-300">
              Are you sure that you want to inactivate this user? Remember that we don’t delete
              users.
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm">
              <p className="font-medium text-slate-100">{userToInactivate.name || "Unnamed user"}</p>
              <p className="text-slate-400">{userToInactivate.email}</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToInactivate(null)}
                disabled={actionLoading}
                className="cursor-pointer px-4 py-2 text-slate-300 transition-colors duration-200 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInactivateUser}
                disabled={actionLoading}
                className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 active:translate-y-0 disabled:opacity-50"
              >
                {actionLoading ? "Inactivating..." : "Yes, inactivate"}
              </button>
            </div>
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
