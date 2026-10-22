"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to create your account.");
        return;
      }

      router.replace("/login?registered=1");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-[#f4f7f4] md:grid-cols-[1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[#123f35] px-12 py-14 text-white md:flex md:flex-col md:justify-between lg:px-20">
        <Link className="text-sm font-semibold tracking-wide" href="/">LEDGER</Link>
        <div className="relative z-10 max-w-lg pb-16">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Start with a clear view</p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Make room for better money decisions.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-emerald-50/75">Create your account to organize spending, set budgets, and track the goals that matter to you.</p>
        </div>
        <div aria-hidden="true" className="absolute -bottom-24 -right-20 size-96 rounded-full border border-emerald-100/15" />
        <div aria-hidden="true" className="absolute -bottom-12 -right-8 size-72 rounded-full border border-emerald-100/15" />
        <p className="text-xs text-emerald-100/60">Personal finance, made understandable.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link className="mb-12 block text-sm font-semibold tracking-wide text-emerald-800 md:hidden" href="/">LEDGER</Link>
          <p className="text-sm font-medium text-emerald-800">Get started</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Create your account</h2>
          <p className="mt-2 text-sm text-zinc-500">A few details are all you need to get started.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <input autoComplete="email" className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" name="email" required type="email" />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Password
              <input autoComplete="new-password" className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" minLength={8} name="password" required type="password" />
              <span className="mt-1 block text-xs font-normal text-zinc-500">Use at least 8 characters.</span>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Confirm password
              <input autoComplete="new-password" className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" minLength={8} name="confirmPassword" required type="password" />
            </label>
            {error && <p aria-live="polite" className="text-sm text-red-700" role="alert">{error}</p>}
            <button className="h-11 w-full bg-emerald-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>
          <p className="mt-7 text-sm text-zinc-500">
            Already have an account? <Link className="font-medium text-emerald-800 hover:text-emerald-950" href="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}