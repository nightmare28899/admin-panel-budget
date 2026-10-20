"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCreditCardsAction, userLogoutAction } from "@/lib/userActions";
import { AppShell, type AppShellNavItem } from "@/components/layout/AppShell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CardPaymentAlertsBell } from "./CardPaymentAlertsBell";
import { SubscriptionAlertsBell } from "./SubscriptionAlertsBell";
import { FinanceProvider } from "./FinanceContext";
import { useLocale } from "@/i18n/LocaleProvider";

type FinanceUser = {
  name?: string;
  email?: string;
};

function createWorkspaceItems(t: ReturnType<typeof useLocale>["t"]): AppShellNavItem[] {
  return [
    {
      label: t("nutritionWorkspace"),
      href: "/nutrition/today",
      icon: (
        <>
          <path d="M20 3C10 2 3 7 4 14c1 8 14 8 16-11Z" />
          <path d="M4 20 16 8" />
        </>
      ),
    },
  ];
}

function createNavItems(
  t: ReturnType<typeof useLocale>["t"],
  activeCardCount: number | null,
  pendingCount?: number,
): AppShellNavItem[] {
  return [
  {
    label: t("expenses"),
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
    label: t("pendingPurchasesNav"),
    href: "/finance/pending-expenses",
    badge: pendingCount,
    icon: <><path d="M4 4h16v16H4zM8 9h8M8 13h4" /><path d="m13 16 2 2 4-4" /></>,
  },
  {
    label: t("myCards"),
    href: "/finance/cards",
    badge: activeCardCount ?? undefined,
    icon: (
      <>
        <path d="M3 6h18v12H3zM3 10h18M7 15h3" />
      </>
    ),
  },
  {
    label: t("statements"),
    href: "/finance/statements",
    icon: (
      <>
        <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M15 3v3h3M8 11h7M8 15h7M8 19h4" />
      </>
    ),
  },
  {
    label: t("categories"),
    href: "/finance/categories",
    icon: (
      <>
        <path d="m11 2 8.5 8.5a1 1 0 0 1 0 1.4L13 18.4a1 1 0 0 1-1.4 0L3 9.9V2h8Z" />
        <circle cx="7.5" cy="6.5" r="1.4" />
      </>
    ),
  },
  {
    label: t("subscriptions"),
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
    label: t("reports"),
    href: "/finance/reports",
    icon: (
      <>
        <path d="M4 20V10M12 20V4M20 20v-7" />
      </>
    ),
  },
  ];
}

function PendingBadgeLoader({ children }: { children: (count?: number) => React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState<number>();
  useEffect(() => {
    let cancelled = false;
    void getCreditCardsAction().then((result) => {
      if (!cancelled && !result.error && result.data) {
        setPendingCount(result.data.filter((c) => c.isActive).length);
      }
    });
    return () => { cancelled = true; };
  }, []);
  return <>{children(pendingCount)}</>;
}

function FinanceShellInner({
  user,
  pendingCount,
  children,
}: {
  user: FinanceUser;
  pendingCount?: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

  return (
    <>
      <AppShell
        navItems={createNavItems(t, null, pendingCount)}
        workspaceItems={createWorkspaceItems(t)}
        user={user}
        onSignOut={() => setLogoutConfirmationOpen(true)}
        signingOut={loggingOut}
        mainClassName=""
        workspace="finance"
        headerActions={<div className="flex items-center gap-2"><CardPaymentAlertsBell /><SubscriptionAlertsBell /></div>}
      >
        {children}
      </AppShell>

      <ConfirmModal
        open={logoutConfirmationOpen}
        onClose={() => setLogoutConfirmationOpen(false)}
        onConfirm={handleLogout}
        title={t("signOutQuestion")}
        description={t("financeSignOutDescription")}
        confirmLabel={t("signOut")}
        confirmingLabel={t("signingOut")}
        cancelLabel={t("staySignedIn")}
        loading={loggingOut}
      />
    </>
  );

  function handleLogout() {
    setLoggingOut(true);
    void userLogoutAction().then(() => router.replace("/"));
  }
}

export function FinanceShell({
  user,
  children,
}: {
  user: FinanceUser;
  children: React.ReactNode;
}) {
  return (
    <FinanceProvider>
      <PendingBadgeLoader>
        {(pendingCount) => (
          <FinanceShellInner user={user} pendingCount={pendingCount}>
            {children}
          </FinanceShellInner>
        )}
      </PendingBadgeLoader>
    </FinanceProvider>
  );
}
