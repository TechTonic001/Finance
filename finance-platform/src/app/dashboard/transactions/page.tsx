"use client";

import { useQuery } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import NewTransactionModal from "@/components/NewTransactionModal";
import { formatCurrency } from "@/lib/formatters";
import { GET_CATEGORIES, GET_TRANSACTIONS } from "@/lib/graphql/queries";

type Category = { id: string; name: string; type: string | null };
type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string | null;
  category: { id: string; name: string };
};
type CategoriesData = { getCategories: Category[] };
type TransactionsData = { getTransactions: Transaction[] };

const currentMonth = new Date().toISOString().slice(0, 7);

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const userId = session?.user?.id ?? "";
  const { data: categoriesData, error: categoriesError } = useQuery<CategoriesData>(GET_CATEGORIES, {
    variables: { userId },
    skip: status !== "authenticated" || !userId,
  });
  const { data, loading, error } = useQuery<TransactionsData>(GET_TRANSACTIONS, {
    variables: {
      userId,
      categoryId: categoryId || undefined,
      month: month === "all" ? undefined : month,
    },
    skip: status !== "authenticated" || !userId,
  });
  const transactions = data?.getTransactions ?? [];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">Activity</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Transactions</h1>
          <p className="mt-2 text-sm text-zinc-500">Review and add your income and expenses.</p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
          onClick={() => setModalOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" size={18} /> Add transaction
        </button>
      </header>

      <div className="flex flex-col gap-3 border border-zinc-200 bg-white p-4 sm:flex-row">
        <label className="text-sm text-zinc-600">
          Month
          <select
            className="mt-1 block h-10 min-w-44 border border-zinc-300 bg-white px-3"
            onChange={(event) => setMonth(event.target.value)}
            value={month}
          >
            <option value={currentMonth}>This month</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label className="text-sm text-zinc-600">
          Category
          <select
            className="mt-1 block h-10 min-w-44 border border-zinc-300 bg-white px-3"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">All categories</option>
            {categoriesData?.getCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          Transactions could not be loaded: {error.message}
        </p>
      )}
      {categoriesError && (
        <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          Transaction categories could not be loaded: {categoriesError.message}
        </p>
      )}

      <div className="overflow-x-auto border border-zinc-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactions.map((transaction) => {
              const isIncome = transaction.type.toUpperCase() === "INCOME";
              return (
                <tr className="text-zinc-700" key={transaction.id}>
                  <td className="whitespace-nowrap px-5 py-4">
                    {new Date(transaction.date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4">{transaction.category.name}</td>
                  <td className="max-w-64 truncate px-5 py-4 text-zinc-500">
                    {transaction.description || "—"}
                  </td>
                  <td className="px-5 py-4">{isIncome ? "Income" : "Expense"}</td>
                  <td className={`whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums ${isIncome ? "text-emerald-800" : "text-zinc-900"}`}>
                    {isIncome ? "+" : "−"}{formatCurrency(transaction.amount)}
                  </td>
                </tr>
              );
            })}
            {!loading && transactions.length === 0 && !error && (
              <tr>
                <td className="px-6 py-10 text-center text-zinc-500" colSpan={5}>
                  No transactions match these filters.
                </td>
              </tr>
            )}
            {loading && (
              <tr><td className="px-6 py-10 text-center text-zinc-500" colSpan={5}>Loading transactions...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <NewTransactionModal
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        userId={userId}
      />
    </section>
  );
}
