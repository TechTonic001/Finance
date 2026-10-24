"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import { Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import NewTransactionModal from "@/components/NewTransactionModal";
import { formatCurrency } from "@/lib/formatters";
import {
  CREATE_ACCOUNT,
  DELETE_TRANSACTION,
  GET_ACCOUNTS,
  GET_CATEGORIES,
  GET_TRANSACTIONS,
  TRANSFER_FUNDS,
  UPDATE_TRANSACTION,
} from "@/lib/graphql/queries";

type Category = { id: string; name: string; type: string | null };
type Account = { id: string; name: string; type: string; balance: number };
type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string | null;
  category: { id: string; name: string };
  account: { id: string; name: string } | null;
  accountId: string | null;
  recurringFrequency: string | null;
  nextOccurrence: string | null;
};
type CategoriesData = { getCategories: Category[] };
type AccountsData = { getAccounts: Account[] };
type TransactionsData = { getTransactions: Transaction[] };

const fieldClass = "h-10 w-full border border-zinc-300 bg-white px-3 text-sm";
const currencyClass = "whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums";

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(transactions: Transaction[]) {
  const rows = [
    ["Date", "Description", "Category", "Type", "Amount (NGN)", "Status"],
    ...transactions.map((transaction) => [
      new Date(transaction.date).toISOString().slice(0, 10),
      transaction.description ?? "",
      transaction.category.name,
      transaction.type,
      Number(transaction.amount).toFixed(2),
      "Completed",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blobUrl = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "";
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("");
  const [dateFilter, setDateFilter] = useState("month");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  useEffect(() => {
    const now = new Date();
    setMonth(now.toISOString().slice(0, 7));
    setYear(String(now.getFullYear()));
  }, []);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editType, setEditType] = useState("EXPENSE");
  const [editRecurrence, setEditRecurrence] = useState("");
  const [actionError, setActionError] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("BANK");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");

  const queryOptions = { skip: status !== "authenticated" || !userId || (!month && dateFilter === "month") || (!year && dateFilter === "year") };
  const { data: categoriesData, error: categoriesError } = useQuery<CategoriesData>(GET_CATEGORIES, {
    variables: { userId },
    ...queryOptions,
  });
  const { data: accountsData, error: accountsError } = useQuery<AccountsData>(GET_ACCOUNTS, {
    variables: { userId },
    ...queryOptions,
  });
  const { data, loading, error } = useQuery<TransactionsData>(GET_TRANSACTIONS, {
    variables: {
      userId,
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      type: type || undefined,
      month: dateFilter === "month" && month ? month : undefined,
      year: dateFilter === "year" && year ? Number(year) : undefined,
    },
    ...queryOptions,
  });
  const [updateTransaction, { loading: savingEdit }] = useMutation(UPDATE_TRANSACTION, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Transaction update failed:", mutationError);
      setActionError(mutationError.message);
    },
  });
  const [deleteTransaction, { loading: deletingTransaction }] = useMutation(DELETE_TRANSACTION, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Transaction deletion failed:", mutationError);
      setActionError(mutationError.message);
    },
  });
  const [createAccount, { loading: creatingAccount }] = useMutation(CREATE_ACCOUNT, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Account creation failed:", mutationError);
      setAccountError(mutationError.message);
    },
  });
  const [transferFunds, { loading: transferring }] = useMutation(TRANSFER_FUNDS, {
    refetchQueries: "active",
    awaitRefetchQueries: true,
    onError(mutationError) {
      console.error("Account transfer failed:", mutationError);
      setAccountError(mutationError.message);
    },
  });

  useEffect(() => {
    if (!editing) return;
    setEditAmount(String(editing.amount));
    setEditDescription(editing.description ?? "");
    setEditDate(new Date(editing.date).toISOString().slice(0, 10));
    setEditCategoryId(editing.category.id);
    setEditAccountId(editing.accountId ?? "");
    setEditType(editing.type.toUpperCase());
    setEditRecurrence(editing.recurringFrequency ?? "");
    setActionError("");
  }, [editing]);

  const transactions = data?.getTransactions ?? [];
  const accounts = accountsData?.getAccounts ?? [];
  const categories = categoriesData?.getCategories ?? [];

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setActionError("");
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter an amount greater than zero.");
      return;
    }
    try {
      await updateTransaction({
        variables: {
          id: editing.id,
          amount,
          description: editDescription.trim() || null,
          date: new Date(`${editDate}T12:00:00`).toISOString(),
          categoryId: editCategoryId,
          accountId: editAccountId || null,
          type: editType,
          recurringFrequency: editRecurrence || null,
        },
      });
      setEditing(null);
    } catch (mutationError) {
      setActionError(mutationError instanceof Error ? mutationError.message : "Transaction update failed.");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setActionError("");
    try {
      await deleteTransaction({ variables: { id: deleting.id } });
      setDeleting(null);
    } catch (mutationError) {
      setActionError(mutationError instanceof Error ? mutationError.message : "Transaction deletion failed.");
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    setAccountNotice("");
    try {
      const name = accountName.trim();
      await createAccount({ variables: { name, type: accountType } });
      setAccountName("");
      setAccountNotice(`Created ${name}.`);
    } catch (mutationError) {
      setAccountError(mutationError instanceof Error ? mutationError.message : "Account creation failed.");
    }
  }

  async function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    setAccountNotice("");
    const amount = Number(transferAmount);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      setAccountError("Choose two different accounts.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setAccountError("Enter a transfer amount greater than zero.");
      return;
    }
    try {
      await transferFunds({ variables: { fromAccountId, toAccountId, amount } });
      setTransferAmount("");
      setAccountNotice("Transfer completed.");
    } catch (mutationError) {
      setAccountError(mutationError instanceof Error ? mutationError.message : "Transfer failed.");
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">Activity</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Transactions</h1>
          <p className="mt-2 text-sm text-zinc-500">Search, filter, edit, and export your account activity.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-11 border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" disabled={transactions.length === 0} onClick={() => downloadCsv(transactions)} type="button">
            Export to CSV
          </button>
          <button className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900" onClick={() => setModalOpen(true)} type="button">
            <Plus aria-hidden="true" size={18} /> Add transaction
          </button>
        </div>
      </header>

      <section aria-label="Accounts and transfers" className="grid gap-4 lg:grid-cols-2">
        <form className="space-y-3 border border-zinc-200 bg-white p-4" onSubmit={handleCreateAccount}>
          <h2 className="font-semibold text-zinc-950">Accounts</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
            <label className="sr-only" htmlFor="account-name">New account name</label>
            <input className={fieldClass} id="account-name" onChange={(event) => setAccountName(event.target.value)} placeholder="Account name" required value={accountName} />
            <label className="sr-only" htmlFor="account-type">Account type</label>
            <select className={fieldClass} id="account-type" onChange={(event) => setAccountType(event.target.value)} value={accountType}>
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="WALLET">Wallet</option>
            </select>
            <button className="h-10 bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50" disabled={creatingAccount} type="submit">
              {creatingAccount ? "Adding..." : "Add"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <span className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700" key={account.id}>
                {account.name}: {formatCurrency(account.balance)}
              </span>
            ))}
          </div>
        </form>

        <form className="space-y-3 border border-zinc-200 bg-white p-4" onSubmit={handleTransfer}>
          <h2 className="font-semibold text-zinc-950">Transfer between accounts</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-zinc-600">
              From
              <select className={`${fieldClass} mt-1`} onChange={(event) => setFromAccountId(event.target.value)} required value={fromAccountId}>
                <option value="">Select source</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({formatCurrency(account.balance)})</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              To
              <select className={`${fieldClass} mt-1`} onChange={(event) => setToAccountId(event.target.value)} required value={toAccountId}>
                <option value="">Select destination</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="transfer-amount">Transfer amount</label>
            <input className={`${fieldClass} min-w-0 flex-1`} id="transfer-amount" min="0.01" onChange={(event) => setTransferAmount(event.target.value)} placeholder="Amount (₦)" required step="0.01" type="number" value={transferAmount} />
            <button className="h-10 bg-emerald-800 px-4 text-sm font-medium text-white disabled:opacity-50" disabled={transferring || accounts.length < 2} type="submit">
              {transferring ? "Transferring..." : "Transfer"}
            </button>
          </div>
        </form>
      </section>
      {accountsError && <p className="text-sm text-rose-700" role="alert">Accounts could not be loaded: {accountsError.message}</p>}
      {accountError && <p className="text-sm text-rose-700" role="alert">{accountError}</p>}
      {accountNotice && <p className="text-sm text-emerald-800" role="status">{accountNotice}</p>}

      <section aria-label="Transaction filters" className="grid gap-3 border border-zinc-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs text-zinc-600 xl:col-span-2">
          Search description
          <span className="relative mt-1 block">
            <Search aria-hidden="true" className="absolute left-3 top-2.5 text-zinc-400" size={16} />
            <input className={`${fieldClass} pl-9`} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" value={search} />
          </span>
        </label>
        <label className="text-xs text-zinc-600">
          Category
          <select className={`${fieldClass} mt-1`} onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Type
          <select className={`${fieldClass} mt-1`} onChange={(event) => setType(event.target.value)} value={type}>
            <option value="">Income and expenses</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-zinc-600">
            Date filter
            <select className={`${fieldClass} mt-1`} onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="all">All time</option>
            </select>
          </label>
          {dateFilter === "month" ? (
            <label className="text-xs text-zinc-600">
              Month
              <input className={`${fieldClass} mt-1`} onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
            </label>
          ) : dateFilter === "year" ? (
            <label className="text-xs text-zinc-600">
              Year
              <input className={`${fieldClass} mt-1`} max="9999" min="1900" onChange={(event) => setYear(event.target.value)} required type="number" value={year} />
            </label>
          ) : <span />}
        </div>
      </section>

      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Transactions could not be loaded: {error.message}</p>}
      {categoriesError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">Categories could not be loaded: {categoriesError.message}</p>}

      <div className="overflow-x-auto border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Repeats</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactions.map((transaction) => {
              const isIncome = transaction.type.toUpperCase() === "INCOME";
              return (
                <tr className="text-zinc-700" key={transaction.id}>
                  <td className="whitespace-nowrap px-4 py-3">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{transaction.category.name}</td>
                  <td className="max-w-56 truncate px-4 py-3 text-zinc-500">{transaction.description || "—"}</td>
                  <td className="px-4 py-3">{transaction.account?.name ?? "—"}</td>
                  <td className="px-4 py-3">{isIncome ? "Income" : "Expense"}</td>
                  <td className={`${currencyClass} ${isIncome ? "text-emerald-800" : "text-zinc-900"}`}>
                    {isIncome ? "+" : "−"}{formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-4 py-3">{transaction.recurringFrequency ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button className="mr-3 font-medium text-emerald-800 underline underline-offset-2" onClick={() => setEditing(transaction)} type="button">Edit</button>
                    <button className="font-medium text-rose-700 underline underline-offset-2" onClick={() => { setActionError(""); setDeleting(transaction); }} type="button">Delete</button>
                  </td>
                </tr>
              );
            })}
            {!loading && transactions.length === 0 && !error && <tr><td className="px-6 py-10 text-center text-zinc-500" colSpan={8}>No transactions match these filters.</td></tr>}
            {loading && <tr><td className="px-6 py-10 text-center text-zinc-500" colSpan={8}>Loading transactions...</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 p-4">
          <section aria-labelledby="edit-transaction-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" role="dialog">
            <h2 className="text-xl font-semibold text-zinc-950" id="edit-transaction-title">Edit transaction</h2>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleEdit}>
              <label className="text-sm font-medium text-zinc-700">
                Amount (₦)
                <input className={`${fieldClass} mt-1`} min="0.01" onChange={(event) => setEditAmount(event.target.value)} required step="0.01" type="number" value={editAmount} />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Type
                <select className={`${fieldClass} mt-1`} onChange={(event) => setEditType(event.target.value)} value={editType}>
                  <option value="EXPENSE">Expense</option><option value="INCOME">Income</option>
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
                Description
                <input className={`${fieldClass} mt-1`} onChange={(event) => setEditDescription(event.target.value)} value={editDescription} />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Category
                <select className={`${fieldClass} mt-1`} onChange={(event) => setEditCategoryId(event.target.value)} required value={editCategoryId}>
                  {categories.filter((category) => !category.type || category.type.toUpperCase() === editType).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Account
                <select className={`${fieldClass} mt-1`} onChange={(event) => setEditAccountId(event.target.value)} value={editAccountId}>
                  <option value="">No account</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Date
                <input className={`${fieldClass} mt-1`} onChange={(event) => setEditDate(event.target.value)} required type="date" value={editDate} />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Recurrence
                <select className={`${fieldClass} mt-1`} onChange={(event) => setEditRecurrence(event.target.value)} value={editRecurrence}>
                  <option value="">Does not repeat</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
                </select>
              </label>
              {actionError && <p className="text-sm text-rose-700 sm:col-span-2" role="alert">{actionError}</p>}
              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 sm:col-span-2">
                <button className="h-10 px-4 text-sm text-zinc-600 hover:bg-zinc-100" disabled={savingEdit} onClick={() => setEditing(null)} type="button">Cancel</button>
                <button className="h-10 bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={savingEdit} type="submit">{savingEdit ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 p-4">
          <section aria-labelledby="delete-transaction-title" aria-modal="true" className="w-full max-w-md bg-white p-6 shadow-2xl" role="dialog">
            <h2 className="text-lg font-semibold text-zinc-950" id="delete-transaction-title">Delete transaction?</h2>
            <p className="mt-2 text-sm text-zinc-600">This permanently removes “{deleting.description || deleting.category.name}” ({formatCurrency(deleting.amount)}). Any linked account balance will be adjusted.</p>
            {actionError && <p className="mt-3 text-sm text-rose-700" role="alert">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="h-10 px-4 text-sm text-zinc-600 hover:bg-zinc-100" disabled={deletingTransaction} onClick={() => setDeleting(null)} type="button">Cancel</button>
              <button className="h-10 bg-rose-700 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={deletingTransaction} onClick={handleDelete} type="button">{deletingTransaction ? "Deleting..." : "Delete transaction"}</button>
            </div>
          </section>
        </div>
      )}

      <NewTransactionModal onClose={() => setModalOpen(false)} open={modalOpen} userId={userId} />
    </section>
  );
}
