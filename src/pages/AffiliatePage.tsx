import { AppWalletProvider } from "../providers/WalletProvider";
import { AppHeader } from "../components/AppHeader";
import { Affiliate } from "../components/Affiliate";
import { Footer } from "../components/Footer";
import { useSeo } from "../lib/seo";
import { abs } from "../lib/site";

/**
 * Standalone affiliate onboarding page at /affiliate. Kept off the main page and out of
 * the header nav so the program isn't broadly public (discourages self-referral) - reached
 * only via the discreet "Be an affiliate" link in the footer. Needs the wallet provider.
 */
export default function AffiliatePage() {
  useSeo({
    title: "Affiliate Program | UnbrickSOL",
    description:
      "Earn 10% of every excess-SOL recovery you refer. Connect a wallet, get your referral link, and earn on-chain in the same transaction.",
    canonical: abs("/affiliate"),
  });
  return (
    <AppWalletProvider>
      <div className="min-h-screen">
        <AppHeader />
        <main>
          <div className="max-w-6xl mx-auto px-6 pt-10">
            <a href="/" className="font-mono text-xs text-muted hover:text-ink transition">← Back to UnbrickSOL</a>
          </div>
          <Affiliate />
        </main>
        <Footer />
      </div>
    </AppWalletProvider>
  );
}
