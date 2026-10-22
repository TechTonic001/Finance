"use client";

import { X } from "lucide-react";

type NewTransactionModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function NewTransactionModal({ open, onClose }: NewTransactionModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
            className="grid size-9 place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5 px-6 py-6" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 text-sm font-medium text-zinc-700">Type</legend>
            <label className="flex h-10 cursor-pointer items-center gap-2 border border-zinc-300 px-3 text-sm text-zinc-700 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900">
              <input className="accent-emerald-800" defaultChecked name="type" type="radio" value="EXPENSE" />
              Expense
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 border border-zinc-300 px-3 text-sm text-zinc-700 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900">
              <input className="accent-emerald-800" name="type" type="radio" value="INCOME" />
              Income
            </label>
          </fieldset>
          <label className="block text-sm font-medium text-zinc-700">
            Amount
            <span className="mt-2 flex h-11 items-center border border-zinc-300 px-3 focus-within:border-emerald-700">
              <span aria-hidden="true" className="mr-2 text-zinc-400">$</span>
              <input className="w-full bg-transparent text-sm outline-none" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" />
            </span>
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Description
            <input className="mt-2 h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-700" name="description" placeholder="What was this for?" required />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-zinc-700">
              Category
              <select className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-500" defaultValue="" name="categoryId" required>
                <option disabled value="">Select category</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Date
              <input className="mt-2 h-11 w-full border border-zinc-300 px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} name="date" required type="date" />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
            <button className="h-10 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-100" onClick={onClose} type="button">Cancel</button>
            <button className="h-10 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900" onClick={onClose} type="button">Save transaction</button>
          </div>
        </form>
      </section>
    </div>
  );
}