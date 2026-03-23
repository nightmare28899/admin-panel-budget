"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
};

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800 transition-colors duration-200"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <div>
              <h1 className="text-lg font-semibold">Budget Admin</h1>
              <p className="text-xs text-slate-400">Users Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-300 hidden sm:inline">
              {user?.name || user?.email} {user?.role ? `(${user.role})` : ""}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 flex gap-6">
        <aside
          className={`overflow-hidden transition-all duration-300 ${
            sidebarOpen ? "w-56 opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="px-2 pb-2 text-xs uppercase tracking-wide text-slate-500">
              Modules
            </p>
            <Link
              href="/dashboard/users"
              className="block rounded-lg px-3 py-2 text-sm font-medium bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
            >
              Users
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
