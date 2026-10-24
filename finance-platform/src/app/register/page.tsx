"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  isValidEmail,
  isValidPassword,
  PASSWORD_REQUIREMENTS,
} from "@/lib/auth-validation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
  const requirementCount = requirements.filter((requirement) => requirement.met).length;
  const strength = requirementCount === PASSWORD_REQUIREMENTS.length
    ? { label: "Strong", width: "w-full", color: "bg-emerald-600", text: "text-emerald-800" }
    : requirementCount >= 3
      ? { label: "Medium", width: "w-2/3", color: "bg-amber-500", text: "text-amber-700" }
      : { label: password ? "Weak" : "Not set", width: password ? "w-1/3" : "w-0", color: "bg-rose-500", text: "text-rose-700" };
  const passwordMatches = password === confirmPassword;
  const passwordBytesValid = new TextEncoder().encode(password).length <= 72;
  const canSubmit = isValidEmail(email.trim())
    && isValidPassword(password)
    && passwordMatches
    && passwordBytesValid
    && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Meet all password requirements before continuing.");
      return;
    }
    if (!passwordBytesValid) {
      setError("Password must be 72 bytes or fewer.");
      return;
    }
    if (!passwordMatches) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
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
              <input
                autoComplete="email"
                className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                maxLength={254}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              {email && !isValidEmail(email.trim()) && (
                <span className="mt-1 block text-xs font-normal text-rose-700">Enter a valid email address.</span>
              )}
            </label>
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="password">Password</label>
              <div className="mt-2 flex h-11 border border-zinc-300 bg-white focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
                <input
                  autoComplete="new-password"
                  className="min-w-0 flex-1 px-3 text-sm text-zinc-900 outline-none"
                  id="password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="grid w-11 shrink-0 place-items-center text-zinc-500 hover:text-zinc-900"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                </button>
              </div>
              <div aria-label={`Password strength: ${strength.label}`} className="mt-3 h-1.5 overflow-hidden bg-zinc-200" role="meter" aria-valuemax={5} aria-valuemin={0} aria-valuenow={requirementCount}>
                <div className={`h-full transition-all ${strength.width} ${strength.color}`} />
              </div>
              <p className={`mt-1 text-xs font-medium ${strength.text}`}>Password strength: {strength.label}</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {requirements.map((requirement) => (
                  <li className={`text-xs ${requirement.met ? "text-emerald-800" : "text-zinc-500"}`} key={requirement.id}>
                    <span aria-hidden="true">{requirement.met ? "✓" : "○"}</span> {requirement.label}
                  </li>
                ))}
              </ul>
              {!passwordBytesValid && (
                <p className="mt-1 text-xs text-rose-700">Password must be 72 bytes or fewer.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="confirmPassword">Confirm password</label>
              <div className="mt-2 flex h-11 border border-zinc-300 bg-white focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
                <input
                  autoComplete="new-password"
                  className="min-w-0 flex-1 px-3 text-sm text-zinc-900 outline-none"
                  id="confirmPassword"
                  name="confirmPassword"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                />
                <button
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="grid w-11 shrink-0 place-items-center text-zinc-500 hover:text-zinc-900"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  type="button"
                >
                  {showConfirmPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                </button>
              </div>
              {confirmPassword && !passwordMatches && (
                <span className="mt-1 block text-xs font-normal text-rose-700">Passwords do not match.</span>
              )}
            </div>
            {error && <p aria-live="polite" className="text-sm text-red-700" role="alert">{error}</p>}
            <button className="h-11 w-full bg-emerald-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSubmit} type="submit">
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