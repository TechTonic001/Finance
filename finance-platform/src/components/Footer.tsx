import { WalletCards } from "lucide-react";
import Link from "next/link";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/#vision-mission" },
      { label: "Contact", href: "mailto:hello@ledger.finance" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#123f35] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 sm:py-14 lg:grid-cols-[1.2fr_2fr] lg:px-12">
        <div>
          <Link aria-label="Ledger home" className="inline-flex items-center gap-2.5" href="/">
            <span className="grid size-9 place-items-center border border-white/30 bg-white/10">
              <WalletCards aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
            <span className="text-sm font-semibold">Ledger</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-emerald-50/70">
            A clearer view of your money, and more confidence in what comes next.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <nav aria-label={group.title} key={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      className="text-sm text-white/75 transition-colors hover:text-white"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/15">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-white/60 sm:px-8 lg:px-12">
          © 2026 Ledger. All rights reserved.
        </p>
      </div>
    </footer>
  );
}