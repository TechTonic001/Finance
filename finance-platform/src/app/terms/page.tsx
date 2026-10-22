import Footer from "@/components/Footer";
import PublicNavbar from "@/components/PublicNavbar";

const sections = [
  {
    title: "Acceptance of Terms",
    paragraphs: [
      "These Terms of Service govern your access to and use of Ledger. By creating an account or using the service, you agree to these terms. If you do not agree, do not use Ledger.",
      "We may update these terms as the service evolves. When changes are material, we will take reasonable steps to notify you. Continued use after updated terms take effect means you accept them.",
    ],
  },
  {
    title: "User Accounts",
    paragraphs: [
      "You are responsible for providing accurate account information, keeping your sign-in credentials confidential, and all activity that occurs through your account.",
      "Notify us promptly if you suspect unauthorized access. You may not share, transfer, or use another person's account without permission.",
    ],
  },
  {
    title: "Prohibited Conduct",
    paragraphs: [
      "You may not use Ledger for unlawful activity, attempt to access another person's account or data, interfere with the service or its security, or introduce malicious code.",
      "You may not misuse, reverse engineer, or disrupt the service, or use it in a way that violates the rights of others or applicable law.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "Ledger is provided as a financial organization tool for informational purposes. It is not a bank, accounting service, tax service, or investment adviser, and its summaries should not be treated as professional financial advice.",
      "To the extent permitted by law, Ledger is provided without warranties, and we are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service. These terms do not limit liability that cannot be excluded under applicable law.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f4] text-zinc-950">
      <div className="relative h-[76px] bg-[#123f35]">
        <PublicNavbar />
      </div>
      <article className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <header className="border-b border-zinc-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">Terms of Service</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: October 22, 2026</p>
          <p className="mt-6 max-w-3xl text-base leading-7 text-zinc-600">
            These terms describe the basic rules for using Ledger and help set clear expectations for everyone.
          </p>
        </header>
        <div className="divide-y divide-zinc-200">
          {sections.map((section, index) => (
            <section className="py-8" key={section.title}>
              <h2 className="text-xl font-semibold text-zinc-950">{index + 1}. {section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-600 sm:text-base">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </main>
  );
}