import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ensureDefaultCategories } from "../src/lib/default-categories";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.resolve(appDirectory, "..", ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before seeding.");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed the database in production.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
const demoEmail = "test@example.com";
const demoPassword = "LedgerDemo2026!";

async function main() {
  const passwordHash = await hash(demoPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { name: "Ledger Demo", password: passwordHash },
    create: { email: demoEmail, name: "Ledger Demo", password: passwordHash },
  });

  const categories = new Map<string, string>();
  const defaultCategories = await ensureDefaultCategories(prisma, user.id);
  for (const category of defaultCategories) {
    categories.set(category.name, category.id);
  }

  const transactions = [];
  const now = new Date();
  const monthlyValues = [
    { salary: 5800, freelance: 680, groceries: 515, transport: 118, utilities: 164 },
    { salary: 5800, freelance: 920, groceries: 548, transport: 102, utilities: 181 },
    { salary: 6000, freelance: 740, groceries: 572, transport: 126, utilities: 173 },
    { salary: 6000, freelance: 1100, groceries: 535, transport: 115, utilities: 192 },
    { salary: 6200, freelance: 860, groceries: 590, transport: 134, utilities: 185 },
    { salary: 6200, freelance: 1250, groceries: 563, transport: 121, utilities: 177 },
  ];

  for (const [index, values] of monthlyValues.entries()) {
    const transactionMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (monthlyValues.length - 1 - index),
      1,
    );
    const lastDay = new Date(
      transactionMonth.getFullYear(),
      transactionMonth.getMonth() + 1,
      0,
    ).getDate();
    const latestDay = index === monthlyValues.length - 1 ? now.getDate() : lastDay;
    const dateFor = (day: number) =>
      new Date(
        transactionMonth.getFullYear(),
        transactionMonth.getMonth(),
        Math.min(day, latestDay),
        12,
      );
    const monthDate = dateFor(1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    transactions.push(
      {
        id: `seed-${monthKey}-salary`,
        category: "Salary",
        amount: values.salary,
        type: "INCOME",
        description: "Monthly salary",
        date: dateFor(2),
      },
      {
        id: `seed-${monthKey}-freelance`,
        category: "Freelance & Contracts",
        amount: values.freelance,
        type: "INCOME",
        description: "Design project payment",
        date: dateFor(5),
      },
      {
        id: `seed-${monthKey}-rent`,
        category: "Rent & Housing",
        amount: 1850,
        type: "EXPENSE",
        description: "Apartment rent",
        date: dateFor(7),
      },
      {
        id: `seed-${monthKey}-groceries`,
        category: "Food & Groceries",
        amount: values.groceries,
        type: "EXPENSE",
        description: "Groceries and household supplies",
        date: dateFor(13),
      },
      {
        id: `seed-${monthKey}-transport`,
        category: "Transport & Fuel",
        amount: values.transport,
        type: "EXPENSE",
        description: "Transit and rideshare",
        date: dateFor(19),
      },
      {
        id: `seed-${monthKey}-utilities`,
        category: "Electricity & Utilities",
        amount: values.utilities,
        type: "EXPENSE",
        description: "Utilities and internet",
        date: dateFor(24),
      },
    );
  }

  await prisma.transaction.deleteMany({
    where: { userId: user.id, id: { startsWith: "seed-" } },
  });

  for (const transaction of transactions) {
    const categoryId = categories.get(transaction.category);
    if (!categoryId) throw new Error(`Missing category: ${transaction.category}`);

    await prisma.transaction.upsert({
      where: { id: transaction.id },
      update: {
        userId: user.id,
        categoryId,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        date: transaction.date,
      },
      create: {
        id: transaction.id,
        userId: user.id,
        categoryId,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        date: transaction.date,
      },
    });
  }

  const rentCategoryId = categories.get("Rent & Housing");
  if (!rentCategoryId) throw new Error("Missing Rent & Housing category.");

  await prisma.budget.upsert({
    where: { id: "seed-monthly-rent-budget" },
    update: {
      userId: user.id,
      categoryId: rentCategoryId,
      amount: 1900,
      period: "MONTHLY",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    },
    create: {
      id: "seed-monthly-rent-budget",
      userId: user.id,
      categoryId: rentCategoryId,
      amount: 1900,
      period: "MONTHLY",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    },
  });

  await prisma.savingsGoal.upsert({
    where: { id: "seed-emergency-fund-goal" },
    update: {
      userId: user.id,
      name: "Emergency fund",
      targetAmount: 15000,
      currentAmount: 6250,
      deadline: new Date(now.getFullYear() + 1, now.getMonth(), 1),
    },
    create: {
      id: "seed-emergency-fund-goal",
      userId: user.id,
      name: "Emergency fund",
      targetAmount: 15000,
      currentAmount: 6250,
      deadline: new Date(now.getFullYear() + 1, now.getMonth(), 1),
    },
  });

  console.log(`Seeded ${demoEmail} with ${transactions.length} transactions.`);
  console.log(`Demo login password: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });