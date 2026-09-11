"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { userLogoutAction } from "@/lib/userActions";
import { AppShell, type AppShellNavItem } from "@/components/layout/AppShell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SubscriptionAlertsBell } from "./SubscriptionAlertsBell";

type FinanceUser = {
  name?: string;
  email?: string;
};

const PAGE_TITLES: Record<string, string> = {
  "/finance/expenses": "Expenses",
  "/finance/cards": "My Cards",
  "/finance/statements": "Card statements",
  "/finance/categories": "Categories",
  "/finance/subscriptions": "Subscriptions",
  "/finance/reports": "Reports",
};

const NAV_ITEMS: AppShellNavItem[] = [
  {
    label: "Expenses",
    href: "/finance/expenses",
    icon: (
      <>
        <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M15 3v3h3" />
        <path d="M8 12h8M8 16h8M8 8h4" />
      </>
    ),
  },
  {
    label: "My Cards",
    href: "/finance/cards",
    icon: (
      <>
        <path d="M3 6h18v12H3zM3 10h18M7 15h3" />
      </>
    ),
  },
  {
    label: "Statements",
    href: "/finance/statements",
    icon: (
      <>
        <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M15 3v3h3M8 11h7M8 15h7M8 19h4" />
      </>
    ),
  },
  {
    label: "Categories",
    href: "/finance/categories",
    icon: (
      <>
        <path d="m11 2 8.5 8.5a1 1 0 0 1 0 1.4L13 18.4a1 1 0 0 1-1.4 0L3 9.9V2h8Z" />
        <circle cx="7.5" cy="6.5" r="1.4" />
      </>
    ),
  },
  {
    label: "Subscriptions",
    href: "/finance/subscriptions",
    icon: (
      <>
        <path d="M17 2.1 21 6l-4 3.9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 21.9 3 18l4-3.9" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
  {
    label: "Reports",
    href: "/finance/reports",
    icon: (
      <>
        <path d="M4 20V10M12 20V4M20 20v-7" />
      </>
    ),
  },
];

export function FinanceShell({
  user,
  children,
}: {
  user: FinanceUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await userLogoutAction();
    router.replace("/");
  };

  return (
    <>
      <AppShell
        navItems={NAV_ITEMS}
        pageTitles={PAGE_TITLES}
        defaultTitle="Budget Panel"
        user={user}
        onSignOut={() => setLogoutConfirmationOpen(true)}
        signingOut={loggingOut}
        mainClassName=""
        headerActions={<SubscriptionAlertsBell />}
      >
        {children}
      </AppShell>

      <ConfirmModal
        open={logoutConfirmationOpen}
        onClose={() => setLogoutConfirmationOpen(false)}
        onConfirm={handleLogout}
        title="Sign out?"
        description="You will need to sign in again to access your personal finance workspace."
        confirmLabel="Sign out"
        confirmingLabel="Signing out…"
        cancelLabel="Stay signed in"
        loading={loggingOut}
      />
    </>
  );
}
