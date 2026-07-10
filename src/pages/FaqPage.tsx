import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FaqSection } from "../components/FaqSection";
import { useSeo } from "../lib/seo";
import { faqJsonLd, breadcrumbJsonLd } from "../lib/jsonld";
import { abs } from "../lib/site";

/** Dedicated /faq page - FAQPage schema + on-page Q&A for search and LLM extraction. */
export default function FaqPage() {
  useSeo({
    title: "Excess SOL Recovery FAQ | UnbrickSOL",
    description:
      "Answers to common questions about recovering excess SOL from Solana token mints: what excess SOL is, who can recover it, whether it's safe, renounced mints, Token-2022, and how much you can reclaim.",
    canonical: abs("/faq"),
    jsonLd: [
      faqJsonLd(),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "FAQ", path: "/faq" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <div className="max-w-3xl mx-auto px-6 pt-10">
          <a href="/" className="font-mono text-xs text-muted hover:text-ink transition">← Back to UnbrickSOL</a>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-6">Excess SOL Recovery FAQ</h1>
          <p className="text-muted mt-3">
            Everything you need to know about reclaiming the SOL locked in your Solana token mints.
          </p>
        </div>
        <FaqSection heading={false} />
      </main>
      <Footer />
    </div>
  );
}
