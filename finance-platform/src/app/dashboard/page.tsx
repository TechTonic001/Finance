"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import NewTransactionModal from "@/components/NewTransactionModal";
import { formatCurrency } from "@/lib/formatters";
import {
  GET_BUDGET_STATUSES,
  GET_DASHBOARD_DATA,
  GET_MONTHLY_SPENDING_COMPARISON,
  PROCESS_DUE_RECURRING_TRANSACTIONS,
} from "@/lib/graphql/queries";

type DashboardData = {
  getUserDashboard: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyTrend: { month: string; income: number; expenses: number }[];
    expensesByCategory: { categoryId: string; categoryName: string; amount: number }[];
    recentTransactions: {
      id: string;
      date: string;
      category: { name: string };
      description: string | null;
      amount: number;
      type: string;
      status: string;
    }[];
  };
};
type BudgetStatus = {
  budgetId: string;
  categoryName: string;
  amount: number;
  spent: number;
  percentage: number;
  threshold: number;
};
type BudgetStatusesData = { getBudgetStatuses: BudgetStatus[] };
type SpendingComparison = {
  currentMonth: string;
  previousMonth: string;
  currentSpending: number;
  previousSpending: number;
  percentageChange: number;
};
type SpendingComparisonData = { getMonthlySpendingComparison: SpendingComparison };

