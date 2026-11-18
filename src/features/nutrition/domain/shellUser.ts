type Account = { email?: string | null; avatarUrl?: string | null } | null | undefined;

/** User shown in the sidebar: the nutrition profile name plus the account's email and avatar. */
export function shellUser(name: string, account: Account) {
  return { name, email: account?.email ?? "", avatarUrl: account?.avatarUrl ?? null };
}
