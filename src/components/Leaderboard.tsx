import { useEffect, useState } from "react";
import { leaderboard, LeaderRow, txUrl } from "../lib/leaderboard";
import { fmtSol, shorten } from "../lib/solana";

export function Leaderboard() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  useEffect(() => { leaderboard().then(setRows).catch(() => setRows([])); }, []);
  const total = rows.reduce((a, r) => a + r.lamports, 0);

  return (
    <section id="leaderboard" className="max-w-6xl mx-auto px-6 py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-mono text-xs tracking-[0.16em] uppercase text-sol">Leaderboard</div>
          <h2 className="font-display font-bold text-2xl mt-1">Top recoverers</h2>
        </div>
        {rows.length > 0 && (
          <div className="font-mono text-xs text-faint">
            ◎ {fmtSol(total, 4)} recovered · {rows.reduce((a, r) => a + r.claims, 0)} claims · {rows.length} wallets
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-panel hairline p-10 text-center">
          <div className="font-display font-semibold text-lg">No recoveries yet</div>
          <div className="font-mono text-sm text-muted mt-2">Be the first. Look up a mint and sweep the excess.</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-panel hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint border-b border-line">
                <th className="text-left font-normal px-5 py-3 w-10">#</th>
                <th className="text-left font-normal py-3">Wallet</th>
                <th className="text-right font-normal py-3">Recovered</th>
                <th className="text-right font-normal py-3">Claims</th>
                <th className="text-right font-normal py-3 pr-5">Tx</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.wallet} className="border-b border-line/60">
                  <td className="px-5 py-3.5 font-mono text-faint">{i + 1}</td>
                  <td className="py-3.5 font-mono">{shorten(r.wallet)}</td>
                  <td className="py-3.5 text-right font-mono text-sol">◎ {fmtSol(r.lamports, 4)}</td>
                  <td className="py-3.5 text-right font-mono text-muted">{r.claims}</td>
                  <td className="py-3.5 pr-5 text-right">
                    <a href={txUrl(r.sig, r.cluster)} target="_blank"
                      className="font-mono text-xs text-sol hover:opacity-70 transition">{shorten(r.sig)} ↗</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
