"use client";

import { useEffect, useState } from "react";
import { api, UserRow } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editingUser, setEditingUser] = useState<UserRow | null>(null);
    const [editForm, setEditForm] = useState({ name: "", dailyBudget: 0, currency: "MXN" });
    const [actionLoading, setActionLoading] = useState(false);

    const loadUsers = () => {
        const token = getToken();
        if (!token) {
            setError("No auth token found. Please login again.");
            setLoading(false);
            return;
        }

        setLoading(true);
        api.getUsers(token, true)
            .then((res) => setUsers(Array.isArray(res.users) ? res.users : []))
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        const token = getToken();
        if (!token) return;

        setActionLoading(true);
        try {
            await api.disableUser(token, id);
            setUsers((prev) =>
                prev.map((u) => (u.id === id ? { ...u, isActive: false } : u))
            );
        } catch (err: any) {
            alert(err.message || "Failed to delete user");
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

        const token = getToken();
        if (!token) return;

        setActionLoading(true);
        try {
            await api.updateUser(token, editingUser.id, editForm);
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editingUser.id
                        ? { ...u, name: editForm.name, dailyBudget: editForm.dailyBudget, currency: editForm.currency }
                        : u
                )
            );
            setEditingUser(null);
        } catch (err: any) {
            alert(err.message || "Failed to update user");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Users</h2>
            <p className="text-sm text-slate-300">Total: {users.length}</p>

            {loading && <p className="text-amber-300">Loading users...</p>}
            {error && <p className="text-red-400 break-all">{error}</p>}

            <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-sm text-slate-100">
                    <thead className="bg-slate-800">
                        <tr>
                            <th className="p-3 text-left">Avatar</th>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Role</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && users.length === 0 ? (
                            <tr>
                                <td className="p-3" colSpan={6}>No users found</td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="border-t border-slate-800 transition-colors duration-150 hover:bg-slate-800/40">
                                    <td className="p-3">
                                        {u.avatarUrl ? (
                                            <img
                                                src={u.avatarUrl}
                                                alt={u.name}
                                                className="h-8 w-8 rounded-full object-cover"
                                                onError={(e) => {
                                                    // Hide broken image and show initial letter
                                                    e.currentTarget.style.display = "none";
                                                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                                    e.currentTarget.nextElementSibling?.classList.add("flex");
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className={`h-8 w-8 rounded-full bg-slate-700 items-center justify-center text-xs ${u.avatarUrl ? "hidden" : "flex"
                                                }`}
                                        >
                                            {(u.name || "U").slice(0, 1).toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="p-3">{u.name}</td>
                                    <td className="p-3">{u.email}</td>
                                    <td className="p-3">{u.role}</td>
                                    <td className="p-3">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}
                                        >
                                            {u.isActive ? "Active" : "Disabled"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        <button
                                            onClick={() => openEdit(u)}
                                            disabled={actionLoading}
                                            className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors duration-200"
                                        >
                                            Edit
                                        </button>
                                        {u.isActive && (
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                disabled={actionLoading}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors duration-200"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 animate-modal-enter shadow-2xl">
                        <h3 className="text-xl font-medium text-white">Edit User</h3>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Daily Budget</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={editForm.dailyBudget}
                                    onChange={(e) => setEditForm({ ...editForm, dailyBudget: parseFloat(e.target.value) || 0 })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Currency</label>
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
                                    className="px-4 py-2 text-slate-300 hover:text-white disabled:opacity-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 active:translate-y-0 active:scale-95"
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
