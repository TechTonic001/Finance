import { ArrowRight, ChartNoAxesCombined, ReceiptText, WalletCards } from "lucide-react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";

const features = [
  {
    number: "01",
    title: "Income and expense tracking",
    description: "See what comes in and where it goes, with every transaction organized in one place.",
    icon: ReceiptText,
  },
  {
    number: "02",
    title: "Monthly budgets",
    description: "Set practical limits by category and check your pace before the month gets away from you.",
    icon: WalletCards,
  },
  {
    number: "03",
    title: "Visual dashboards",
    description: "Turn everyday activity into clear trends that make your progress easier to understand.",
    icon: ChartNoAxesCombined,
  },
];

export default function Home() {
  return (
    <main className="bg-[#f5f7f4] text-zinc-950">
      <section
        className="relative flex min-h-[680px] items-center overflow-hidden bg-[#123f35] bg-cover bg-center md:min-h-[76svh]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2200&q=88')",
        }}
      >
        <div aria-hidden="true" className="absolute inset-0 bg-[#092d26]/65" />
        <PublicNavbar />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-32 text-white sm:px-8 sm:pb-20 lg:px-12">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-100 sm:text-sm">
              A calmer way to manage money
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] sm:text-6xl lg:text-7xl">
              Take control of your finances.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              Bring spending, budgets, and savings goals into one clear view, and make your next money decision with confidence.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link className="inline-flex h-12 items-center gap-3 bg-white px-5 text-sm font-semibold text-[#123f35] transition-colors hover:bg-emerald-50" href="/register">
                Get started
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <Link className="text-sm font-medium text-white/90 underline decoration-white/45 underline-offset-4 transition-colors hover:text-white" href="/login">
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12">
        <div className="mb-9 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Built for everyday decisions</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-950" id="features-heading">
              Your finances, in focus.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-600 sm:text-right">
            The essentials to understand your money today and plan for what comes next.
          </p>
        </div>

        <div className="grid border-y border-zinc-200 md:grid-cols-3 md:divide-x md:divide-zinc-200">
          {features.map(({ number, title, description, icon: Icon }) => (
            <article className="py-7 md:px-7 md:py-8 first:md:pl-0 last:md:pr-0" key={number}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tabular-nums text-emerald-800">{number}</span>
                <Icon aria-hidden="true" className="text-emerald-800" size={21} strokeWidth={1.7} />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-zinc-950">{title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
