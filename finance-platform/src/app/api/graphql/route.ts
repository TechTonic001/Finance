    import { ApolloServer, HeaderMap } from "@apollo/server";
    import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
    import type { HTTPGraphQLRequest } from "@apollo/server";
    import { getServerSession } from "next-auth/next";
    import { authOptions } from "@/lib/auth";
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

    type Transaction {
        id: ID!
        userId: ID!
        categoryId: ID!
        amount: Float!
        type: String!
        description: String
        date: DateTime!
        createdAt: DateTime!
        category: Category
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
        getTransactions(userId: ID!, categoryId: ID, month: String): [Transaction!]!
        getUserDashboard(userId: ID!): UserDashboard!
    }

    type Mutation {
        addTransaction(
        categoryId: String!
        amount: Float!
        type: String!
        description: String
        date: DateTime!
        ): Transaction!
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

    const resolvers = {
    DateTime: dateTimeScalar,
    Query: {
        getTransactions: async (
        _parent: unknown,
        args: { userId: string; categoryId?: string | null; month?: string | null },
        context: GraphQLContext,
        ) => {
        requireOwner(context, args.userId);
        return context.prisma.transaction.findMany({
            where: {
            userId: args.userId,
            ...(args.categoryId ? { categoryId: args.categoryId } : {}),
            ...(args.month ? { date: monthDateRange(args.month) } : {}),
            },
            include: { category: true },
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
    Mutation: {
        addTransaction: async (
        _parent: unknown,
        args: {
            categoryId: string;
            amount: number;
            type: string;
            description?: string | null;
            date: Date;
        },
        context: GraphQLContext,
        ) => {
        try {
            if (!context.userId) {
                throw new GraphQLError("Sign in to add a transaction.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const category = await context.prisma.category.findFirst({
                where: { id: args.categoryId, userId: context.userId },
                select: { id: true },
            });
            if (!category) {
                throw new GraphQLError("Category not found.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            return context.prisma.transaction.create({
                data: {
                    ...args,
                    userId: context.userId,
                    description: args.description ?? undefined,
                },
                include: { category: true },
            });
        } catch (error) {
            if (error instanceof GraphQLError) throw error;
            console.error("GraphQL addTransaction failed.", error);
            throw new GraphQLError("Unable to save the transaction. Please try again.", {
                extensions: { code: "INTERNAL_SERVER_ERROR" },
            });
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
            if (!context.userId) {
                throw new GraphQLError("Sign in to update a savings goal.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const { id, ...updates } = args;
            const goal = await context.prisma.savingsGoal.findUnique({
                where: { id },
                select: { userId: true },
            });
            if (!goal || goal.userId !== context.userId) {
                throw new GraphQLError("Savings goal not found.", {
                    extensions: { code: "FORBIDDEN" },
                });
            }
            return await context.prisma.savingsGoal.update({
                where: { id },
                data: Object.fromEntries(
                    Object.entries(updates).filter(([, value]) => value !== undefined),
                ),
            });
        } catch (error) {
            if (error instanceof GraphQLError) throw error;
            console.error("GraphQL updateSavingsGoal failed.", error);
            throw new GraphQLError("Unable to update the savings goal. Please try again.", {
                extensions: { code: "INTERNAL_SERVER_ERROR" },
            });
        }
        },
    },
    };

    const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
    let serverStart: Promise<void> | undefined;

    async function handleGraphQLRequest(request: Request): Promise<Response> {
    // Apollo handles GraphQL parsing/execution; this adapts Web Request to Next's route handler.
    try {
        serverStart ??= server.start();
        await serverStart;

        const url = new URL(request.url);
        let body: unknown;
        if (request.method === "POST") {
            try {
                body = await request.json();
            } catch {
                return Response.json(
                    { errors: [{ message: "Request body must be valid JSON." }] },
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
    } catch (error) {
        console.error("GraphQL request failed unexpectedly.", error);
        return Response.json(
            { errors: [{ message: "The GraphQL request could not be completed." }] },
            { status: 500 },
        );
    }
    }

    export const GET = handleGraphQLRequest;
    export const POST = handleGraphQLRequest;
