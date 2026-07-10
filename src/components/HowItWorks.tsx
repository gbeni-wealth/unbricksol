const STEPS = [
  {
    n: "01",
    t: "Paste a mint or connect your wallet",
    d: "Drop in any SPL token mint address, or connect your wallet to auto-scan every mint you control.",
  },
  {
    n: "02",
    t: "See what's recoverable",
    d: "UnbrickSOL reads the mint on-chain, detects Token Program vs Token-2022, and shows the exact excess SOL above the rent-exempt minimum, plus your net after fee.",
  },
  {
    n: "03",
    t: "Verify the details",
    d: "Confirm the recovery path (active authority or mint keypair) and the amount. Nothing is hidden and nothing is committed until you approve.",
  },
  {
    n: "04",
    t: "Sign and recover",
    d: "Approve a single transaction in your wallet. The excess SOL lands in your account and you can verify the transaction on any Solana explorer.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-14">
      <div className="font-mono text-xs tracking-[0.16em] uppercase text-sol">How it works</div>
      <h2 className="font-display font-bold text-2xl sm:text-3xl mt-2 leading-tight">
        Recover stuck SOL in four steps.
      </h2>

      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-2xl bg-panel hairline p-6">
            <div className="font-mono text-sol text-sm">{s.n}</div>
            <div className="font-display font-semibold mt-2">{s.t}</div>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
