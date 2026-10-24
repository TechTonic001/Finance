"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { formatCurrency } from "@/lib/formatters";
import { ADD_BUDGET, GET_BUDGET_STATUSES, GET_CATEGORIES } from "@/lib/graphql/queries";

type Category = { id: string; name: string; type: string | null };
type BudgetStatus = {
  budgetId: string;
  categoryId: string | null;
  categoryName: string;
  amount: number;
  spent: number;
  percentage: number;
  threshold: number;
};
type CategoriesData = { getCategories: Category[] };
type BudgetStatusesData = { getBudgetStatuses: BudgetStatus[] };

const currentMonth = new Date().toISOString().slice(0, 7);
const fieldClass = "mt-1 block h-11 w-full border border-zinc-300 bg-white px-3 text-sm";

function budgetRange(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error("Choose a valid budget month.");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    startDate: new Date(Date.UTC(year, monthIndex, 1)).toISOString(),
    endDate: new Date(Date.UTC(year, monthIndex + 1, 1) - 1).toISOString(),
  };
}

export default function BudgetsPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "";
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const queryOptions = { skip: status !== "authenticated" || !userId };
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useQuery<CategoriesData>(
    GET_CATEGORIES,
    { variables: { userId }, ...queryOptions },
  );
  const { data, loading, error } = useQuery<BudgetStatusesData>(GET_BUDGET_STATUSES, {
    variables: { userId, month },
    ...queryOptions,
  });
  const [createBudget, { loading: saving }] = useMutation(ADD_BUDGET, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Budget creation failed:", mutationError);
      setFormError(mutationError.message);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter a budget amount greater than zero.");
      return;
    }
    if (!categoryId) {
      setFormError("Choose an expense category.");
      return;
    }
    try {
      await createBudget({
        variables: {
          amount: parsedAmount,
          categoryId,
          period: "MONTHLY",
          ...budgetRange(month),
        },
      });
      setAmount("");
      setNotice("Monthly budget created.");
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : "The budget could not be saved.");
    }
  }

  const budgets = data?.getBudgetStatuses ?? [];
  const expenseCategories = categoriesData?.getCategories.filter(
    (category) => !category.type || category.type.toUpperCase() === "EXPENSE",
  ) ?? [];

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">Planning</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Budgets</h1>
        <p className="mt-2 text-sm text-zinc-500">Set monthly category limits and monitor spending as it happens.</p>
      </header>

      <form className="grid gap-4 border border-zinc-200 bg-white p-5 sm:grid-cols-3 sm:items-end" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-zinc-700">
          Monthly limit (₦)
          <input className={fieldClass} min="0.01" onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Expense category
          <select className={fieldClass} disabled={categoriesLoading} onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
            <option disabled value="">{categoriesLoading ? "Loading categories..." : "Select category"}</option>
            {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Month
          <input className={fieldClass} onChange={(event) => setMonth(event.target.value)} required type="month" value={month} />
        </label>
        <button className="h-11 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 sm:col-span-3 sm:justify-self-end" disabled={saving || loading || categoriesLoading} type="submit">
          {saving ? "Saving..." : "Create monthly budget"}
        </button>
        {formError && <p className="text-sm text-rose-700 sm:col-span-3" role="alert">{formError}</p>}
        {notice && <p className="text-sm text-emerald-800 sm:col-span-3" role="status">{notice}</p>}
      </form>

      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Budgets could not be loaded: {error.message}</p>}
      {categoriesError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Categories could not be loaded: {categoriesError.message}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Loading budgets and spending...</p>
      ) : budgets.length === 0 ? (
        <div className="border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">No budgets for {month}. Create a category budget above to start tracking.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const overBudget = budget.threshold === 100;
            const nearLimit = budget.threshold === 80;
            const progress = Math.min(budget.percentage, 100);
            return (
              <article className="border border-zinc-200 bg-white p-5" key={budget.budgetId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-zinc-950">{budget.categoryName}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{month} budget</p>
                  </div>
                  <span className={`text-sm font-semibold ${overBudget ? "text-rose-700" : nearLimit ? "text-amber-700" : "text-zinc-900"}`}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <div aria-label={`${Math.round(budget.percentage)}% of budget used`} className="mt-4 h-2 bg-zinc-100">
                  <div className={`h-full ${overBudget ? "bg-rose-600" : nearLimit ? "bg-amber-400" : "bg-emerald-700"}`} style={{ width: `${progress}%` }} />
                </div>
                <p className={`mt-2 text-xs ${overBudget ? "text-rose-700" : nearLimit ? "text-amber-700" : "text-zinc-500"}`}>
                  {overBudget
                    ? `Over budget by ${formatCurrency(budget.spent - budget.amount)}`
                    : `${formatCurrency(budget.amount - budget.spent)} remaining (${Math.round(budget.percentage)}% used)`}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
