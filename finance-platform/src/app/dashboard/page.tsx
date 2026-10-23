"use client";

import { useQuery } from "@apollo/client/react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";
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
import { GET_DASHBOARD_DATA } from "@/lib/graphql/queries";

type DashboardData = {
  getUserDashboard: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyTrend: { month: string; income: number; expenses: number }[];
    expensesByCategory: { categoryId: string; categoryName: string; amount: number }[];
    categories: { id: string; name: string; type: string | null }[];
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

const chartColors = ["#16715a", "#e49a42", "#4b7b9c", "#b65e57", "#83944b", "#876da8"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

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
      <p className="mt-5 text-2xl font-semibold tabular-nums text-zinc-950 sm:text-3xl">{currency.format(amount)}</p>
      <p className="mt-2 text-xs text-zinc-400">{tone === "balance" ? "Current balance" : "This month"}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const userId = session?.user?.id;
  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD_DATA, {
    variables: { userId: userId ?? "" },
    skip: status !== "authenticated" || !userId,
    fetchPolicy: "cache-and-network",
  });
  const dashboard = data?.getUserDashboard;

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
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(value: number) => `$${value}`} />
                  <Tooltip formatter={(value) => currency.format(Number(value))} labelFormatter={formatMonth} />
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
                    <Tooltip formatter={(value) => currency.format(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-500">Spent</span>
                  <span className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{currency.format(dashboard.monthlyExpenses)}</span>
                </div>
              </>
            ) : <div className="grid h-full place-items-center text-sm text-zinc-400">No expenses this month</div>}
          </div>
          <ul className="mt-2 space-y-2">
            {dashboard?.expensesByCategory.map((item, index) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={item.categoryId}>
                <span className="flex min-w-0 items-center gap-2 text-zinc-600"><i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span className="truncate">{item.categoryName}</span></span>
                <span className="shrink-0 font-medium tabular-nums text-zinc-900">{currency.format(item.amount)}</span>
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
                  <td className={`whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums ${isIncome ? "text-emerald-800" : "text-zinc-900"}`}>{isIncome ? "+" : "−"}{currency.format(transaction.amount)}</td>
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
        categories={dashboard?.categories ?? []}
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        userId={userId ?? ""}
      />
    </section>
  );
}