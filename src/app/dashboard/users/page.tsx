"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { UserRow } from "@/lib/api";
import { getUsersAction, disableUserAction, updateUserAction, activateUserAction } from "@/lib/actions";

export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editingUser, setEditingUser] = useState<UserRow | null>(null);
    const [editForm, setEditForm] = useState({ name: "", dailyBudget: 0, currency: "MXN" });
    const [actionLoading, setActionLoading] = useState(false);

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsersAction(true);
            if (res.error) {
                setError(res.error);
            } else {
                setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleToggleStatus = async (user: UserRow) => {
        if (user.role.toLowerCase() === "admin") return;

        setActionLoading(true);
        try {
            const res = user.isActive ? await disableUserAction(user.id) : await activateUserAction(user.id);
            if (res.error) throw new Error(res.error);

            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
            );
            showToast(`User ${user.isActive ? "disabled" : "activated"} successfully`, "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : `Failed to ${user.isActive ? "disable" : "activate"} user`, "error");
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
                        ? { ...u, name: editForm.name, dailyBudget: editForm.dailyBudget, currency: editForm.currency }
                        : u
                )
            );
            showToast("User updated successfully", "success");
            setEditingUser(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to update user", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <section className="space-y-8">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800/80 rounded-2xl overflow-hidden border border-slate-800/80 shadow-sm">
                <div className="bg-slate-900/50 p-6 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Total users</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{users.length}</p>
                </div>
                <div className="bg-slate-900/50 p-6 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Active users</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{users.filter(u => u.isActive).length}</p>
                </div>
                <div className="bg-slate-900/50 p-6 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Inactive users</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{users.filter(u => !u.isActive).length}</p>
                </div>
                <div className="bg-slate-900/50 p-6 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Admin accounts</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{users.filter(u => u.role.toLowerCase() === 'admin').length}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h3 className="text-base font-semibold leading-7 text-white">Latest activity</h3>
                <div className="w-full sm:w-auto relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500"
                    />
                </div>
            </div>

            {loading && <p className="text-indigo-400 text-sm">Loading users...</p>}
            {error && <p className="text-red-400 text-sm break-all">{error}</p>}

            <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle px-4 sm:px-6 lg:px-8">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="border-b border-slate-800 text-slate-400">
                            <tr>
                                <th scope="col" className="py-3 pl-0 pr-3 font-semibold">User</th>
                                <th scope="col" className="px-3 py-3 font-semibold">Email</th>
                                <th scope="col" className="px-3 py-3 font-semibold">Role</th>
                                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                                <th scope="col" className="relative py-3 pl-3 pr-0 text-right font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {!loading && filteredUsers.length === 0 ? (
                                <tr>
                                    <td className="py-8 text-center text-slate-500" colSpan={5}>No users found</td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="transition-colors hover:bg-slate-800/30 group">
                                        <td className="py-4 pl-0 pr-3 flex items-center gap-x-4">
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
                                                className={`h-8 w-8 rounded-full bg-slate-800 items-center justify-center text-xs text-slate-300 font-medium ${u.avatarUrl ? "hidden" : "flex"}`}
                                            >
                                                {(u.name || "U").slice(0, 1).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{u.name}</span>
                                        </td>
                                        <td className="px-3 py-4 text-slate-400">{u.email}</td>
                                        <td className="px-3 py-4 text-slate-400">
                                            <span className="inline-flex items-center rounded-md bg-slate-400/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-400/20">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-x-2">
                                                <div className={`flex-none rounded-full p-1 border ${u.isActive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-500/10 border-slate-500/20"}`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-500"}`} />
                                                </div>
                                                <span className="text-slate-300">{u.isActive ? "Active" : "Disabled"}</span>
                                            </div>
                                        </td>
                                        <td className="relative py-4 pl-3 pr-0 text-right space-x-4">
                                            <button
                                                onClick={() => openEdit(u)}
                                                disabled={actionLoading}
                                                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors duration-200 font-medium"
                                            >
                                                Edit<span className="sr-only">, {u.name}</span>
                                            </button>
                                            <button
                                                role="switch"
                                                aria-checked={u.isActive}
                                                onClick={() => handleToggleStatus(u)}
                                                disabled={actionLoading || u.role.toLowerCase() === "admin"}
                                                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${u.role.toLowerCase() === "admin" ? "opacity-30 cursor-not-allowed" : ""} ${u.isActive ? "bg-emerald-500 hover:bg-emerald-400" : "bg-slate-600 hover:bg-slate-500"} align-middle`}
                                                title={u.role.toLowerCase() === "admin" ? "Admins cannot be disabled" : u.isActive ? "Disable User" : "Activate User"}
                                            >
                                                <span className="sr-only">Toggle user status</span>
                                                <span
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out ${u.isActive ? "translate-x-5" : "translate-x-0"}`}
                                                />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 animate-in slide-in-from-bottom-5 font-medium border ${toast.type === 'error' ? 'bg-red-950/80 text-red-200 border-red-800' : 'bg-green-950/80 text-green-200 border-green-800'
                    }`}>
                    {toast.message}
                </div>
            )}
        </section>
    );
}
