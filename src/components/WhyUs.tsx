import { ReactNode } from "react";

const POINTS: { t: string; d: string; icon: ReactNode }[] = [
  {
    t: "Non-custodial by design",
    d: "Your keys never leave your device. No seed phrase, no custody. You sign every recovery yourself.",
    icon: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  },
  {
    t: "One atomic transaction",
    d: "Withdrawal and fee happen in a single on-chain transaction you can verify on any explorer.",
    icon: <path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" />,
  },
  {
    t: "Live on-chain verification",
    d: "We read your mint live and show the exact recoverable amount before you sign.",
    icon: <path d="M3 12h4l2 6 4-14 2 8h6" />,
  },
  {
    t: "Token Program & Token-2022",
    d: "Works with both token standards, and with renounced mints via the keypair. We pick the right path for you.",
    icon: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  },
  {
    t: "Scan your whole wallet",
    d: "Connect once to find every mint you control and sweep them all at once.",
    icon: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  },
  {
    t: "Proven on mainnet",
    d: "Built on SIMD-0266 and proven with real SOL on real mints, today.",
    icon: <><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.8 7.2 17l.9-5.4L4.2 7.7l5.4-.8L12 2z" /><path d="M9.5 12l1.7 1.7 3.3-3.3" /></>,
  },
];

export function WhyUs() {
  return (
    <section id="why" className="max-w-6xl mx-auto px-6 py-14">
      <div className="max-w-2xl">
        <div className="font-mono text-xs tracking-[0.16em] uppercase text-sol">Why UnbrickSOL</div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl mt-2 leading-tight">
          The simplest, safest way to recover excess SOL from Solana token mints.
        </h2>
        <p className="text-muted mt-3 leading-relaxed">
          UnbrickSOL is the leading non-custodial tool for reclaiming SOL locked in token mint accounts.
          It handles the on-chain detail so you don't have to. Scan, verify, and recover in a couple of clicks.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {POINTS.map((p) => (
          <div key={p.t}
            className="group relative overflow-hidden rounded-2xl bg-panel hairline p-6 transition-all duration-300
                       hover:-translate-y-1 hover:border-sol/40 hover:shadow-[0_12px_30px_-12px_rgb(var(--c-sol)/0.35)]">
            {/* accent line that grows in on hover */}
            <span className="absolute left-0 top-0 h-full w-1 bg-sol-gradient scale-y-0 group-hover:scale-y-100
                             origin-top transition-transform duration-300" />
            <div className="w-11 h-11 rounded-xl bg-sol-gradient text-white inline-flex items-center justify-center
                            transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {p.icon}
              </svg>
            </div>
            <div className="font-display font-semibold mt-4 group-hover:text-sol transition-colors">{p.t}</div>
            <p className="text-sm text-muted mt-2 leading-relaxed">{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
