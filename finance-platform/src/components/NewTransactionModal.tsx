"use client";

import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { GET_DASHBOARD_DATA } from "@/lib/graphql/queries";

export const ADD_TRANSACTION = gql`
  mutation ADD_TRANSACTION(
    $categoryId: String!
    $amount: Float!
    $description: String
    $type: String!
    $date: DateTime!
  ) {
    addTransaction(
      categoryId: $categoryId
      amount: $amount
      description: $description
      type: $type
      date: $date
    ) {
      id
      amount
      description
      type
      date
      category {
        name
      }
    }
  }
`;

type CategoryOption = { id: string; name: string; type: string | null };

type NewTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  userId: string;
};

export default function NewTransactionModal({
  open,
  onClose,
  categories,
  userId,
}: NewTransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [date, setDate] = useState("");
  const [formError, setFormError] = useState("");
  const visibleCategories = categories.filter(
    (category) => !category.type || category.type.toUpperCase() === type,
  );

  const [submitTransaction, { loading, error: mutationError }] = useMutation(ADD_TRANSACTION, {
    refetchQueries: [{ query: GET_DASHBOARD_DATA, variables: { userId } }],
    awaitRefetchQueries: true,
    onCompleted() {
      setAmount("");
      setDescription("");
      setCategoryId("");
      setType("EXPENSE");
      setDate("");
      setFormError("");
      onClose();
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!userId) {
      setFormError("Your session could not be verified. Please sign in again.");
      return;
    }
    if (!categoryId || !amount || !date) {
      setFormError("Complete each field before saving.");
      return;
    }

    const variables = {
      categoryId,
      amount: Number(amount),
      description: description.trim() || null,
      type,
      date: new Date(`${date}T12:00:00`).toISOString(),
    };
    console.log("Submitting transaction:", variables);

    try {
      await submitTransaction({ variables });
    } catch {
      setFormError("The transaction could not be saved. Please try again.");
    }
  }

  if (!open) return null;

  const errorMessage = formError || mutationError?.message;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        aria-labelledby="new-transaction-title"
        aria-modal="true"
        className="w-full max-w-lg bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Activity</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950" id="new-transaction-title">
              Add transaction
            </h2>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
          <fieldset className="grid grid-cols-2 gap-2" disabled={loading}>
            <legend className="mb-2 text-sm font-medium text-zinc-700">Type</legend>
            <label className="flex h-10 cursor-pointer items-center gap-2 border border-zinc-300 px-3 text-sm text-zinc-700 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900">
              <input
                checked={type === "EXPENSE"}
                className="accent-emerald-800"
                name="type"
                onChange={() => {
                  setType("EXPENSE");
                  setCategoryId("");
                }}
                type="radio"
                value="EXPENSE"
              />
              Expense
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 border border-zinc-300 px-3 text-sm text-zinc-700 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900">
              <input
                checked={type === "INCOME"}
                className="accent-emerald-800"
                name="type"
                onChange={() => {
                  setType("INCOME");
                  setCategoryId("");
                }}
                type="radio"
                value="INCOME"
              />
              Income
            </label>
          </fieldset>

          <label className="block text-sm font-medium text-zinc-700">
            Amount
            <span className="mt-2 flex h-11 items-center border border-zinc-300 px-3 focus-within:border-emerald-700">
              <span aria-hidden="true" className="mr-2 text-zinc-400">$</span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                min="0.01"
                name="amount"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Description
            <input
              className="mt-2 h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-700"
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What was this for?"
              required
              value={description}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-zinc-700">
              Category
              <select
                className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-700 disabled:bg-zinc-50"
                disabled={loading || visibleCategories.length === 0}
                name="categoryId"
                onChange={(event) => setCategoryId(event.target.value)}
                required
                value={categoryId}
              >
                <option disabled value="">Select category</option>
                {visibleCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {visibleCategories.length === 0 && (
                <span className="mt-1 block text-xs font-normal text-zinc-500">No matching categories yet.</span>
              )}
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Date
              <input
                className="mt-2 h-11 w-full border border-zinc-300 px-3 text-sm"
                onChange={(event) => setDate(event.target.value)}
                required
                type="date"
                value={date}
              />
            </label>
          </div>

          {errorMessage && (
            <p aria-live="polite" className="text-sm text-rose-700" role="alert">{errorMessage}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
            <button
              className="h-10 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
              disabled={loading}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
              disabled={loading || visibleCategories.length === 0}
              type="submit"
            >
              {loading ? "Saving..." : "Save transaction"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}