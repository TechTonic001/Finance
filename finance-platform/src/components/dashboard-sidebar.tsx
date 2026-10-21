"use client";

import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/budgets", label: "Budgets", icon: WalletCards },
  { href: "/dashboard/goals", label: "Goals", icon: Target },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="fixed left-4 top-4 z-50 grid size-11 place-items-center border border-zinc-200 bg-white text-zinc-800 shadow-sm md:hidden"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>

      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-zinc-950/35 md:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-white px-5 py-6 transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          className="mb-12 flex items-center gap-3 px-2"
          href="/dashboard"
          onClick={() => setOpen(false)}
        >
          <span className="grid size-10 place-items-center bg-emerald-700 text-white">
            <WalletCards size={21} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-zinc-950">Ledger</span>
            <span className="block text-xs text-zinc-500">Personal finance</span>
          </span>
        </Link>

        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Workspace
        </p>
        <nav aria-label="Dashboard navigation" className="space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 px-3 text-sm transition-colors ${
                  active
                    ? "bg-emerald-50 font-medium text-emerald-800"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                }`}
                href={href}
                key={href}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-100 pt-4">
          <button
            className="flex h-11 w-full items-center gap-3 px-3 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            onClick={() => signOut({ callbackUrl: "/login" })}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}