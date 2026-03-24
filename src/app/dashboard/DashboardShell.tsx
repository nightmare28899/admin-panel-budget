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
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 px-6 py-8">
      <div className="mb-8 flex items-center gap-x-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        </div>
        <p className="font-semibold tracking-wide text-white">Budget Panel</p>
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
              className={`flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
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
    <div className="flex h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-hidden">
      <aside className="hidden w-72 shrink-0 md:flex flex-col border-r border-slate-800 bg-slate-950 z-10 relative">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-x-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="text-slate-400 hover:text-white md:hidden"
                aria-label="Open sidebar"
              >
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                 </svg>
              </button>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
                <div className="text-sm font-semibold leading-6 text-white hidden sm:block">
                  {user?.name || user?.email} <span className="text-slate-400 font-normal">{user?.role ? `(${user.role})` : ""}</span>
                </div>
                <div className="hidden sm:block h-6 w-px bg-slate-800" aria-hidden="true" />
                <LogoutButton />
            </div>
          </header>

          <main className="flex-1">
             <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
               {children}
             </div>
          </main>
        </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close sidebar backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
            <aside className="relative my-3 ml-3 h-[calc(100%-1.5rem)] w-80 max-w-[88vw] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl flex flex-col">
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
