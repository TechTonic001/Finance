"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { formatCurrency } from "@/lib/formatters";
import { ADD_SAVINGS_GOAL, GET_DASHBOARD_DATA, UPDATE_SAVINGS_GOAL } from "@/lib/graphql/queries";

type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
};
type DashboardData = { getUserDashboard: { savingsGoals: SavingsGoal[] } };

const fieldClass = "mt-1 block h-11 w-full border border-zinc-300 bg-white px-3 text-sm";

export default function GoalsPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "";
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD_DATA, {
    variables: { userId },
    skip: status !== "authenticated" || !userId,
  });
  const [createGoal, { loading: creating }] = useMutation(ADD_SAVINGS_GOAL, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Savings goal creation failed:", mutationError);
      setFormError(mutationError.message);
    },
  });
  const [updateGoal, { loading: updating }] = useMutation(UPDATE_SAVINGS_GOAL, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Savings goal update failed:", mutationError);
      setFormError(mutationError.message);
    },
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    const parsedTarget = Number(targetAmount);
    if (!name.trim()) {
      setFormError("Enter a name for your goal.");
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFormError("Enter a target greater than zero.");
      return;
    }

    try {
      await createGoal({
        variables: {
          name: name.trim(),
          targetAmount: parsedTarget,
          deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
        },
      });
      setName("");
      setTargetAmount("");
      setDeadline("");
      setNotice("Savings goal created.");
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : "The goal could not be saved.");
    }
  }

  async function handleContribution(event: FormEvent<HTMLFormElement>, goal: SavingsGoal) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    const contribution = Number(contributions[goal.id]);
    if (!Number.isFinite(contribution) || contribution <= 0) {
      setFormError("Enter a contribution greater than zero.");
      return;
    }

    try {
      await updateGoal({
        variables: { id: goal.id, currentAmount: Number(goal.currentAmount) + contribution },
      });
      setContributions((values) => ({ ...values, [goal.id]: "" }));
      setNotice(`Added ${formatCurrency(contribution)} to ${goal.name}.`);
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : "The contribution could not be saved.");
    }
  }

  const goals = data?.getUserDashboard.savingsGoals ?? [];

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">Long-term planning</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Savings goals</h1>
        <p className="mt-2 text-sm text-zinc-500">Create targets and track contributions toward them.</p>
      </header>

      <form className="grid gap-4 border border-zinc-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" onSubmit={handleCreate}>
        <label className="text-sm font-medium text-zinc-700">
          Goal name
          <input className={fieldClass} onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Target amount
          <input
            className={fieldClass}
            min="0.01"
            onChange={(event) => setTargetAmount(event.target.value)}
            required
            step="0.01"
            type="number"
            value={targetAmount}
          />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Target date <span className="font-normal text-zinc-400">(optional)</span>
          <input className={fieldClass} onChange={(event) => setDeadline(event.target.value)} type="date" value={deadline} />
        </label>
        <button className="h-11 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={creating || loading} type="submit">
          {creating ? "Saving..." : "Create goal"}
        </button>
        {formError && <p className="text-sm text-rose-700 sm:col-span-2 lg:col-span-4" role="alert">{formError}</p>}
        {notice && <p className="text-sm text-emerald-800 sm:col-span-2 lg:col-span-4" role="status">{notice}</p>}
      </form>

      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Savings goals could not be loaded: {error.message}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Loading savings goals...</p>
      ) : goals.length === 0 ? (
        <div className="border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">No savings goals yet. Create one above to get started.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const progress = Math.min((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100, 100);
            return (
              <article className="border border-zinc-200 bg-white p-5" key={goal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-zinc-950">{goal.name}</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {goal.deadline
                        ? `Target date ${new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : "No target date"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{Math.round(progress)}%</span>
                </div>
                <div aria-label={`${Math.round(progress)}% of goal saved`} className="mt-4 h-2 bg-zinc-100">
                  <div className="h-full bg-emerald-700" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  {formatCurrency(Number(goal.currentAmount))} saved of {formatCurrency(Number(goal.targetAmount))}
                </p>
                <form className="mt-5 flex gap-2 border-t border-zinc-100 pt-4" onSubmit={(event) => handleContribution(event, goal)}>
                  <label className="sr-only" htmlFor={`contribution-${goal.id}`}>Contribution amount for {goal.name}</label>
                  <input
                    className="h-10 min-w-0 flex-1 border border-zinc-300 px-3 text-sm"
                    id={`contribution-${goal.id}`}
                    min="0.01"
                    onChange={(event) => setContributions((values) => ({ ...values, [goal.id]: event.target.value }))}
                    placeholder="Contribution"
                    required
                    step="0.01"
                    type="number"
                    value={contributions[goal.id] ?? ""}
                  />
                  <button className="h-10 bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60" disabled={updating} type="submit">
                    {updating ? "Saving..." : "Add funds"}
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