const chartColors = ["#16715a", "#e49a42", "#4b7b9c", "#b65e57", "#83944b", "#876da8"];
const currentMonth = new Date().toISOString().slice(0, 7);
function formatMonth(value: ReactNode) {
  if (typeof value !== "string") return "";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function MetricCard({ label, amount, tone }: { label: string; amount: number; tone: "balance" | "income" | "expense" }) {
  const Icon = tone === "income" ? ArrowUpRight : ArrowDownRight;
  return (
    <article className="border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500">{label}</h2>
        {tone !== "balance" && <Icon aria-hidden="true" className={tone === "income" ? "text-emerald-700" : "text-rose-700"} size={18} />}
      </div>
      <p className="mt-5 text-2xl font-semibold tabular-nums text-zinc-950 sm:text-3xl">{formatCurrency(amount)}</p>
      <p className="mt-2 text-xs text-zinc-400">{tone === "balance" ? "Current balance" : "This month"}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [recurringError, setRecurringError] = useState("");
  const processedForUser = useRef<string | null>(null);
  const userId = session?.user?.id ?? "";
  const queryOptions = {
    variables: { userId },
    skip: status !== "authenticated" || !userId,
  };
  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD_DATA, {
    ...queryOptions,
    fetchPolicy: "cache-and-network",
  });
  const { data: budgetData, error: budgetError } = useQuery<BudgetStatusesData>(GET_BUDGET_STATUSES, {
    variables: { userId, month: currentMonth },
    skip: status !== "authenticated" || !userId,
  });
  const { data: comparisonData, error: comparisonError } = useQuery<SpendingComparisonData>(
    GET_MONTHLY_SPENDING_COMPARISON,
    { variables: { userId, month: currentMonth }, skip: status !== "authenticated" || !userId },
  );
  const [processRecurring] = useMutation(PROCESS_DUE_RECURRING_TRANSACTIONS, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
  });
  useEffect(() => {
    if (status !== "authenticated" || !userId || processedForUser.current === userId) return;
    processedForUser.current = userId;
    processRecurring().catch((processingError: unknown) => {
      console.error("Recurring transaction processing failed:", processingError);
      setRecurringError(
        processingError instanceof Error
          ? processingError.message
          : "Recurring transactions could not be processed.",
      );
    });
  }, [processRecurring, status, userId]);
  const dashboard = data?.getUserDashboard;
  const budgetAlerts = (budgetData?.getBudgetStatuses ?? []).filter((budget) => budget.threshold >= 80);
  const comparison = comparisonData?.getMonthlySpendingComparison;

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-950">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">A clear view of your money, month by month.</p>
        </div>
        <button className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900" onClick={() => setModalOpen(true)} type="button">
          <Plus aria-hidden="true" size={18} /> Add transaction
        </button>
      </div>

      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Dashboard data could not be loaded: {error.message}</p>}
      {recurringError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Recurring items could not be processed: {recurringError}</p>}
      {budgetError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Budget notifications could not be loaded: {budgetError.message}</p>}
      {budgetAlerts.length > 0 && (
        <aside aria-label="Budget threshold notifications" className={`border px-5 py-4 ${budgetAlerts.some((budget) => budget.threshold === 100) ? "border-rose-300 bg-rose-50 text-rose-900" : "border-amber-300 bg-amber-50 text-amber-950"}`} role="status">
          <h2 className="font-semibold">Budget threshold notification</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {budgetAlerts.map((budget) => (
              <li key={budget.budgetId}>
                <strong>{budget.categoryName}</strong>: {Math.round(budget.percentage)}% used
                ({formatCurrency(budget.spent)} of {formatCurrency(budget.amount)})
                {budget.threshold === 100 ? " — budget reached or exceeded." : " — approaching your limit."}
              </li>
            ))}
          </ul>
        </aside>
      )}
      {comparisonError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Monthly spending comparison could not be loaded: {comparisonError.message}</p>}
      {comparison && (
        <section aria-label="Monthly spending comparison" className="flex flex-col gap-2 border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-zinc-950">Monthly spending comparison</h2>
            <p className="mt-1 text-sm text-zinc-500">{comparison.currentMonth} vs. {comparison.previousMonth}</p>
          </div>
          <div className="text-sm text-zinc-700">
            {formatCurrency(comparison.currentSpending)} this month · {formatCurrency(comparison.previousSpending)} last month ·{" "}
            <span className={`font-semibold ${comparison.percentageChange > 0 ? "text-rose-700" : "text-emerald-800"}`}>
              {comparison.percentageChange > 0 ? "+" : ""}{comparison.percentageChange.toFixed(1)}%
            </span>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard amount={dashboard?.totalBalance ?? 0} label="Total balance" tone="balance" />
        <MetricCard amount={dashboard?.monthlyIncome ?? 0} label="Income" tone="income" />
        <MetricCard amount={dashboard?.monthlyExpenses ?? 0} label="Expenses" tone="expense" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <section className="border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-zinc-950">Cash flow</h2>
            <p className="mt-1 text-sm text-zinc-500">Income and expenses over six months</p>
          </div>
          <div className="h-64 w-full">
            {loading && !dashboard ? <div className="grid h-full place-items-center text-sm text-zinc-400">Loading cash flow...</div> : (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={dashboard?.monthlyTrend ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="#e7ebe8" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="month" tickFormatter={formatMonth} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(value: number) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={formatMonth} />
                  <Line dataKey="income" dot={false} name="Income" stroke="#16715a" strokeWidth={2.5} type="monotone" />
                  <Line dataKey="expenses" dot={false} name="Expenses" stroke="#e49a42" strokeWidth={2.5} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-950">Spending by category</h2>
          <p className="mt-1 text-sm text-zinc-500">Expense breakdown this month</p>
          <div className="relative mt-3 h-52 w-full">
            {loading && !dashboard ? <div className="grid h-full place-items-center text-sm text-zinc-400">Loading categories...</div> : dashboard?.expensesByCategory.length ? (
              <>
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie data={dashboard.expensesByCategory} dataKey="amount" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none">
                      {dashboard.expensesByCategory.map((item, index) => <Cell fill={chartColors[index % chartColors.length]} key={item.categoryId} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-500">Spent</span>
                  <span className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{formatCurrency(dashboard.monthlyExpenses)}</span>
                </div>
              </>
            ) : <div className="grid h-full place-items-center text-sm text-zinc-400">No expenses this month</div>}
          </div>
          <ul className="mt-2 space-y-2">
            {dashboard?.expensesByCategory.map((item, index) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={item.categoryId}>
                <span className="flex min-w-0 items-center gap-2 text-zinc-600"><i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span className="truncate">{item.categoryName}</span></span>
                <span className="shrink-0 font-medium tabular-nums text-zinc-900">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border border-zinc-200 bg-white">
        <div className="flex items-end justify-between border-b border-zinc-200 px-5 py-5 sm:px-6">
          <div><h2 className="text-base font-semibold text-zinc-950">Recent transactions</h2><p className="mt-1 text-sm text-zinc-500">Your latest account activity</p></div>
          <span className="text-xs text-zinc-400">Last 5</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3 sm:px-6">Date</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Description</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right sm:px-6">Status</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {dashboard?.recentTransactions.map((transaction) => {
                const isIncome = transaction.type.toUpperCase() === "INCOME";
                return <tr className="text-zinc-700" key={transaction.id}>
                  <td className="whitespace-nowrap px-5 py-4 tabular-nums sm:px-6">{new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="whitespace-nowrap px-5 py-4">{transaction.category.name}</td>
                  <td className="max-w-56 truncate px-5 py-4 text-zinc-500">{transaction.description || "—"}</td>
                  <td className={`whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums ${isIncome ? "text-emerald-800" : "text-zinc-900"}`}>{isIncome ? "+" : "−"}{formatCurrency(transaction.amount)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-emerald-800 sm:px-6">{transaction.status}</td>
                </tr>;
              })}
              {!loading && dashboard?.recentTransactions.length === 0 && <tr><td className="px-6 py-10 text-center text-zinc-500" colSpan={5}>No transactions yet.</td></tr>}
              {loading && !dashboard && <tr><td className="px-6 py-10 text-center text-zinc-500" colSpan={5}>Loading transactions...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <NewTransactionModal
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        userId={userId}
      />
    </section>
  );
}