    import { ApolloServer, HeaderMap } from "@apollo/server";
    import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
    import type { HTTPGraphQLRequest } from "@apollo/server";
    import { getServerSession } from "next-auth/next";
    import { authOptions } from "@/lib/auth";
    import { ensureDefaultAccounts } from "@/lib/default-accounts";
    import { ensureDefaultCategories } from "@/lib/default-categories";
    import { prisma } from "@/lib/prisma";

    type GraphQLContext = { prisma: typeof prisma; userId?: string };

    function requireOwner(context: GraphQLContext, userId: string) {
        if (!context.userId) {
            throw new GraphQLError("Sign in to access financial data.", {
                extensions: { code: "UNAUTHENTICATED" },
            });
        }
        if (context.userId !== userId) {
            throw new GraphQLError("You cannot access another user's financial data.", {
                extensions: { code: "FORBIDDEN" },
            });
        }
    }

    function mutationError(operation: string, error: unknown): GraphQLError {
        if (error instanceof GraphQLError) {
            return error;
        }

        console.error(`[GraphQL mutation] ${operation} failed:`, error);
        return new GraphQLError(`Unable to ${operation}. Please try again.`, {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }

    const typeDefs = `#graphql
    scalar DateTime

    type User {
        id: ID!
        email: String!
        name: String
        transactions: [Transaction!]!
        budgets: [Budget!]!
        savingsGoals: [SavingsGoal!]!
    }

    type Category {
        id: ID!
        userId: ID!
        name: String!
        type: String
        transactions: [Transaction!]!
        budgets: [Budget!]!
    }

    type Account {
        id: ID!
        name: String!
        type: String!
        balance: Float!
    }

    type Transaction {
        id: ID!
        userId: ID!
        categoryId: ID!
        accountId: ID
        amount: Float!
        type: String!
        description: String
        date: DateTime!
        recurringFrequency: String
        nextOccurrence: DateTime
        createdAt: DateTime!
        category: Category
        account: Account
    }

    type Transfer {
        id: ID!
        fromAccount: Account!
        toAccount: Account!
        amount: Float!
        date: DateTime!
    }

    type MonthlySpendingComparison {
        currentMonth: String!
        previousMonth: String!
        currentSpending: Float!
        previousSpending: Float!
        percentageChange: Float!
    }

    type BudgetStatus {
        budgetId: ID!
        categoryId: ID
        categoryName: String!
        amount: Float!
        spent: Float!
        percentage: Float!
        threshold: Int!
    }

    type Budget {
        id: ID!
        userId: ID!
        categoryId: ID
        amount: Float!
        period: String!
        startDate: DateTime
        endDate: DateTime
        category: Category
    }

    type SavingsGoal {
        id: ID!
        userId: ID!
        name: String!
        targetAmount: Float!
        currentAmount: Float!
        deadline: DateTime
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type UserDashboard {
        totalBalance: Float!
        monthlyIncome: Float!
        monthlyExpenses: Float!
        monthlyTrend: [MonthlyTrendPoint!]!
        expensesByCategory: [CategoryExpense!]!
        categories: [Category!]!
        recentTransactions: [RecentTransaction!]!
        budgets: [Budget!]!
        savingsGoals: [SavingsGoal!]!
    }

    type MonthlyTrendPoint {
        month: String!
        income: Float!
        expenses: Float!
    }

    type CategoryExpense {
        categoryId: ID!
        categoryName: String!
        amount: Float!
    }

    type RecentTransaction {
        id: ID!
        date: DateTime!
        category: Category!
        description: String
        amount: Float!
        type: String!
        status: String!
    }

    type Query {
        getCategories(userId: ID!): [Category!]!
        getAccounts(userId: ID!): [Account!]!
        getTransactions(
            userId: ID!
            categoryId: ID
            type: String
            month: String
            year: Int
            search: String
        ): [Transaction!]!
        getUserDashboard(userId: ID!): UserDashboard!
        getMonthlySpendingComparison(userId: ID!, month: String): MonthlySpendingComparison!
        getBudgetStatuses(userId: ID!, month: String!): [BudgetStatus!]!
        getUpcomingRecurringBills(userId: ID!, month: String!): Float!
        getTransfers(userId: ID!): [Transfer!]!
    }

    type Mutation {
        createAccount(name: String!, type: String!): Account!
        transferFunds(fromAccountId: ID!, toAccountId: ID!, amount: Float!): Transfer!
        addCategory(name: String!, type: String!): Category!
        addTransaction(
        categoryId: String!
        amount: Float!
        type: String!
        description: String
        date: DateTime!
        accountId: ID
        recurringFrequency: String
        ): Transaction!
        updateTransaction(
            id: ID!
            categoryId: ID
            accountId: ID
            amount: Float
            type: String
            description: String
            date: DateTime
            recurringFrequency: String
        ): Transaction!
        deleteTransaction(id: ID!): Boolean!
        processDueRecurringTransactions: Int!
        addBudget(
        categoryId: ID
        amount: Float!
        period: String!
        startDate: DateTime
        endDate: DateTime
        ): Budget!
        addSavingsGoal(
        name: String!
        targetAmount: Float!
        deadline: DateTime
        ): SavingsGoal!
        updateSavingsGoal(
        id: ID!
        name: String
        targetAmount: Float
        currentAmount: Float
        deadline: DateTime
        ): SavingsGoal!
    }
    `;

    const dateTimeScalar = new GraphQLScalarType({
    name: "DateTime",
    description: "An ISO-8601 date-time string.",
    serialize(value) {
        const date = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(date.getTime())) {
        throw new GraphQLError("DateTime value is invalid.");
        }
        return date.toISOString();
    },
    parseValue(value) {
        if (typeof value !== "string" && !(value instanceof Date)) {
        throw new GraphQLError("DateTime input must be an ISO-8601 string.");
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
        throw new GraphQLError("DateTime input is invalid.");
        }
        return date;
    },
    parseLiteral(ast) {
        if (ast.kind !== Kind.STRING) {
        throw new GraphQLError("DateTime input must be an ISO-8601 string.");
        }
        const date = new Date(ast.value);
        if (Number.isNaN(date.getTime())) {
        throw new GraphQLError("DateTime input is invalid.");
        }
        return date;
    },
    });

    function monthDateRange(month: string) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) {
        throw new GraphQLError('The month filter must use "YYYY-MM" format.');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    return {
        gte: new Date(Date.UTC(year, monthIndex, 1)),
        lt: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
    }

    function nextRecurringDate(date: Date, frequency: string): Date {
    if (frequency === "WEEKLY") {
        return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    if (frequency !== "MONTHLY") {
        throw new GraphQLError("Recurring frequency must be WEEKLY or MONTHLY.", {
            extensions: { code: "BAD_USER_INPUT" },
        });
    }
    const year = date.getUTCFullYear();
    const targetMonth = date.getUTCMonth() + 1;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(
        targetYear,
        normalizedMonth,
        Math.min(date.getUTCDate(), lastDay),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds(),
    ));
    }

    function transactionBalanceEffect(amount: number, type: string): number {
    return amount * (type.toUpperCase() === "INCOME" ? 1 : -1);
    }

    function monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    const resolvers = {
    DateTime: dateTimeScalar,
    Query: {
        getCategories: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        await ensureDefaultCategories(context.prisma, args.userId);
        return context.prisma.category.findMany({
            where: { userId: args.userId },
            orderBy: [{ type: "asc" }, { name: "asc" }],
        });
        },
        getAccounts: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        await ensureDefaultAccounts(context.prisma, args.userId);
        return context.prisma.account.findMany({
            where: { userId: args.userId },
            orderBy: { createdAt: "asc" },
        });
        },
        getTransactions: async (
        _parent: unknown,
        args: {
            userId: string;
            categoryId?: string | null;
            type?: string | null;
            month?: string | null;
            year?: number | null;
            search?: string | null;
        },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        if (args.year != null && (!Number.isInteger(args.year) || args.year < 1900 || args.year > 9999)) {
            throw new GraphQLError("Year filter must be between 1900 and 9999.", {
                extensions: { code: "BAD_USER_INPUT" },
            });
        }
        if (args.search && args.search.length > 200) {
            throw new GraphQLError("Search text cannot exceed 200 characters.", {
                extensions: { code: "BAD_USER_INPUT" },
            });
        }
        const dateFilter = args.month
            ? monthDateRange(args.month)
            : args.year
                ? {
                    gte: new Date(Date.UTC(args.year, 0, 1)),
                    lt: new Date(Date.UTC(args.year + 1, 0, 1)),
                }
                : undefined;
        return context.prisma.transaction.findMany({
            where: {
            userId: args.userId,
            ...(args.categoryId ? { categoryId: args.categoryId } : {}),
            ...(args.type ? { type: args.type.toUpperCase() } : {}),
            ...(dateFilter ? { date: dateFilter } : {}),
            ...(args.search?.trim()
                ? { description: { contains: args.search.trim(), mode: "insensitive" as const } }
                : {}),
            },
            include: { category: true, account: true },
            orderBy: { date: "desc" },
        });
        },
        getMonthlySpendingComparison: async (
        _parent: unknown,
        args: { userId: string; month?: string | null },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        const selectedStart = args.month
            ? monthDateRange(args.month).gte
            : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
        const currentEnd = new Date(Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth() + 1, 1));
        const previousStart = new Date(Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth() - 1, 1));
        const [current, previous] = await Promise.all([
            context.prisma.transaction.aggregate({
                where: { userId: args.userId, type: "EXPENSE", date: { gte: selectedStart, lt: currentEnd } },
                _sum: { amount: true },
            }),
            context.prisma.transaction.aggregate({
                where: { userId: args.userId, type: "EXPENSE", date: { gte: previousStart, lt: selectedStart } },
                _sum: { amount: true },
            }),
        ]);
        const currentSpending = Number(current._sum.amount ?? 0);
        const previousSpending = Number(previous._sum.amount ?? 0);
        return {
            currentMonth: monthKey(selectedStart),
            previousMonth: monthKey(previousStart),
            currentSpending,
            previousSpending,
            percentageChange: previousSpending === 0
                ? currentSpending === 0 ? 0 : 100
                : ((currentSpending - previousSpending) / previousSpending) * 100,
        };
        },
        getBudgetStatuses: async (
        _parent: unknown,
        args: { userId: string; month: string },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        const range = monthDateRange(args.month);
        const [budgets, transactions] = await Promise.all([
            context.prisma.budget.findMany({
                where: {
                    userId: args.userId,
                    period: "MONTHLY",
                    OR: [
                        { startDate: null, endDate: null },
                        { startDate: { lt: range.lt }, endDate: { gte: range.gte } },
                        { startDate: { lte: range.gte }, endDate: null },
                        { startDate: null, endDate: { gte: range.gte } },
                    ],
                },
                include: { category: true },
            }),
            context.prisma.transaction.findMany({
                where: {
                    userId: args.userId,
                    type: "EXPENSE",
                    date: range,
                },
                select: { categoryId: true, amount: true },
            }),
        ]);
        const overallSpend = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        return budgets.map((budget) => {
            const spent = budget.categoryId
                ? transactions.reduce((sum, transaction) =>
                    transaction.categoryId === budget.categoryId ? sum + Number(transaction.amount) : sum, 0)
                : overallSpend;
            const percentage = budget.amount.isZero()
                ? 0
                : (spent / Number(budget.amount)) * 100;
            return {
                budgetId: budget.id,
                categoryId: budget.categoryId,
                categoryName: budget.category?.name ?? "All expenses",
                amount: Number(budget.amount),
                spent,
                percentage,
                threshold: percentage >= 100 ? 100 : percentage >= 80 ? 80 : 0,
            };
        });
        },
        getUpcomingRecurringBills: async (
        _parent: unknown,
        args: { userId: string; month: string },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        const range = monthDateRange(args.month);
        const recurringExpenses = await context.prisma.transaction.findMany({
            where: {
                userId: args.userId,
                type: "EXPENSE",
                recurringFrequency: { not: null },
                nextOccurrence: { lt: range.lt },
            },
            select: { amount: true, recurringFrequency: true, nextOccurrence: true },
        });
        let total = 0;
        for (const recurring of recurringExpenses) {
            let occurrence = recurring.nextOccurrence;
            const frequency = recurring.recurringFrequency;
            if (!occurrence || !frequency) continue;
            let occurrencesChecked = 0;
            while (occurrence < range.gte) {
                if (occurrencesChecked >= 1200) {
                    throw new GraphQLError("A recurring schedule could not be calculated for this month.", {
                        extensions: { code: "INTERNAL_SERVER_ERROR" },
                    });
                }
                occurrence = nextRecurringDate(occurrence, frequency);
                occurrencesChecked += 1;
            }
            while (occurrence < range.lt) {
                if (occurrencesChecked >= 1200) {
                    throw new GraphQLError("A recurring schedule could not be calculated for this month.", {
                        extensions: { code: "INTERNAL_SERVER_ERROR" },
                    });
                }
                total += Number(recurring.amount);
                occurrence = nextRecurringDate(occurrence, frequency);
                occurrencesChecked += 1;
            }
        }
        return total;
        },
        getTransfers: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        return context.prisma.transfer.findMany({
            where: { userId: args.userId },
            include: { fromAccount: true, toAccount: true },
            orderBy: { date: "desc" },
        });
        },
        getUserDashboard: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        const now = new Date();
        const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        const sixMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
        const [allTimeTotals, recentPeriodTransactions, budgets, savingsGoals, categories] = await Promise.all([
            context.prisma.transaction.groupBy({
            by: ["type"],
            where: { userId: args.userId },
            _sum: { amount: true },
            }),
            context.prisma.transaction.findMany({
            where: {
                userId: args.userId,
                date: { gte: sixMonthStart, lt: nextMonthStart },
            },
            include: { category: true },
            orderBy: { date: "desc" },
            }),
            context.prisma.budget.findMany({
            where: { userId: args.userId },
            include: { category: true },
            }),
            context.prisma.savingsGoal.findMany({
            where: { userId: args.userId },
            }),
            context.prisma.category.findMany({
            where: { userId: args.userId },
            orderBy: [{ type: "asc" }, { name: "asc" }],
            }),
        ]);

        const incomeTotal = allTimeTotals.find((entry) => entry.type.toUpperCase() === "INCOME");
        const expenseTotal = allTimeTotals.find((entry) => entry.type.toUpperCase() === "EXPENSE");
        const monthlyTransactions = recentPeriodTransactions.filter(
            (transaction) => transaction.date >= currentMonthStart,
        );
        const monthlyIncome = monthlyTransactions.reduce(
            (total, transaction) => transaction.type.toUpperCase() === "INCOME"
                ? total + Number(transaction.amount)
                : total,
            0,
        );
        const monthlyExpenses = monthlyTransactions.reduce(
            (total, transaction) => transaction.type.toUpperCase() === "EXPENSE"
                ? total + Number(transaction.amount)
                : total,
            0,
        );
        const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
            const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
            const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
            const monthTransactions = recentPeriodTransactions.filter((transaction) =>
                transaction.date.getUTCFullYear() === monthDate.getUTCFullYear()
                && transaction.date.getUTCMonth() === monthDate.getUTCMonth(),
            );
            return {
                month: monthKey,
                income: monthTransactions.reduce((sum, transaction) =>
                    transaction.type.toUpperCase() === "INCOME" ? sum + Number(transaction.amount) : sum, 0),
                expenses: monthTransactions.reduce((sum, transaction) =>
                    transaction.type.toUpperCase() === "EXPENSE" ? sum + Number(transaction.amount) : sum, 0),
            };
        });
        const expensesByCategory = monthlyTransactions.reduce<{
            categoryId: string;
            categoryName: string;
            amount: number;
        }[]>((categories, transaction) => {
            if (transaction.type.toUpperCase() !== "EXPENSE") return categories;
            const existing = categories.find((item) => item.categoryId === transaction.categoryId);
            if (existing) {
                existing.amount += Number(transaction.amount);
            } else {
                categories.push({
                    categoryId: transaction.categoryId,
                    categoryName: transaction.category.name,
                    amount: Number(transaction.amount),
                });
            }
            return categories;
        }, []).sort((a, b) => b.amount - a.amount);
        const recentTransactions = recentPeriodTransactions.slice(0, 5).map((transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
            status: "Completed",
        }));

        return {
            totalBalance: Number(incomeTotal?._sum.amount ?? 0) - Number(expenseTotal?._sum.amount ?? 0),
            monthlyIncome,
            monthlyExpenses,
            monthlyTrend,
            expensesByCategory,
            categories,
            recentTransactions,
            budgets,
            savingsGoals,
        };
        },
    },
    User: {
        transactions: (parent: { id: string }, _args: unknown, context: GraphQLContext) =>
        context.prisma.transaction.findMany({ where: { userId: parent.id } }),
        budgets: (parent: { id: string }, _args: unknown, context: GraphQLContext) =>
        context.prisma.budget.findMany({ where: { userId: parent.id } }),
        savingsGoals: (
        parent: { id: string },
        _args: unknown,
        context: GraphQLContext,
        ) => context.prisma.savingsGoal.findMany({ where: { userId: parent.id } }),
    },
    Category: {
        transactions: (
        parent: { id: string },
        _args: unknown,
        context: GraphQLContext,
        ) => context.prisma.transaction.findMany({ where: { categoryId: parent.id } }),
        budgets: (parent: { id: string }, _args: unknown, context: GraphQLContext) =>
        context.prisma.budget.findMany({ where: { categoryId: parent.id } }),
    },
    Transaction: {
        amount: (parent: { amount: unknown }) => Number(parent.amount),
    },
    Account: {
        balance: (parent: { balance: unknown }) => Number(parent.balance),
    },
    Transfer: {
        amount: (parent: { amount: unknown }) => Number(parent.amount),
    },
    Budget: {
        amount: (parent: { amount: unknown }) => Number(parent.amount),
    },
    SavingsGoal: {
        targetAmount: (parent: { targetAmount: unknown }) => Number(parent.targetAmount),
        currentAmount: (parent: { currentAmount: unknown }) => Number(parent.currentAmount),
    },
    Mutation: {
        createAccount: async (
        _parent: unknown,
        args: { name: string; type: string },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to create an account.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const name = args.name.trim();
            const type = args.type.trim().toUpperCase();
            if (!name || !type) {
                throw new GraphQLError("Account name and type are required.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            return await context.prisma.$transaction(async (database) => {
                const account = await database.account.create({
                    data: { userId, name, type },
                });
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "CREATE",
                        entityType: "Account",
                        entityId: account.id,
                        details: { name, type },
                    },
                });
                return account;
            });
        } catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
                throw new GraphQLError("An account with that name already exists.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            throw mutationError("create account", error);
        }
        },
        transferFunds: async (
        _parent: unknown,
        args: { fromAccountId: string; toAccountId: string; amount: number },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to transfer funds.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            if (args.fromAccountId === args.toAccountId) {
                throw new GraphQLError("Choose two different accounts.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            if (!Number.isFinite(args.amount) || args.amount <= 0) {
                throw new GraphQLError("Transfer amount must be greater than zero.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            return await context.prisma.$transaction(async (transaction) => {
                const accounts = await transaction.account.findMany({
                    where: { userId, id: { in: [args.fromAccountId, args.toAccountId] } },
                    select: { id: true },
                });
                if (accounts.length !== 2) {
                    throw new GraphQLError("One or both accounts were not found.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const debit = await transaction.account.updateMany({
                    where: {
                        id: args.fromAccountId,
                        userId,
                        balance: { gte: args.amount },
                    },
                    data: { balance: { decrement: args.amount } },
                });
                if (debit.count !== 1) {
                    throw new GraphQLError("The source account has insufficient funds.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                await transaction.account.update({
                    where: { id: args.toAccountId },
                    data: { balance: { increment: args.amount } },
                });
                const transfer = await transaction.transfer.create({
                    data: {
                        userId,
                        fromAccountId: args.fromAccountId,
                        toAccountId: args.toAccountId,
                        amount: args.amount,
                    },
                    include: { fromAccount: true, toAccount: true },
                });
                await transaction.auditLog.create({
                    data: {
                        userId,
                        action: "TRANSFER",
                        entityType: "Transfer",
                        entityId: transfer.id,
                        details: {
                            fromAccountId: args.fromAccountId,
                            toAccountId: args.toAccountId,
                            amount: args.amount,
                        },
                    },
                });
                return transfer;
            });
        } catch (error) {
            throw mutationError("transfer funds", error);
        }
        },
        addCategory: async (
        _parent: unknown,
        args: { name: string; type: string },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to create a category.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const name = args.name.trim();
            const type = args.type.toUpperCase();
            if (!name) {
                throw new GraphQLError("Category name is required.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            if (!["INCOME", "EXPENSE"].includes(type)) {
                throw new GraphQLError("Category type must be INCOME or EXPENSE.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            return await context.prisma.category.create({
                data: { userId, name, type },
            });
        } catch (error) {
            if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "P2002"
            ) {
                throw new GraphQLError("A category with that name already exists.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            throw mutationError("create category", error);
        }
        },
        addTransaction: async (
        _parent: unknown,
        args: {
            categoryId: string;
            amount: number;
            type: string;
            description?: string | null;
            date: Date;
            accountId?: string | null;
            recurringFrequency?: string | null;
        },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to add a transaction.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }

            if (!Number.isFinite(args.amount) || args.amount <= 0) {
                throw new GraphQLError("Transaction amount must be greater than zero.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            if (!["INCOME", "EXPENSE"].includes(args.type.toUpperCase())) {
                throw new GraphQLError("Transaction type must be INCOME or EXPENSE.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            const recurringFrequency = args.recurringFrequency?.toUpperCase() ?? null;
            if (recurringFrequency && !["WEEKLY", "MONTHLY"].includes(recurringFrequency)) {
                throw new GraphQLError("Recurring frequency must be WEEKLY or MONTHLY.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            const category = await context.prisma.category.findFirst({
                where: { id: args.categoryId, userId },
                select: { id: true, type: true },
            });
            if (!category) {
                throw new GraphQLError("Category not found.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            if (args.accountId) {
                const account = await context.prisma.account.findFirst({
                    where: { id: args.accountId, userId },
                    select: { id: true },
                });
                if (!account) {
                    throw new GraphQLError("Account not found.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
            }

            const transaction = await context.prisma.$transaction(async (database) => {
                const created = await database.transaction.create({
                    data: {
                        categoryId: args.categoryId,
                        accountId: args.accountId ?? null,
                        amount: args.amount,
                        type: args.type.toUpperCase(),
                        description: args.description ?? undefined,
                        date: args.date,
                        recurringFrequency,
                        nextOccurrence: recurringFrequency
                            ? nextRecurringDate(args.date, recurringFrequency)
                            : null,
                        userId,
                    },
                    include: { category: true, account: true },
                });
                if (args.accountId) {
                    await database.account.update({
                        where: { id: args.accountId },
                        data: {
                            balance: {
                                increment: transactionBalanceEffect(args.amount, args.type),
                            },
                        },
                    });
                }
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "CREATE",
                        entityType: "Transaction",
                        entityId: created.id,
                        details: {
                            amount: args.amount,
                            type: args.type.toUpperCase(),
                            accountId: args.accountId ?? null,
                            recurringFrequency,
                        },
                    },
                });
                return created;
            });
            return { ...transaction, amount: Number(transaction.amount) };
        } catch (error) {
            throw mutationError("add transaction", error);
        }
        },
        updateTransaction: async (
        _parent: unknown,
        args: {
            id: string;
            categoryId?: string | null;
            accountId?: string | null;
            amount?: number | null;
            type?: string | null;
            description?: string | null;
            date?: Date | null;
            recurringFrequency?: string | null;
        },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to edit a transaction.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const updated = await context.prisma.$transaction(async (database) => {
                const existing = await database.transaction.findFirst({
                    where: { id: args.id, userId },
                });
                if (!existing) {
                    throw new GraphQLError("Transaction not found.", {
                        extensions: { code: "NOT_FOUND" },
                    });
                }

                const categoryId = args.categoryId === undefined ? existing.categoryId : args.categoryId;
                if (!categoryId) {
                    throw new GraphQLError("A transaction category is required.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const category = await database.category.findFirst({
                    where: { id: categoryId, userId },
                    select: { id: true, type: true },
                });
                if (!category) {
                    throw new GraphQLError("Category not found.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }

                const accountId = args.accountId === undefined ? existing.accountId : args.accountId;
                if (accountId) {
                    const account = await database.account.findFirst({
                        where: { id: accountId, userId },
                        select: { id: true },
                    });
                    if (!account) {
                        throw new GraphQLError("Account not found.", {
                            extensions: { code: "BAD_USER_INPUT" },
                        });
                    }
                }
                const amount = args.amount ?? Number(existing.amount);
                const type = (args.type ?? existing.type).toUpperCase();
                if (category.type && category.type.toUpperCase() !== type) {
                    throw new GraphQLError("Choose a category matching the transaction type.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                if (!Number.isFinite(amount) || amount <= 0) {
                    throw new GraphQLError("Transaction amount must be greater than zero.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                if (!["INCOME", "EXPENSE"].includes(type)) {
                    throw new GraphQLError("Transaction type must be INCOME or EXPENSE.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const date = args.date ?? existing.date;
                const recurringFrequency = args.recurringFrequency === undefined
                    ? existing.recurringFrequency
                    : args.recurringFrequency?.toUpperCase() ?? null;
                if (recurringFrequency && !["WEEKLY", "MONTHLY"].includes(recurringFrequency)) {
                    throw new GraphQLError("Recurring frequency must be WEEKLY or MONTHLY.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                if (args.description !== undefined && args.description !== null && args.description.length > 500) {
                    throw new GraphQLError("Transaction description cannot exceed 500 characters.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const oldEffect = transactionBalanceEffect(Number(existing.amount), existing.type);
                const newEffect = transactionBalanceEffect(amount, type);
                if (existing.accountId && existing.accountId === accountId) {
                    const difference = newEffect - oldEffect;
                    if (difference !== 0) {
                        await database.account.update({
                            where: { id: existing.accountId },
                            data: { balance: { increment: difference } },
                        });
                    }
                } else {
                    if (existing.accountId) {
                        await database.account.update({
                            where: { id: existing.accountId },
                            data: { balance: { decrement: oldEffect } },
                        });
                    }
                    if (accountId) {
                        await database.account.update({
                            where: { id: accountId },
                            data: { balance: { increment: newEffect } },
                        });
                    }
                }

                const updatedTransaction = await database.transaction.update({
                    where: { id: existing.id },
                    data: {
                        categoryId,
                        accountId,
                        amount,
                        type,
                        ...(args.description !== undefined ? { description: args.description } : {}),
                        date,
                        recurringFrequency,
                        nextOccurrence: recurringFrequency
                            ? args.recurringFrequency !== undefined || args.date !== undefined
                                ? nextRecurringDate(date, recurringFrequency)
                                : existing.nextOccurrence
                            : null,
                    },
                    include: { category: true, account: true },
                });
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "UPDATE",
                        entityType: "Transaction",
                        entityId: existing.id,
                        details: {
                            previousAmount: Number(existing.amount),
                            amount,
                            previousAccountId: existing.accountId,
                            accountId,
                            previousType: existing.type,
                            type,
                        },
                    },
                });
                return updatedTransaction;
            });
            return { ...updated, amount: Number(updated.amount) };
        } catch (error) {
            throw mutationError("update transaction", error);
        }
        },
        deleteTransaction: async (
        _parent: unknown,
        args: { id: string },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to delete a transaction.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            return await context.prisma.$transaction(async (database) => {
                const existing = await database.transaction.findFirst({
                    where: { id: args.id, userId },
                });
                if (!existing) {
                    throw new GraphQLError("Transaction not found.", {
                        extensions: { code: "NOT_FOUND" },
                    });
                }
                if (existing.accountId) {
                    await database.account.update({
                        where: { id: existing.accountId },
                        data: {
                            balance: {
                                decrement: transactionBalanceEffect(Number(existing.amount), existing.type),
                            },
                        },
                    });
                }
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "DELETE",
                        entityType: "Transaction",
                        entityId: existing.id,
                        details: {
                            amount: Number(existing.amount),
                            type: existing.type,
                            accountId: existing.accountId,
                        },
                    },
                });
                await database.transaction.delete({ where: { id: existing.id } });
                return true;
            });
        } catch (error) {
            throw mutationError("delete transaction", error);
        }
        },
        processDueRecurringTransactions: async (
        _parent: unknown,
        _args: unknown,
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to process recurring transactions.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const now = new Date();
            const dueTransactions = await context.prisma.transaction.findMany({
                where: {
                    userId,
                    recurringFrequency: { not: null },
                    nextOccurrence: { lte: now },
                },
            });
            let processedCount = 0;
            for (const recurring of dueTransactions) {
                for (let occurrenceIndex = 0; occurrenceIndex < 100; occurrenceIndex += 1) {
                    const nextDate = recurring.nextOccurrence;
                    const frequency = recurring.recurringFrequency;
                    if (!nextDate || !frequency || nextDate > now) break;
                    const advancedDate = nextRecurringDate(nextDate, frequency);
                    const didClaimOccurrence = await context.prisma.$transaction(async (database) => {
                        const claim = await database.transaction.updateMany({
                            where: {
                                id: recurring.id,
                                userId,
                                recurringFrequency: frequency,
                                nextOccurrence: nextDate,
                            },
                            data: { nextOccurrence: advancedDate },
                        });
                        if (claim.count !== 1) return false;
                        const occurrence = await database.transaction.create({
                            data: {
                                userId,
                                categoryId: recurring.categoryId,
                                accountId: recurring.accountId,
                                amount: recurring.amount,
                                type: recurring.type,
                                description: recurring.description,
                                date: nextDate,
                            },
                        });
                        await database.auditLog.create({
                            data: {
                                userId,
                                action: "CREATE",
                                entityType: "RecurringTransaction",
                                entityId: occurrence.id,
                                details: { recurringTransactionId: recurring.id, date: nextDate.toISOString() },
                            },
                        });
                        if (recurring.accountId) {
                            await database.account.update({
                                where: { id: recurring.accountId },
                                data: {
                                    balance: {
                                        increment: transactionBalanceEffect(
                                            Number(recurring.amount),
                                            recurring.type,
                                        ),
                                    },
                                },
                            });
                        }
                        return true;
                    });
                    if (!didClaimOccurrence) break;
                    processedCount += 1;
                    recurring.nextOccurrence = advancedDate;
                }
            }
            return processedCount;
        } catch (error) {
            throw mutationError("process recurring transactions", error);
        }
        },
        addBudget: async (
        _parent: unknown,
        args: {
            categoryId?: string | null;
            amount: number;
            period: string;
            startDate?: Date | null;
            endDate?: Date | null;
        },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to create a budget.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            if (!Number.isFinite(args.amount) || args.amount <= 0) {
                throw new GraphQLError("Budget amount must be greater than zero.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            if (!["MONTHLY", "YEARLY"].includes(args.period.toUpperCase())) {
                throw new GraphQLError("Budget period must be MONTHLY or YEARLY.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            if (args.categoryId) {
                const category = await context.prisma.category.findFirst({
                    where: { id: args.categoryId, userId },
                    select: { id: true },
                });
                if (!category) {
                    throw new GraphQLError("Category not found.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
            }

            return await context.prisma.$transaction(async (database) => {
                const budget = await database.budget.create({
                    data: {
                        userId,
                        categoryId: args.categoryId ?? null,
                        amount: args.amount,
                        period: args.period.toUpperCase(),
                        startDate: args.startDate ?? undefined,
                        endDate: args.endDate ?? undefined,
                    },
                    include: { category: true },
                });
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "CREATE",
                        entityType: "Budget",
                        entityId: budget.id,
                        details: { categoryId: budget.categoryId, amount: args.amount, period: args.period },
                    },
                });
                return budget;
            });
        } catch (error) {
            throw mutationError("create budget", error);
        }
        },
        addSavingsGoal: async (
        _parent: unknown,
        args: { name: string; targetAmount: number; deadline?: Date | null },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to create a savings goal.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const name = args.name.trim();
            if (!name) {
                throw new GraphQLError("Savings goal name is required.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            if (!Number.isFinite(args.targetAmount) || args.targetAmount <= 0) {
                throw new GraphQLError("Savings goal target must be greater than zero.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            return await context.prisma.$transaction(async (database) => {
                const goal = await database.savingsGoal.create({
                    data: {
                        userId,
                        name,
                        targetAmount: args.targetAmount,
                        ...(args.deadline ? { deadline: args.deadline } : {}),
                    },
                });
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "CREATE",
                        entityType: "SavingsGoal",
                        entityId: goal.id,
                        details: { name, targetAmount: args.targetAmount },
                    },
                });
                return goal;
            });
        } catch (error) {
            throw mutationError("create savings goal", error);
        }
        },
        updateSavingsGoal: async (
        _parent: unknown,
        args: {
            id: string;
            name?: string | null;
            targetAmount?: number | null;
            currentAmount?: number | null;
            deadline?: Date | null;
        },
        context: GraphQLContext,
        ) => {
        try {
            const userId = context.userId;
            if (!userId) {
                throw new GraphQLError("Sign in to update a savings goal.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }

            const { id, ...updates } = args;
            return await context.prisma.$transaction(async (database) => {
                const goal = await database.savingsGoal.findFirst({
                    where: { id, userId },
                });
                if (!goal) {
                    throw new GraphQLError("Savings goal not found.", {
                        extensions: { code: "FORBIDDEN" },
                    });
                }
                if (
                    (updates.targetAmount != null && (!Number.isFinite(updates.targetAmount) || updates.targetAmount <= 0))
                    || (updates.currentAmount != null && (!Number.isFinite(updates.currentAmount) || updates.currentAmount < 0))
                ) {
                    throw new GraphQLError("Savings amounts must be valid and non-negative.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const updated = await database.savingsGoal.update({
                    where: { id },
                    data: Object.fromEntries(
                        Object.entries(updates).filter(([, value]) => value !== undefined),
                    ),
                });
                await database.auditLog.create({
                    data: {
                        userId,
                        action: "UPDATE",
                        entityType: "SavingsGoal",
                        entityId: id,
                        details: {
                            previousAmount: Number(goal.currentAmount),
                            currentAmount: updates.currentAmount ?? Number(goal.currentAmount),
                        },
                    },
                });
                return updated;
            });
        } catch (error) {
            throw mutationError("update savings goal", error);
        }
        },
    },
    };

    const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
    let serverStart: Promise<void> | undefined;

    async function handleGraphQLRequest(request: Request): Promise<Response> {
    // Apollo handles GraphQL parsing/execution; this adapts Web Request to Next's route handler.
    serverStart ??= server.start();
    await serverStart;

    const url = new URL(request.url);
    let body: unknown;
    if (request.method === "POST") {
        try {
            body = await request.json();
        } catch (error) {
            console.error("[GraphQL request] Unable to parse POST body:", error);
            return Response.json(
                { errors: [{ message: "Request body must contain valid JSON." }] },
                { status: 400 },
            );
        }
    }

    const httpGraphQLRequest: HTTPGraphQLRequest = {
        method: request.method,
        headers: new HeaderMap(request.headers.entries()),
        search: url.search,
        body,
    };
    const result = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
    context: async () => {
        const session = await getServerSession(authOptions);
        return { prisma, userId: session?.user?.id };
    },
    });

    const headers = new Headers();
    result.headers.forEach((value, key) => headers.set(key, value));

    if (result.body.kind === "complete") {
        return new Response(result.body.string, {
        status: result.status ?? 200,
        headers,
        });
    }

    const encoder = new TextEncoder();
    const iterator = result.body.asyncIterator;
    const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
        const next = await iterator.next();
        if (next.done) {
            controller.close();
        } else {
            controller.enqueue(encoder.encode(next.value));
        }
        },
        async cancel() {
        await iterator.return?.();
        },
    });

    return new Response(stream, { status: result.status ?? 200, headers });
    }

    export const GET = handleGraphQLRequest;
    export const POST = handleGraphQLRequest;
