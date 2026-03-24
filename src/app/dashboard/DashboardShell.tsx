"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-4">
      <p className="px-2 pb-3 text-xs uppercase tracking-wide text-slate-500">Modules</p>
      <nav className="space-y-2">
        <Link
          href="/dashboard/users"
          onClick={onNavigate}
          className="block rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-3 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/25"
        >
          Users
        </Link>
      </nav>
    </div>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 transition-colors duration-200 hover:bg-slate-800 md:hidden"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg font-semibold">Budget Admin</h1>
              <p className="text-xs text-slate-400">Users Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm md:gap-4">
            <span className="hidden text-slate-300 sm:inline">
              {user?.name || user?.email} {user?.role ? `(${user.role})` : ""}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <SidebarContent />
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-6">
          {children}
        </main>
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close sidebar backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-slate-800 bg-slate-950/95 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">Navigation</p>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="cursor-pointer rounded-lg border border-slate-700 px-2.5 py-1 text-sm hover:bg-slate-800"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
