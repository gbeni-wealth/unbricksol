import { useState } from "react";
import { AppWalletProvider } from "./providers/WalletProvider";
import { AppHeader } from "./components/AppHeader";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { WhyUs } from "./components/WhyUs";
import { TopMints } from "./components/TopMints";
import { Recover } from "./components/Recover";
import { AdvancedRecovery } from "./components/AdvancedRecovery";
import { WalletScan } from "./components/WalletScan";
import { Leaderboard } from "./components/Leaderboard";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { useSeo } from "./lib/seo";
import { homeJsonLd } from "./lib/jsonld";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "./lib/site";

/** The interactive home page. Kept in its own chunk (with the wallet provider) so the
 *  blog/FAQ/marketing routes don't ship the wallet + web3 bundle. */
export default function HomeApp() {
  const [mint, setMint] = useState("");
  // Advanced recovery is collapsed until the user opens it, or until the standard flow
  // hands it a renounced mint (which can only be recovered that way).
  const [advOpen, setAdvOpen] = useState(false);
  const [advMint, setAdvMint] = useState("");
  useSeo({
    title: `${SITE_NAME} · Recover excess SOL from your Solana token mint`,
    description: SITE_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    jsonLd: homeJsonLd(),
  });

  function pick(m: string) {
    setMint(m);
    document.getElementById("recover")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <AppWalletProvider>
      <div className="min-h-screen">
        <AppHeader />
        <main>
          <Hero />
          <WalletScan />
          <Recover mint={mint} setMint={setMint}
            onNeedsAdvanced={(m) => { setAdvMint(m); setAdvOpen(true); }} />
          <AdvancedRecovery open={advOpen} onToggle={() => setAdvOpen((v) => !v)} presetMint={advMint} />
          <HowItWorks />
          <WhyUs />
          <TopMints onPick={pick} />
          <Leaderboard />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </AppWalletProvider>
  );
}
