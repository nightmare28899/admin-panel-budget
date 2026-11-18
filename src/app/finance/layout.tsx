import { redirect } from "next/navigation";
import { getUserToken } from "@/lib/userSession";
import { getUserMeForLayoutAction } from "@/lib/userActions";
import { FinanceShell } from "@/features/finance/FinanceShell";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getUserToken();
  if (!token) redirect("/user-login");

  const profile = await getUserMeForLayoutAction();
  const user = profile.data?.user;
  if (profile.sessionExpired) {
    redirect("/user-login");
  }

  if (profile.error || !user) {
    throw new Error("Unable to load the user profile");
  }

  if (!user.isActive) redirect("/user-login");

  return <FinanceShell user={user}>{children}</FinanceShell>;
}
