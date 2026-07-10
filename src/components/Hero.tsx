const CHIPS = [
  "Non-custodial",
  "Keys never leave your device",
  "Verified on mainnet",
  "SIMD-0266",
];

export function Hero() {
  return (
    <section id="top" className="max-w-6xl mx-auto px-6 pt-20 pb-6">
      <div className="max-w-3xl">
        <div className="reveal font-mono text-xs tracking-[0.2em] uppercase text-sol">
          Solana upgrade · SIMD-0266
        </div>
        <h1 className="reveal font-display font-extrabold tracking-[-0.02em] leading-[1.03] mt-4"
            style={{ fontSize: "clamp(40px,7vw,72px)", animationDelay: ".08s" }}>
          Recover the <span className="grad-text">excess SOL</span> stuck in your Solana token mint.
        </h1>
        <p className="reveal text-muted mt-6 text-lg max-w-2xl" style={{ animationDelay: ".16s" }}>
          UnbrickSOL is the simplest, safest way to withdraw SOL locked in your token mint accounts.{" "}
          <span className="text-ink font-medium">Your keys never leave your device.</span>{" "}
          <a href="https://github.com/solana-foundation/solana-improvement-documents/pull/266"
            target="_blank" rel="noopener noreferrer"
            className="text-sol font-medium underline decoration-sol/30 underline-offset-2 hover:decoration-sol whitespace-nowrap">
            Read more ↗
          </a>
        </p>

        {/* differentiated proof line + credibility chips (replaces the generic 4-stat wall) */}
        <div className="reveal mt-7 flex flex-wrap items-center gap-x-3 gap-y-2" style={{ animationDelay: ".2s" }}>
          <span className="font-display font-bold text-sol text-lg">◎ 176,961 SOL</span>
          <span className="text-muted text-sm">still recoverable across 869K scanned mints</span>
        </div>
        <div className="reveal mt-4 flex flex-wrap gap-2" style={{ animationDelay: ".24s" }}>
          {CHIPS.map((c) => (
            <span key={c} className="font-mono text-[11px] text-muted bg-panel2 hairline rounded-full px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
