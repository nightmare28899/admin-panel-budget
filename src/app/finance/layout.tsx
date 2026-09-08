import { redirect } from "next/navigation";
import { getUserToken } from "@/lib/userSession";
import { getUserMeAction } from "@/lib/userActions";
import { FinanceShell } from "@/features/finance/FinanceShell";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getUserToken();
  if (!token) redirect("/user-login");

  const profile = await getUserMeAction();
  const user = profile.data?.user;
  if (profile.error || !user || !user.isActive) {
    redirect("/user-login");
  }

  return <FinanceShell user={user}>{children}</FinanceShell>;
}
