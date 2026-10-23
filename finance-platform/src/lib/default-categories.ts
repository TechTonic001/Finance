import type { PrismaClient } from "@/generated/prisma/client";

export const DEFAULT_CATEGORIES = [
  { name: "Salary", type: "INCOME" },
  { name: "Freelance & Contracts", type: "INCOME" },
  { name: "Business Profit", type: "INCOME" },
  { name: "Investments & Dividends", type: "INCOME" },
  { name: "Gifts & Allowances", type: "INCOME" },
  { name: "Side Hustle", type: "INCOME" },
  { name: "Other Income", type: "INCOME" },
  { name: "Food & Groceries", type: "EXPENSE" },
  { name: "Rent & Housing", type: "EXPENSE" },
  { name: "Transport & Fuel", type: "EXPENSE" },
  { name: "Data & Airtime", type: "EXPENSE" },
  { name: "Electricity & Utilities", type: "EXPENSE" },
  { name: "Healthcare", type: "EXPENSE" },
  { name: "Education & Courses", type: "EXPENSE" },
  { name: "Entertainment", type: "EXPENSE" },
  { name: "Shopping", type: "EXPENSE" },
  { name: "Savings & Investments", type: "EXPENSE" },
  { name: "Family & Dependents", type: "EXPENSE" },
  { name: "Miscellaneous", type: "EXPENSE" },
] as const;

type CategoryClient = Pick<PrismaClient, "category">;

export async function ensureDefaultCategories(client: CategoryClient, userId: string) {
  return Promise.all(
    DEFAULT_CATEGORIES.map(({ name, type }) =>
      client.category.upsert({
        where: { userId_name: { userId, name } },
        update: { type },
        create: { userId, name, type },
      }),
    ),
  );
}
