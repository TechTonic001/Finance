"use client";

import { getDaysInMonth } from "date-fns";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/formatters";

type SafeToSpendCardProps = {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyAllocations: number;
  recurringBills: number;
  loading?: boolean;
};

export default function SafeToSpendCard({
  monthlyIncome,
  monthlyExpenses,
  monthlyAllocations,
  recurringBills,
  loading = false,
}: SafeToSpendCardProps) {
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [remainingDays, setRemainingDays] = useState(1);

  useEffect(() => {
    const today = new Date();
    setRemainingDays(Math.max(1, getDaysInMonth(today) - today.getDate()));
  }, []);

  const availablePool = monthlyIncome - recurringBills - monthlyAllocations - monthlyExpenses;
  const safeDailySpend = Math.max(0, availablePool / remainingDays);
  const purchase = Number(purchaseAmount);
  const hasPurchaseAmount = purchaseAmount !== "" && Number.isFinite(purchase) && purchase > 0;
  const adjustedDailySpend = hasPurchaseAmount
    ? Math.max(0, (availablePool - purchase) / remainingDays)
    : safeDailySpend;
  const purchaseStatus = !hasPurchaseAmount
    ? null
    : purchase <= safeDailySpend
      ? { label: "Safe to Buy", className: "bg-emerald-100 text-emerald-800" }
      : purchase <= availablePool
        ? { label: "Tightens Budget", className: "bg-amber-100 text-amber-800" }
        : { label: "Exceeds Safe Limit", className: "bg-rose-100 text-rose-800" };

  return (
    <section aria-labelledby="safe-to-spend-heading" className="border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Monthly cash plan</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950" id="safe-to-spend-heading">Safe to spend</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Based on income, this month’s spending, scheduled bills, and monthly budget allocations, including savings-category budgets.
          </p>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-zinc-500">Safe daily spend · {remainingDays} days remaining</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-900 sm:text-4xl">
            {loading ? "—" : formatCurrency(safeDailySpend)}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Total safe monthly remainder:{" "}
            <span className="font-semibold tabular-nums text-zinc-900">
              {loading ? "—" : formatCurrency(availablePool)}
            </span>
          </p>
        </div>

        <div className="w-full border border-white/80 bg-white p-4 lg:max-w-sm">
          <label className="block text-sm font-medium text-zinc-800" htmlFor="hypothetical-purchase">
            Can I afford this purchase?
          </label>
          <div className="mt-2 flex h-11 items-center border border-zinc-300 px-3 focus-within:border-emerald-700">
            <span aria-hidden="true" className="mr-2 text-zinc-500">₦</span>
            <input
              className="w-full bg-transparent text-sm outline-none"
              disabled={loading}
              id="hypothetical-purchase"
              min="0"
              onChange={(event) => setPurchaseAmount(event.target.value)}
              placeholder="15,000"
              step="0.01"
              type="number"
              value={purchaseAmount}
            />
          </div>
          {purchaseStatus ? (
            <div aria-live="polite" className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold ${purchaseStatus.className}`}>
                {purchaseStatus.label}
              </span>
              <span className="text-xs text-zinc-600">
                New daily spend: <strong className="tabular-nums text-zinc-900">{formatCurrency(adjustedDailySpend)}</strong>
              </span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">Enter an amount to see the impact on your remaining daily spend.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-emerald-200/80 pt-4 text-xs text-zinc-600 sm:grid-cols-4">
        <p>Income <span className="mt-1 block font-medium tabular-nums text-zinc-900">{formatCurrency(monthlyIncome)}</span></p>
        <p>Spent so far <span className="mt-1 block font-medium tabular-nums text-zinc-900">{formatCurrency(monthlyExpenses)}</span></p>
        <p>Scheduled bills <span className="mt-1 block font-medium tabular-nums text-zinc-900">{formatCurrency(recurringBills)}</span></p>
        <p>Budget / savings allocations <span className="mt-1 block font-medium tabular-nums text-zinc-900">{formatCurrency(monthlyAllocations)}</span></p>
      </div>
    </section>
  );
}
