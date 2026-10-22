import Footer from "@/components/Footer";
import PublicNavbar from "@/components/PublicNavbar";

const sections = [
  {
    title: "Information We Collect",
    paragraphs: [
      "Ledger collects information you provide when you create an account, such as your email address and password. You may also provide financial information, including transactions, categories, budgets, and savings goals, when using the service.",
      "We may receive basic technical information necessary to operate and protect the service, such as browser details, device information, and service activity.",
    ],
  },
  {
    title: "How We Use Your Information",
    paragraphs: [
      "We use your information to provide and maintain your account, display your financial activity, calculate summaries and trends, and support the features you request.",
      "We may also use limited technical information to protect the service, troubleshoot issues, and improve reliability. We do not sell your personal financial information.",
    ],
  },
  {
    title: "Cookies",
    paragraphs: [
      "Ledger may use essential cookies to support sign-in, maintain secure sessions, and remember settings required for the service to function. These cookies are not used to build advertising profiles.",
      "You can manage cookies through your browser settings. Disabling essential cookies may prevent some parts of Ledger from working correctly.",
    ],
  },
  {
    title: "Data Security",
    paragraphs: [
      "We use reasonable technical and organizational safeguards designed to protect your information from unauthorized access, loss, or misuse. Passwords are stored as one-way hashes rather than in plain text.",
      "No method of transmission or storage is completely secure. Please use a unique password and contact us promptly if you believe your account has been accessed without permission.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f4] text-zinc-950">
      <div className="relative h-[76px] bg-[#123f35]">
        <PublicNavbar />
      </div>
      <article className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <header className="border-b border-zinc-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">Privacy Policy</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: October 22, 2026</p>
          <p className="mt-6 max-w-3xl text-base leading-7 text-zinc-600">
            This policy explains how Ledger collects, uses, and protects information when you use our personal finance tools.
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