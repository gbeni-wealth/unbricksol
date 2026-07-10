import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { registerAffiliate, Affiliate as Aff } from "../lib/fees";
import { shorten, fmtSol } from "../lib/solana";
import { affiliateEarnings, AffiliateEarning, txUrl } from "../lib/leaderboard";

const STEPS = [
  { n: "01", t: "Connect a wallet", d: "This wallet receives your affiliate share: 10% of every recovery made through your link." },
  { n: "02", t: "Get your code & link", d: "We mint a referral code tied to your wallet. Share the link with holders sitting on bricked SOL." },
  { n: "03", t: "They pay 20%, not 25%", d: "Anyone who claims through your link gets a 5% discount. The 20% fee splits 10% to the platform, 10% to you." },
];

export function Affiliate() {
  const { publicKey } = useWallet();
  const [aff, setAff] = useState<Aff | null>(null);
  const [copied, setCopied] = useState("");
  const [earnings, setEarnings] = useState<AffiliateEarning[] | null>(null);

  useEffect(() => {
    let live = true;
    if (publicKey) registerAffiliate(publicKey.toBase58()).then((a) => { if (live) setAff(a); });
    else { setAff(null); setEarnings(null); }
    return () => { live = false; };
  }, [publicKey]);

  useEffect(() => {
    let live = true;
    if (aff) {
      setEarnings(null);
      affiliateEarnings(aff.code).then((e) => { if (live) setEarnings(e); });
    }
    return () => { live = false; };
  }, [aff]);

  const totalEarned = (earnings ?? []).reduce((s, e) => s + e.affiliateLamports, 0);

  const link = aff ? `${location.origin}${location.pathname}?ref=${aff.code}` : "";

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <section id="affiliate" className="max-w-6xl mx-auto px-6 py-14">
      <div className="rounded-3xl bg-panel hairline overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-line bg-sol-gradient/[0.03]">
          <div className="font-mono text-xs tracking-[0.16em] uppercase text-sol">Affiliate program</div>
          <h2 className="font-display font-bold text-3xl mt-2 max-w-xl leading-tight">
            Earn <span className="grad-text">10%</span> of every recovery you refer.
          </h2>
          <p className="text-muted mt-3 max-w-xl">
            You know who's holding bricked SOL. Bring them here and take a cut of what they sweep. Paid on-chain,
            in the same atomic transaction, straight to your wallet.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-px bg-line">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-panel p-6">
              <div className="font-mono text-sol text-sm">{s.n}</div>
              <div className="font-display font-semibold mt-2">{s.t}</div>
              <div className="text-sm text-muted mt-1.5 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="p-8 sm:p-10">
          {!publicKey ? (
            <div className="flex flex-col items-start gap-3">
              <div className="font-mono text-sm text-muted">Connect the wallet that should receive your commissions.</div>
              <WalletMultiButton />
            </div>
          ) : aff ? (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-panel2 hairline p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Your code</div>
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <div className="font-display font-bold text-2xl grad-text">{aff.code}</div>
                    <button onClick={() => copy(aff.code, "code")}
                      className="font-mono text-xs border border-line2 rounded-lg px-3 py-1.5 hover:border-sol/50 transition">
                      {copied === "code" ? "copied ✓" : "copy"}
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl bg-panel2 hairline p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Payout wallet</div>
                  <div className="font-mono text-sm mt-3">{shorten(publicKey.toBase58(), 6)}</div>
                </div>
              </div>

              <div className="rounded-2xl bg-panel2 hairline p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Referral link</div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <code className="font-mono text-xs text-ink break-all flex-1 min-w-[220px]">{link}</code>
                  <button onClick={() => copy(link, "link")}
                    className="font-display font-semibold text-white bg-sol-gradient rounded-lg px-5 py-2.5 text-sm">
                    {copied === "link" ? "copied ✓" : "copy link"}
                  </button>
                </div>
              </div>

              {/* Earnings: every recovery that paid this affiliate a fee */}
              <div className="rounded-2xl bg-panel2 hairline p-5">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Total earned</div>
                    <div className="font-display font-bold text-2xl grad-text mt-1">◎ {fmtSol(totalEarned, 4)}</div>
                  </div>
                  <div className="font-mono text-xs text-muted">
                    {earnings === null ? "loading…" : `${earnings.length} referred recover${earnings.length === 1 ? "y" : "ies"}`}
                  </div>
                </div>

                {earnings !== null && earnings.length > 0 && (
                  <div className="mt-4 divide-y divide-line">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                      <span>Mint</span><span className="text-right">Your fee</span><span className="text-right pl-3">Tx</span>
                    </div>
                    {earnings.map((e) => (
                      <div key={e.sig} className="grid grid-cols-[1fr_auto_auto] gap-3 py-2.5 items-center text-sm">
                        <span className="font-mono text-xs text-muted truncate">{shorten(e.mint, 6)}</span>
                        <span className="font-mono text-sm text-good text-right whitespace-nowrap">◎ {fmtSol(e.affiliateLamports, 4)}</span>
                        <a href={txUrl(e.sig, e.cluster)} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-sol hover:underline text-right pl-3 whitespace-nowrap">view ↗</a>
                      </div>
                    ))}
                  </div>
                )}

                {earnings !== null && earnings.length === 0 && (
                  <div className="mt-3 font-mono text-xs text-muted">
                    No referred recoveries yet. Share your link. Every recovery made through it pays you 10%, straight to this wallet.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
