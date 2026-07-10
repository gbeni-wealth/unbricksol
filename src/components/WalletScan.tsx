import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { scanWallet, ScannedMint, fmtSol, fmtUsd, shorten } from "../lib/solana";
import { buildRecoveryPlan } from "../lib/recovery";
import { feeRecipientsFor, resolveAffiliate } from "../lib/fees";
import { recordClaim } from "../lib/leaderboard";
import { confirmOrThrow } from "../lib/confirm";

// How many mints to sweep in a single transaction on "Recover all". Each mint adds
// one withdraw + fee-split instruction(s); this stays comfortably under the size cap.
const BATCH = 5;

type RowState = "idle" | "working" | "done" | "error";

export function WalletScan() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [mints, setMints] = useState<ScannedMint[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState("");
  const [affiliate, setAffiliate] = useState<PublicKey | null>(null);
  const [affCode, setAffCode] = useState("");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [done, setDone] = useState<Record<string, string>>({}); // mint -> sig
  const [bulk, setBulk] = useState("");

  // Honour a ?ref= affiliate link, same as the manual flow.
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) { setAffCode(ref.toUpperCase()); resolveAffiliate(ref).then(setAffiliate); }
  }, []);

  // Auto-scan the moment a wallet connects.
  useEffect(() => {
    let live = true;
    if (!publicKey) { setMints(null); setRows({}); setDone({}); setErr(""); return; }
    setScanning(true); setErr("");
    scanWallet(publicKey)
      .then((m) => { if (live) setMints(m); })
      .catch((e) => { if (live) setErr(e.message || "Scan failed"); })
      .finally(() => { if (live) setScanning(false); });
    return () => { live = false; };
  }, [publicKey]);

  const pending = (mints ?? []).filter((m) => done[m.mint] === undefined);
  const total = pending.reduce((s, m) => s + m.excessLamports, 0);

  async function recoverMints(targets: ScannedMint[]): Promise<void> {
    if (!publicKey) return;
    const plans = [];
    for (const m of targets) {
      const plan = await buildRecoveryPlan({
        connection, programId: m.programId, mint: new PublicKey(m.mint),
        destination: publicKey, authority: publicKey,
        feeRecipients: feeRecipientsFor(affiliate),
      });
      plans.push({ m, plan });
    }
    const tx = new Transaction().add(...plans.flatMap((p) => p.plan.instructions));
    tx.feePayer = publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const sig = await sendTransaction(tx, connection);
    await confirmOrThrow(connection, sig);

    // A batch is a single transaction, so it's one leaderboard row: the
    // record-claim function derives the total recovered from the tx itself
    // (unique(sig) would reject per-mint duplicates anyway). Sum only feeds the
    // local cache; the server ignores client-supplied amounts.
    const nextDone: Record<string, string> = {};
    for (const { m } of plans) nextDone[m.mint] = sig;
    await recordClaim({
      wallet: publicKey.toBase58(), mint: plans[0].m.mint,
      recoveredLamports: plans.reduce((s, p) => s + p.plan.netToDevLamports, 0),
      sig, at: Date.now(),
      affiliateCode: affiliate ? affCode.trim().toUpperCase() : null,
      affiliateLamports: plans.reduce(
        (s, p) => s + (p.plan.breakdown.find((b) => b.label === "affiliate")?.lamports ?? 0), 0),
    });
    setDone((d) => ({ ...d, ...nextDone }));
  }

  async function recoverOne(m: ScannedMint) {
    setRows((r) => ({ ...r, [m.mint]: "working" }));
    try { await recoverMints([m]); setRows((r) => ({ ...r, [m.mint]: "done" })); }
    catch (e: any) { setErr(e.message || "Recovery failed"); setRows((r) => ({ ...r, [m.mint]: "error" })); }
  }

  async function recoverAll() {
    setErr("");
    const targets = pending.slice();
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      setBulk(`Recovering ${i + 1}–${Math.min(i + BATCH, targets.length)} of ${targets.length}…`);
      chunk.forEach((m) => setRows((r) => ({ ...r, [m.mint]: "working" })));
      try {
        await recoverMints(chunk);
        chunk.forEach((m) => setRows((r) => ({ ...r, [m.mint]: "done" })));
      } catch (e: any) {
        setErr(e.message || "Recovery failed");
        chunk.forEach((m) => setRows((r) => ({ ...r, [m.mint]: "error" })));
        break;
      }
    }
    setBulk("");
  }

  if (!publicKey) return null;
  // A scan that finds nothing renders nothing — the index is incomplete, so an empty
  // result is not an authoritative "you have nothing". The user just uses the paste-a-mint
  // tool below. (Only show this section while scanning, on error, or when mints exist.)
  if (!scanning && !(err && !mints) && (!mints || mints.length === 0)) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 pt-2 pb-8">
      <div className="reveal-card rounded-2xl bg-panel hairline p-6 sm:p-8">
        {scanning ? (
          <div className="font-mono text-sm text-muted">Scanning your wallet for bricked SOL…</div>
        ) : err && !mints ? (
          <div className="font-mono text-sm text-red-600">{err}</div>
        ) : mints ? (
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display font-bold text-xl">Wallet Scan Complete</div>
                <div className="font-mono text-sm text-good mt-1">
                  ✓ {mints.length} mint{mints.length === 1 ? "" : "s"} detected
                  {Object.keys(done).length > 0 && ` · ${Object.keys(done).length} recovered`}
                </div>
              </div>
              {pending.length > 1 && (
                <button onClick={recoverAll} disabled={!!bulk}
                  className="font-display font-semibold text-white bg-sol-gradient rounded-xl px-6 py-3 disabled:opacity-60">
                  {bulk || `Recover all ◎ ${fmtSol(total, 4)}`}
                </button>
              )}
            </div>

            {err && <div className="mt-3 font-mono text-xs text-red-600">{err}</div>}

            <div className="mt-5 divide-y divide-line">
              {mints.map((m) => {
                const state = rows[m.mint] ?? "idle";
                const sig = done[m.mint];
                return (
                  <div key={m.mint} className="grid grid-cols-[1fr_auto] gap-4 py-4 items-center">
                    <div className="min-w-0">
                      <div className="font-mono text-sm truncate">{shorten(m.mint, 6)}</div>
                      <div className="font-mono text-[11px] text-faint mt-0.5">{m.programLabel}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">Recoverable</div>
                        <div className="font-display font-bold text-lg text-sol">◎ {fmtSol(m.excessLamports, 4)}</div>
                        <div className="font-mono text-[10px] text-muted">≈ {fmtUsd(m.excessLamports)}</div>
                      </div>
                      {sig ? (
                        <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-good whitespace-nowrap">recovered ✓ ↗</a>
                      ) : (
                        <button onClick={() => recoverOne(m)} disabled={state === "working" || !!bulk}
                          className="font-display font-semibold text-sm border border-line2 rounded-lg px-4 py-2 hover:border-sol/50 transition disabled:opacity-50 whitespace-nowrap">
                          {state === "working" ? "Recovering…" : "Recover"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pending.length > 0 && (
              <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-faint">Total recoverable</div>
                <div className="font-display font-bold text-2xl grad-text">◎ {fmtSol(total, 4)}</div>
              </div>
            )}

            {affiliate && (
              <div className="mt-3 font-mono text-xs text-good">Affiliate code {affCode} applied · 20% fee</div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
