"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { userLogoutAction } from "@/lib/userActions";
import { AppShell, type AppShellNavItem, type AppShellUser } from "@/components/layout/AppShell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLocale } from "@/i18n/LocaleProvider";
import { CreateDietLink, NutritionBreadcrumb, NutritionSearch } from "./NutritionTopBar";

// Export PDF prints the page: hide the shell chrome, unlock the scroll container
// and swap the dark theme tokens for paper-friendly ones.
const PRINT_CSS = `@media print {
  html[data-workspace="nutrition"] {
    --bg-0: #fff; --bg-1: #fff; --bg-2: #f4f4f5; --bg-3: #f4f4f5;
    --text-1: #111; --text-2: #222; --text-3: #555;
    --border: #bbb; --border-soft: #ddd;
    --accent-text: #047857; --gold-text: #92400e;
  }
  [data-workspace="nutrition"] aside, [data-workspace="nutrition"] header { display: none !important; }
  [data-workspace="nutrition"] div { height: auto !important; overflow: visible !important; }
}`;

export default function NutritionShell({
  user,
  hasActiveDiet = false,
  children,
}: {
  user: AppShellUser;
  hasActiveDiet?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

  const navItems: AppShellNavItem[] = [
    {
      label: t("today"),
      href: "/nutrition/today",
      icon: (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
          <path d="m9 15 2 2 4-4" />
        </>
      ),
    },
    {
      label: t("nutNavDiet"),
      href: "/nutrition/diet",
      icon: (
        <>
          <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M15 3v3h3M8 11h7M8 15h7M8 19h4" />
        </>
      ),
    },
    {
      label: t("nutNavRecipes"),
      href: "/nutrition/recipes",
      matchNested: true,
      icon: (
        <>
          <path d="M20 3C10 2 3 7 4 14c1 8 14 8 16-11Z" />
          <path d="M4 20 16 8" />
        </>
      ),
    },
    {
      label: t("nutNavFavorites"),
      href: "/nutrition/favorites",
      icon: (
        <path d="M12 21s-7-4.6-9.3-9.1C1.1 8.7 3 5 6.4 5c2 0 3.7 1.1 5.6 3.2C13.9 6.1 15.6 5 17.6 5 21 5 22.9 8.7 21.3 11.9 19 16.4 12 21 12 21Z" />
      ),
    },
    {
      label: t("settings"),
      href: "/nutrition/settings",
      icon: (
        <>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </>
      ),
    },
  ];

  const workspaceItems: AppShellNavItem[] = [
    {
      label: t("personalFinance"),
      href: "/finance/expenses",
      icon: <path d="M3 6h18v12H3zM3 10h18M7 15h3" />,
    },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // One sign-out ends both Personal Finance and Nutrition.
      await userLogoutAction();
      router.replace("/user-login");
    } catch {
      setLoggingOut(false);
      setLogoutConfirmationOpen(false);
    }
  };

  return (
    <>
      <AppShell
        navItems={navItems}
        workspaceItems={workspaceItems}
        user={user}
        onSignOut={() => setLogoutConfirmationOpen(true)}
        signingOut={loggingOut}
        mainClassName=""
        workspace="nutrition"
        brandSubtitle={t("nutBrandSubtitle")}
        activeDot
        headerLead={<NutritionBreadcrumb hasActiveDiet={hasActiveDiet} />}
        headerSearch={<NutritionSearch />}
        headerActions={<CreateDietLink />}
      >
        <style>{PRINT_CSS}</style>
        {children}
      </AppShell>

      <ConfirmModal
        open={logoutConfirmationOpen}
        onClose={() => setLogoutConfirmationOpen(false)}
        onConfirm={handleLogout}
        title={t("signOutQuestion")}
        description={t("nutritionSignOutDescription")}
        confirmLabel={t("signOut")}
        confirmingLabel={t("signingOut")}
        cancelLabel={t("staySignedIn")}
        loading={loggingOut}
      />
    </>
  );
}
