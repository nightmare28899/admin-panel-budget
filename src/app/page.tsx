import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-0)] px-6 py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,var(--emerald-dim),transparent_68%)]"
        aria-hidden="true"
      />

      <section className="relative w-full max-w-4xl" aria-labelledby="platform-heading">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--emerald)] shadow-[0_12px_32px_var(--emerald-dim)]">
            <span className="font-serif text-2xl leading-none text-[var(--bg-0)]" aria-hidden="true">
              B
            </span>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--emerald-text)]">
            Budget Panel
          </p>
          <h1 id="platform-heading" className="font-serif text-4xl font-semibold text-[var(--text-1)] sm:text-5xl">
            Choose your workspace
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
            Select the platform you want to access. You will continue to its secure sign-in page.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/login"
            className="group flex min-h-64 flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-2)] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--emerald)]/50 hover:shadow-[0_18px_45px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg-0)] sm:p-8"
          >
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-3)] text-[var(--emerald-text)] transition-colors group-hover:border-[var(--emerald)]/50 group-hover:bg-[var(--emerald-dim)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V8l7-4 7 4v13M9 12h.01M9 16h.01M15 12h.01M15 16h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-1)]">Admin platform</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-3)]">
              Manage users, notifications, permissions, and platform administration.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--emerald-text)]">
              Continue as administrator
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </span>
          </Link>

          <Link
            href="/user-login"
            className="group flex min-h-64 flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-2)] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--info)]/50 hover:shadow-[0_18px_45px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--info)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg-0)] sm:p-8"
          >
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-3)] text-[var(--info-text)] transition-colors group-hover:border-[var(--info)]/50 group-hover:bg-[var(--info-dim)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18v12H3zM3 10h18M7 15h3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-1)]">Personal finance</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-3)]">
              Track expenses, categories, subscriptions, and financial reports.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--info-text)]">
              Continue to your finances
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
