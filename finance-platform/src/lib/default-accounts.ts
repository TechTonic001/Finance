import type { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_ACCOUNTS = [
  { name: "Cash Wallet", type: "CASH" },
  { name: "Bank Account", type: "BANK" },
] as const;

type AccountClient = Pick<PrismaClient, "account">;

export async function ensureDefaultAccounts(client: AccountClient, userId: string) {
  return Promise.all(
    DEFAULT_ACCOUNTS.map(({ name, type }) =>
      client.account.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name, type },
      }),
    ),
  );
}
