import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { readMint, MintInfo, fmtSol, fmtUsd, shorten, scanWallet, ScannedMint } from "../lib/solana";
import { buildRecoveryPlan } from "../lib/recovery";
import { resolveAffiliate, feeRecipientsFor, totalFeeBps } from "../lib/fees";
import { recordClaim } from "../lib/leaderboard";
import { confirmOrThrow } from "../lib/confirm";
import { SITE_URL } from "../lib/site";
import { readTokenMeta, TokenMeta } from "../lib/tokenMeta";
import { BrickScanner } from "./BrickScanner";
import { ClaimSuccessModal } from "./ClaimSuccessModal";

// Path A — the recovery experience for ~95% of users: paste a mint (or connect a
// wallet and let the scan find them), then sign with the wallet that controls the mint.
// There is deliberately NO mention of keypairs here. A renounced mint (no active
// authority) can't be recovered this way, so we simply point the user down to the
// Advanced recovery section instead of ever asking for a key file.
export function Recover({ mint, setMint, onNeedsAdvanced }: {
  mint: string; setMint: (m: string) => void; onNeedsAdvanced: (mint: string) => void;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [aff, setAff] = useState("");
  const [info, setInfo] = useState<MintInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [sig, setSig] = useState("");
  const [affiliate, setAffiliate] = useState<PublicKey | null>(null);
  const [siblings, setSiblings] = useState<ScannedMint[] | null>(null);
  // Success animation payload — kept separate from `sig` because lookup() (called after a
  // recovery to refresh the mint) resets sig/info; the modal must survive that refresh.
  const [claim, setClaim] = useState<{ lamports: number; sig: string } | null>(null);
  // Transient "Copied ✓" feedback after a share.
  const [shared, setShared] = useState(false);
  const [meta, setMeta] = useState<TokenMeta | null>(null);

  async function shareMint() {
    const trimmed = mint.trim();
    if (!trimmed) return;
    const url = `${SITE_URL}/?mint=${trimmed}`;
    const text = `Excess SOL recoverable from this mint — check it on UnbrickSOL:`;
    // Native share on mobile / supported browsers; clipboard fallback everywhere else.
    try {
      if (navigator.share) {
        await navigator.share({ title: "UnbrickSOL", text, url });
        return;
      }
    } catch { /* user cancelled — fall through to clipboard */ }
    try { await navigator.clipboard.writeText(url); } catch { return; }
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  }

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) setAff(ref.toUpperCase());
  }, []);

  useEffect(() => {
    let live = true;
    resolveAffiliate(aff).then((pk) => { if (live) setAffiliate(pk); });
    return () => { live = false; };
  }, [aff]);

  async function lookup() {
    setErr(""); setInfo(null); setSig(""); setStatus(""); setMeta(null);
    let pk: PublicKey;
    try { pk = new PublicKey(mint.trim()); } catch { setErr("Invalid mint address"); return; }
    setLoading(true);
    try {
      setInfo(await readMint(pk));
      // Metadata is best-effort — a missing Metaplex PDA is a valid on-chain state.
      readTokenMeta(pk).then(setMeta).catch(() => setMeta(null));
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (mint) lookup(); /* eslint-disable-next-line */ }, [mint]);

  // If the looked-up mint has an active authority, check whether that same wallet
  // controls other recoverable mints - nudge the user to connect and sweep them all.
  useEffect(() => {
    let live = true;
    setSiblings(null);
    const auth = info?.mintAuthority;
    if (!auth) return;
    scanWallet(auth)
      .then((all) => { if (live) setSiblings(all.filter((m) => m.mint !== mint.trim())); })
      .catch(() => { if (live) setSiblings(null); });
    return () => { live = false; };
  }, [info, mint]);

  const siblingTotal = (siblings ?? []).reduce((s, m) => s + m.excessLamports, 0);

  // A renounced mint can only be recovered via the Advanced path, so surface it: this
  // auto-opens the (otherwise collapsed) Advanced recovery section and seeds it.
  useEffect(() => {
    if (info && info.mintAuthority === null) onNeedsAdvanced(mint.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  const feeBps = info ? totalFeeBps(affiliate) : 2500;
  const fee = info ? Math.floor((info.excessLamports * feeBps) / 10000) : 0;
  const net = info ? info.excessLamports - fee : 0;

  async function recover() {
    if (!info || !publicKey) return;
    // Renounced mints have no active authority to sign — they belong to Advanced recovery.
    if (info.mintAuthority === null) return;
    setErr(""); setStatus("Building transaction…"); setSig("");
    try {
      const mintPk = new PublicKey(mint.trim());
      if (!publicKey.equals(info.mintAuthority))
        throw new Error(`Connect the mint authority wallet (${shorten(info.mintAuthority.toBase58())})`);

      const plan = await buildRecoveryPlan({
        connection, programId: info.programId, mint: mintPk,
        destination: publicKey, authority: publicKey,
        feeRecipients: feeRecipientsFor(affiliate),
      });
      const tx = new Transaction().add(...plan.instructions);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      setStatus("Awaiting signature…");
      const signature = await sendTransaction(tx, connection);
      setStatus("Confirming…");
      // Throws unless the tx landed AND succeeded on-chain — a reverted tx must
      // never be recorded as a recovery.
      await confirmOrThrow(connection, signature);
      setSig(signature);
      setStatus("");
      const affiliateLamports = plan.breakdown.find((b) => b.label === "affiliate")?.lamports ?? 0;
      await recordClaim({ wallet: publicKey.toBase58(), mint: mintPk.toBase58(),
        recoveredLamports: plan.netToDevLamports, sig: signature, at: Date.now(),
        affiliateCode: affiliate ? aff.trim().toUpperCase() : null,
        affiliateLamports });
      // Celebrate the confirmed recovery, then refresh the mint (which clears sig/info).
      setClaim({ lamports: plan.netToDevLamports, sig: signature });
      lookup();
    } catch (e: any) { setErr(e.message || "Recovery failed"); setStatus(""); }
  }

  const renounced = info?.mintAuthority === null;

  function goAdvanced(e: React.MouseEvent) {
    e.preventDefault();
    onNeedsAdvanced(mint.trim()); // ensure the Advanced section is open before scrolling
    document.getElementById("advanced")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="recover" className="max-w-6xl mx-auto px-6 pt-2 pb-14 scroll-mt-0">
      <div className="flex gap-3 flex-wrap">
        <input value={mint} onChange={(e) => setMint(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="paste a mint address…"
          className="flex-1 min-w-[260px] font-mono text-sm bg-panel2 hairline rounded-xl px-5 py-4 outline-none focus:border-sol/50 transition" />
        <button onClick={lookup} disabled={loading}
          className="font-display font-semibold text-white bg-sol-gradient rounded-xl px-8 py-4 disabled:opacity-60">
          {loading ? "Looking up…" : "Check mint"}
        </button>
      </div>

      {err && <div className="mt-4 font-mono text-sm text-red-600">{err}</div>}

      {info && (
        <div className="reveal-card mt-5 rounded-2xl bg-panel hairline p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {meta?.symbol && (
                <div className="font-display font-bold text-xl leading-tight">
                  {meta.symbol}
                  {meta.name && meta.name !== meta.symbol && (
                    <span className="font-normal text-muted text-base"> · {meta.name}</span>
                  )}
                </div>
              )}
              <div className={`font-mono text-xs text-faint break-all ${meta?.symbol ? "mt-1" : ""}`}>
                {mint.trim()}
              </div>
            </div>
            <button onClick={shareMint} aria-label="Share this mint"
              className="shrink-0 font-mono text-[11px] text-muted bg-panel2 hairline hover:border-sol/40 hover:text-ink rounded-lg px-2.5 py-1.5 transition whitespace-nowrap">
              {shared ? "Copied ✓" : "Share ↗"}
            </button>
          </div>

          {siblings && siblings.length > 0 && (
            <div className="mt-4 rounded-xl bg-sol/[0.06] border border-sol/30 px-4 py-3">
              <div className="font-mono text-sm text-sol">
                This mint's authority controls {siblings.length} other recoverable mint{siblings.length === 1 ? "" : "s"}
                {" "}(◎ {fmtSol(siblingTotal, 4)} more).
              </div>
              <div className="font-mono text-xs text-muted mt-1">
                Connect this wallet ({shorten(info!.mintAuthority!.toBase58())}) to scan and sweep them all in one place.
              </div>
            </div>
          )}

          <div className="mt-5">
            <BrickScanner />
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mt-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Excess SOL</div>
              <div className="font-display font-bold text-3xl text-sol mt-1">{fmtSol(info.excessLamports, 4)}</div>
              <div className="font-mono text-xs text-muted mt-1">≈ {fmtUsd(info.excessLamports)}</div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">You receive ({100 - feeBps / 100}%)</div>
              <div className="font-display font-bold text-3xl mt-1">{fmtSol(net, 4)}</div>
              <div className="font-mono text-xs text-muted mt-1">fee {feeBps / 100}% = {fmtSol(fee, 4)} SOL{affiliate ? " (10% platform + 10% affiliate)" : ""}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-px bg-line rounded-xl overflow-hidden mt-5 hairline">
            <Cell k="Recovery path" v={renounced ? "advanced" : "authority wallet"} />
            <Cell k="Authority" v={renounced ? "renounced" : shorten(info.mintAuthority!.toBase58())}
              badge={renounced ? "warn" : "ok"} badgeText={renounced ? "renounced" : "active"} />
            <Cell k="Program" v={info.programLabel} />
          </div>

          {!renounced && (
            <div className="mt-5 flex gap-3 items-center flex-wrap">
              <input value={aff} onChange={(e) => setAff(e.target.value.toUpperCase())}
                placeholder="AFFILIATE CODE (optional)"
                className="font-mono text-xs bg-panel2 hairline rounded-lg px-3 py-2.5 w-52 outline-none focus:border-sol/50" />
              {aff && (
                <span className={`font-mono text-xs ${affiliate ? "text-good" : "text-warn"}`}>
                  {affiliate ? "code valid ✓ · 20% fee" : "code not found · 25%"}
                </span>
              )}
            </div>
          )}

          <div className="mt-6">
            {renounced ? (
              <a href="#advanced" onClick={goAdvanced}
                className="block rounded-xl bg-warn/[0.06] border border-warn/30 px-4 py-3 hover:border-warn/50 transition">
                <div className="font-mono text-sm text-warn">This mint's authority has been renounced.</div>
                <div className="font-mono text-xs text-muted mt-1">
                  Recovering it needs the original mint keypair — use <span className="text-ink">Advanced recovery ↓</span>
                </div>
              </a>
            ) : !publicKey ? (
              <WalletMultiButton />
            ) : info.excessLamports <= 0 ? (
              <div className="font-mono text-sm text-muted">Nothing to recover. This mint holds only its rent minimum.</div>
            ) : (
              <button onClick={recover} disabled={!!status}
                className="w-full font-display font-semibold text-white bg-sol-gradient rounded-xl py-4 text-lg disabled:opacity-60">
                {status || `Recover ◎ ${fmtSol(net, 4)}`}
              </button>
            )}
          </div>

        </div>
      )}

      {claim && (
        <ClaimSuccessModal lamports={claim.lamports} sig={claim.sig} onClose={() => setClaim(null)} />
      )}
    </section>
  );
}

function Cell({ k, v, badge, badgeText }: { k: string; v: string; badge?: "ok" | "warn"; badgeText?: string }) {
  return (
    <div className="bg-panel p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">{k}</div>
      <div className="font-mono text-sm mt-1.5 flex items-center gap-2">
        {v}
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge === "ok"
            ? "text-good border border-good/40" : "text-warn border border-warn/40"}`}>{badgeText}</span>
        )}
      </div>
    </div>
  );
}
