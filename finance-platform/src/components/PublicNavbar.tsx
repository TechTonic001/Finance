import { WalletCards } from "lucide-react";
import Link from "next/link";

export default function PublicNavbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        <Link aria-label="Ledger home" className="inline-flex items-center gap-2.5 text-white" href="/">
          <span className="grid size-9 place-items-center border border-white/35 bg-white/10">
            <WalletCards aria-hidden="true" size={19} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Ledger</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link className="px-2 py-2 text-sm font-medium text-white/90 transition-colors hover:text-white" href="/login">
            Login
          </Link>
          <Link className="inline-flex h-10 items-center justify-center bg-white px-4 text-sm font-semibold text-[#123f35] transition-colors hover:bg-emerald-50" href="/register">
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}