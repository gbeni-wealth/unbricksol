import { useState } from "react";
import { TOP_MINTS } from "../data/topMints";
import { shorten } from "../lib/solana";

const PAGE = 20;

export function TopMints({ onPick }: { onPick: (mint: string) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(TOP_MINTS.length / PAGE);
  const rows = TOP_MINTS.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <section id="mints" className="max-w-6xl mx-auto px-6 py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-mono text-xs tracking-[0.16em] uppercase text-sol">Top recoverable mints</div>
          <h2 className="font-display font-bold text-2xl mt-1">Where the stuck SOL sits</h2>
        </div>
        <div className="font-mono text-xs text-faint hidden sm:block">
          {TOP_MINTS.length} mints · look up any address for live state
        </div>
      </div>

      <div className="rounded-2xl bg-panel hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint border-b border-line">
              <th className="text-left font-normal px-5 py-3 w-10">#</th>
              <th className="text-left font-normal py-3">Token</th>
              <th className="text-left font-normal py-3 hidden sm:table-cell">Mint</th>
              <th className="text-right font-normal py-3">Excess SOL</th>
              <th className="py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.mint} className="border-b border-line/60 hover:bg-panel2 transition group">
                <td className="px-5 py-3.5 font-mono text-faint">{page * PAGE + i + 1}</td>
                <td className="py-3.5 font-display font-semibold">{m.symbol || shorten(m.mint, 4)}</td>
                <td className="py-3.5 font-mono text-muted hidden sm:table-cell">{shorten(m.mint, 4)}</td>
                <td className="py-3.5 text-right font-mono text-sol">
                  {m.excessSol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 pr-5 text-right">
                  <button onClick={() => onPick(m.mint)}
                    className="font-mono text-xs text-muted group-hover:text-ink border border-line2 rounded-lg px-3 py-1.5 hover:border-sol/50 transition">
                    Look up →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-5 py-3 font-mono text-xs text-faint">
          <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, TOP_MINTS.length)} of {TOP_MINTS.length}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-line2 disabled:opacity-30 hover:border-sol/50 transition">← Prev</button>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-line2 disabled:opacity-30 hover:border-sol/50 transition">Next →</button>
          </div>
        </div>
      </div>
    </section>
  );
}
