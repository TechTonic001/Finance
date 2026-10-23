"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { GET_DASHBOARD_DATA, GET_TRANSACTIONS, ADD_BUDGET } from "@/lib/graphql/queries";

type Category = { id: string; name: string; type: string | null };
type Budget = {
  id: string;
  amount: number;
  period: string;
  startDate: string | null;
  endDate: string | null;
  category: { id: string; name: string } | null;
};
type Transaction = { date: string; amount: number; type: string; category: { id: string } };
type DashboardData = {
  getUserDashboard: { categories: Category[]; budgets: Budget[] };
};
type TransactionsData = { getTransactions: Transaction[] };

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fieldClass = "mt-1 block h-11 w-full border border-zinc-300 bg-white px-3 text-sm";

function budgetRange(period: string) {
  const now = new Date();
  if (period === "YEARLY") {
    return {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString(),
      endDate: new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1) - 1).toISOString(),
    };
  }
  return {
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1).toISOString(),
  };
}

export default function BudgetsPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "";
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [period, setPeriod] = useState("MONTHLY");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD_DATA, {
    variables: { userId },
    skip: status !== "authenticated" || !userId,
  });
  const {
    data: transactionData,
    loading: transactionsLoading,
    error: transactionsError,
  } = useQuery<TransactionsData>(GET_TRANSACTIONS, {
    variables: { userId },
    skip: status !== "authenticated" || !userId,
  });
  const [createBudget, { loading: saving }] = useMutation(ADD_BUDGET, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Budget creation failed:", mutationError);
      setFormError(mutationError.message);
    },
  });
  const dashboard = data?.getUserDashboard;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter a budget amount greater than zero.");
      return;
    }

    try {
      await createBudget({
        variables: {
          amount: parsedAmount,
          categoryId: categoryId || null,
          period,
          ...budgetRange(period),
        },
      });
      setAmount("");
      setCategoryId("");
      setNotice("Budget created.");
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error ? mutationError.message : "The budget could not be saved.",
      );
    }
  }

  const budgets = dashboard?.budgets ?? [];
  const transactions = transactionData?.getTransactions ?? [];

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">Planning</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Budgets</h1>
        <p className="mt-2 text-sm text-zinc-500">Set spending limits and monitor progress for this period.</p>
      </header>

      <form className="grid gap-4 border border-zinc-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-zinc-700">
          Spending limit
          <input
            className={fieldClass}
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Category
          <select className={fieldClass} onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
            <option value="">All expenses</option>
            {dashboard?.categories
              .filter((category) => !category.type || category.type.toUpperCase() === "EXPENSE")
              .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Period
          <select className={fieldClass} onChange={(event) => setPeriod(event.target.value)} value={period}>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </label>
        <button className="h-11 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={saving || loading} type="submit">
          {saving ? "Saving..." : "Create budget"}
        </button>
        {formError && <p className="text-sm text-rose-700 sm:col-span-2 lg:col-span-4" role="alert">{formError}</p>}
        {notice && <p className="text-sm text-emerald-800 sm:col-span-2 lg:col-span-4" role="status">{notice}</p>}
      </form>

      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Budgets could not be loaded: {error.message}</p>}
      {transactionsError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Spending progress could not be loaded: {transactionsError.message}</p>}
      {loading || transactionsLoading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Loading budgets and spending...</p>
      ) : budgets.length === 0 ? (
        <div className="border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">No budgets yet. Create one above to start tracking spending.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const now = new Date();
            const start = budget.startDate
              ? new Date(budget.startDate)
              : new Date(Date.UTC(now.getUTCFullYear(), budget.period === "YEARLY" ? 0 : now.getUTCMonth(), 1));
            const end = budget.endDate
              ? new Date(budget.endDate)
              : new Date(Date.UTC(now.getUTCFullYear(), budget.period === "YEARLY" ? 12 : now.getUTCMonth() + 1, 1));
            const spent = transactions.reduce((total, transaction) => {
              const transactionDate = new Date(transaction.date);
              const inRange = transactionDate >= start && transactionDate <= end;
              const categoryMatches = !budget.category || transaction.category.id === budget.category.id;
              return inRange && categoryMatches && transaction.type.toUpperCase() === "EXPENSE"
                ? total + Number(transaction.amount)
                : total;
            }, 0);
            const progress = Math.min((spent / Number(budget.amount)) * 100, 100);
            const overBudget = spent > Number(budget.amount);
            return (
              <article className="border border-zinc-200 bg-white p-5" key={budget.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-zinc-950">{budget.category?.name ?? "All expenses"}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{budget.period === "YEARLY" ? "Yearly budget" : "Monthly budget"}</p>
                  </div>
                  <span className={`text-sm font-semibold ${overBudget ? "text-rose-700" : "text-zinc-900"}`}>
                    {transactionsError ? "Spending unavailable" : `${currency.format(spent)} / ${currency.format(Number(budget.amount))}`}
                  </span>
                </div>
                {!transactionsError && (
                  <div aria-label={`${Math.round(progress)}% of budget used`} className="mt-4 h-2 bg-zinc-100">
                    <div className={`h-full ${overBudget ? "bg-rose-600" : "bg-emerald-700"}`} style={{ width: `${progress}%` }} />
                  </div>
                )}
                <p className={`mt-2 text-xs ${overBudget ? "text-rose-700" : "text-zinc-500"}`}>
                  {transactionsError
                    ? "Try refreshing to view current usage."
                    : overBudget
                      ? `Over budget by ${currency.format(spent - Number(budget.amount))}`
                      : `${currency.format(Number(budget.amount) - spent)} remaining`}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
