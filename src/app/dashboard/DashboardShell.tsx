"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
};

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard/users" },
  { label: "Users", href: "/dashboard/users" },
  { label: "Deployments", href: "/dashboard/users" },
  { label: "Settings", href: "/dashboard/users" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0b1530] via-[#0b1735] to-[#0a1329] p-4 text-slate-200">
      <div className="mb-5 flex items-center gap-2 px-2">
        <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.9)]" />
        <p className="text-sm font-semibold tracking-wide text-slate-100">Budget Panel</p>
      </div>

      <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">Navigation</p>
      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? "border border-indigo-400/30 bg-indigo-500/20 text-indigo-200"
                  : "border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-slate-800/80 pt-4">
        <p className="px-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">Your teams</p>
        {[
          "Planetaria",
          "Protocol",
          "Tailwind Labs",
        ].map((team) => (
          <div key={team} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-400">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-[10px] text-slate-300">
              {team[0]}
            </span>
            <span>{team}</span>
          </div>
        ))}
      </div>
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
    <div className="min-h-screen bg-[#070f23] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1400px] gap-5 p-4 md:p-6">
        <aside className="hidden w-72 shrink-0 md:block">
          <SidebarContent />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <header className="sticky top-3 z-30 rounded-2xl border border-slate-800/80 bg-[#0a1530]/90 p-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800 md:hidden"
                  aria-label="Open sidebar"
                >
                  ☰
                </button>
                <div className="relative w-[260px] max-w-[70vw]">
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1b3a] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-slate-300 lg:inline">
                  {user?.name || user?.email} {user?.role ? `(${user.role})` : ""}
                </span>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="rounded-2xl border border-slate-800/80 bg-[#0a1631]/80 p-4 md:p-6">{children}</main>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close sidebar backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative h-full w-80 max-w-[88vw] border-r border-slate-800 bg-[#070f23] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">Navigation</p>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm hover:bg-slate-800"
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
