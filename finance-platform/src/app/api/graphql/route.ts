import { ApolloServer, HeaderMap } from "@apollo/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import type { HTTPGraphQLRequest } from "@apollo/server";

// Prisma 7 uses a driver adapter; reuse the client during Next.js hot reloads.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to connect to PostgreSQL.");
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

type GraphQLContext = { prisma: PrismaClient };

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
    totalIncome: Float!
    totalExpenses: Float!
    budgets: [Budget!]!
    savingsGoals: [SavingsGoal!]!
  }

  type Query {
    getTransactions(userId: ID!, categoryId: ID, month: String): [Transaction!]!
    getUserDashboard(userId: ID!): UserDashboard!
  }

  type Mutation {
    addTransaction(
      userId: ID!
      categoryId: ID!
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
    ) =>
      context.prisma.transaction.findMany({
        where: {
          userId: args.userId,
          ...(args.categoryId ? { categoryId: args.categoryId } : {}),
          ...(args.month ? { date: monthDateRange(args.month) } : {}),
        },
        include: { category: true },
        orderBy: { date: "desc" },
      }),
    getUserDashboard: async (
      _parent: unknown,
      args: { userId: string },
      context: GraphQLContext,
    ) => {
      const [transactions, budgets, savingsGoals] = await Promise.all([
        context.prisma.transaction.findMany({
          where: { userId: args.userId },
          select: { amount: true, type: true },
        }),
        context.prisma.budget.findMany({
          where: { userId: args.userId },
          include: { category: true },
        }),
        context.prisma.savingsGoal.findMany({
          where: { userId: args.userId },
        }),
      ]);

      const totalIncome = transactions.reduce(
        (total: number, transaction: { amount: number | string; type: string }) =>
          transaction.type.toUpperCase() === "INCOME"
            ? total + Number(transaction.amount)
            : total,
        0,
      );
      const totalExpenses = transactions.reduce(
        (total: number, transaction: { amount: number | string; type: string }) =>
          transaction.type.toUpperCase() === "EXPENSE"
            ? total + Number(transaction.amount)
            : total,
        0,
      );

      return {
        totalBalance: totalIncome - totalExpenses,
        totalIncome,
        totalExpenses,
        budgets,
        savingsGoals,
      };
    },
  },
  Mutation: {
    addTransaction: (
      _parent: unknown,
      args: {
        userId: string;
        categoryId: string;
        amount: number;
        type: string;
        description?: string | null;
        date: Date;
      },
      context: GraphQLContext,
    ) =>
      context.prisma.transaction.create({
        data: {
          ...args,
          description: args.description ?? undefined,
        },
        include: { category: true },
      }),
    updateSavingsGoal: (
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
      const { id, ...updates } = args;
      return context.prisma.savingsGoal.update({
        where: { id },
        data: Object.fromEntries(
          Object.entries(updates).filter(([, value]) => value !== undefined),
        ),
      });
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
  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
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
    context: async () => ({ prisma }),
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
export const runtime = "nodejs";