import { useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { readMint, MintInfo, fmtSol, fmtUsd, shorten } from "../lib/solana";
import { buildRecoveryPlan } from "../lib/recovery";
import { resolveAffiliate, feeRecipientsFor, totalFeeBps } from "../lib/fees";
import { recordClaim } from "../lib/leaderboard";
import { ClaimSuccessModal } from "./ClaimSuccessModal";
import { CLI_URL } from "../lib/site";

// Path B — the advanced experience for developers who still hold the original mint
// keypair (e.g. a renounced mint with no active authority). The user picks the trust
// model they're comfortable with: recover in the browser (the key is read locally and
// never uploaded), or download the open-source CLI and never let a key touch a webpage.
//
// It stays COLLAPSED by default so the ~95% never see keypair UI. It expands on click,
// or auto-opens (via `open`) when a renounced mint — which requires this path — is
// entered in the standard flow.
type Mode = "browser" | "cli";

export function AdvancedRecovery({ open, onToggle, presetMint }: {
  open: boolean; onToggle: () => void; presetMint?: string;
}) {
  const [mode, setMode] = useState<Mode>("browser");

  return (
    <section id="advanced" className="max-w-6xl mx-auto px-6 pt-2 pb-16 scroll-mt-4">
      <div className="rounded-2xl bg-panel2 hairline p-6 sm:p-8">
        {/* Collapsed header — clicking toggles the details. */}
        <button onClick={onToggle} aria-expanded={open}
          className="w-full flex items-center justify-between gap-4 text-left">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Advanced</div>
            <h2 className="font-display font-bold text-2xl mt-1">
              Advanced recovery <span className="text-muted font-normal text-lg">(original mint keypair required)</span>
            </h2>
            <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">
              For developers who still hold the original mint keypair — for example a mint whose
              authority has been renounced.
            </p>
          </div>
          <span className="font-mono text-xs text-muted whitespace-nowrap shrink-0 border border-line2 rounded-lg px-3 py-2">
            {open ? "Hide ▲" : "Show ▼"}
          </span>
        </button>

        {open && (
          <div className="mt-6">
            <p className="text-sm text-muted leading-relaxed max-w-2xl">
              This method is intended for developers who still possess the original mint keypair used
              during token creation. Choose the trust model you're comfortable with.
            </p>

            {/* Trust-model chooser */}
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <ModeCard
                active={mode === "browser"} onClick={() => setMode("browser")}
                title="Browser recovery"
                desc="Recover here. Your keypair is read locally in your browser and never uploaded."
              />
              <ModeCard
                active={mode === "cli"} onClick={() => setMode("cli")}
                title="Download the open-source CLI"
                desc="Run recovery yourself from your terminal. Your key never touches a webpage."
              />
            </div>

            <div className="mt-6">
              {mode === "browser" ? <BrowserRecovery initialMint={presetMint} /> : <CliRecovery />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ModeCard(p: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={p.onClick}
      className={`text-left rounded-xl p-4 border transition ${p.active
        ? "border-sol/60 bg-sol/[0.06]" : "border-line2 bg-panel hover:border-sol/30"}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${p.active
          ? "border-sol bg-sol" : "border-line2"}`} />
        <span className="font-display font-semibold">{p.title}</span>
      </div>
      <div className="font-mono text-xs text-muted mt-2 leading-relaxed">{p.desc}</div>
    </button>
  );
}

// ── Browser recovery: paste mint → load its keypair locally → connect a wallet to
// receive + pay fees → sign. The mint keypair signs the withdraw; nothing is uploaded.
function BrowserRecovery({ initialMint }: { initialMint?: string }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [mint, setMint] = useState(initialMint ?? "");
  const [info, setInfo] = useState<MintInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [mintKp, setMintKp] = useState<Keypair | null>(null);
  const [affiliate, setAffiliate] = useState<PublicKey | null>(null);
  const [claim, setClaim] = useState<{ lamports: number; sig: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) resolveAffiliate(ref).then(setAffiliate);
  }, []);

  // Seed + auto-look-up when the standard flow hands us a renounced mint.
  useEffect(() => {
    if (initialMint && initialMint !== mint) { setMint(initialMint); lookup(initialMint); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMint]);

  const feeBps = info ? totalFeeBps(affiliate) : 2500;
  const fee = info ? Math.floor((info.excessLamports * feeBps) / 10000) : 0;
  const net = info ? info.excessLamports - fee : 0;

  async function lookup(addr: string = mint) {
    setErr(""); setInfo(null); setStatus(""); setMintKp(null);
    let pk: PublicKey;
    try { pk = new PublicKey(addr.trim()); } catch { setErr("Invalid mint address"); return; }
    setLoading(true);
    try { setInfo(await readMint(pk)); } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function onKeyFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(String(r.result))));
        if (mint.trim() && kp.publicKey.toBase58() !== mint.trim())
          throw new Error("This keypair does not match the mint address");
        setMintKp(kp); setErr("");
      } catch (er: any) { setErr(er.message || "Invalid keypair file"); }
    };
    r.readAsText(f);
  }

  async function recover() {
    if (!info || !publicKey || !mintKp) return;
    setErr(""); setStatus("Building transaction…");
    try {
      const mintPk = new PublicKey(mint.trim());
      const plan = await buildRecoveryPlan({
        connection, programId: info.programId, mint: mintPk,
        destination: publicKey, authority: mintPk, // renounced: the mint itself signs
        feeRecipients: feeRecipientsFor(affiliate),
      });
      const tx = new Transaction().add(...plan.instructions);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      setStatus("Awaiting signature…");
      const signature = await sendTransaction(tx, connection, { signers: [mintKp] });
      setStatus("Confirming…");
      try {
        await connection.confirmTransaction(signature, "confirmed");
      } catch (confirmErr) {
        const st = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        const ok = st.value && !st.value.err &&
          (st.value.confirmationStatus === "confirmed" || st.value.confirmationStatus === "finalized");
        if (!ok) throw confirmErr;
      }
      setStatus("");
      const affiliateLamports = plan.breakdown.find((b) => b.label === "affiliate")?.lamports ?? 0;
      await recordClaim({ wallet: publicKey.toBase58(), mint: mintPk.toBase58(),
        recoveredLamports: plan.netToDevLamports, sig: signature, at: Date.now(),
        affiliateCode: null, affiliateLamports });
      setClaim({ lamports: plan.netToDevLamports, sig: signature });
    } catch (e: any) { setErr(e.message || "Recovery failed"); setStatus(""); }
  }

  return (
    <div className="rounded-xl bg-panel hairline p-5">
      <div className="flex gap-3 flex-wrap">
        <input value={mint} onChange={(e) => setMint(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="paste the renounced mint address…"
          className="flex-1 min-w-[240px] font-mono text-sm bg-panel2 hairline rounded-xl px-4 py-3 outline-none focus:border-sol/50 transition" />
        <button onClick={() => lookup()} disabled={loading}
          className="font-display font-semibold text-white bg-sol-gradient rounded-xl px-6 py-3 disabled:opacity-60">
          {loading ? "Looking up…" : "Check mint"}
        </button>
      </div>

      {err && <div className="mt-3 font-mono text-sm text-red-600">{err}</div>}

      {info && (
        <div className="mt-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Excess SOL</div>
              <div className="font-display font-bold text-2xl text-sol mt-1">{fmtSol(info.excessLamports, 4)}</div>
              <div className="font-mono text-xs text-muted mt-1">≈ {fmtUsd(info.excessLamports)}</div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">You receive ({100 - feeBps / 100}%)</div>
              <div className="font-display font-bold text-2xl mt-1">{fmtSol(net, 4)}</div>
              <div className="font-mono text-xs text-muted mt-1">fee {feeBps / 100}% = {fmtSol(fee, 4)} SOL</div>
            </div>
          </div>

          <div className="mt-5">
            <button onClick={() => fileRef.current?.click()}
              className="font-mono text-xs border border-line2 rounded-lg px-4 py-2.5 hover:border-sol/50 transition">
              {mintKp ? "✓ mint keypair loaded (local only)" : "Upload original mint keypair (.json)"}
            </button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={onKeyFile} />
            <div className="font-mono text-[11px] text-faint mt-2">Your key is read in the browser and never uploaded.</div>
          </div>

          <div className="mt-5">
            {!publicKey ? (
              <div>
                <div className="font-mono text-xs text-muted mb-2">Connect a wallet to receive the SOL and pay the network fee:</div>
                <WalletMultiButton />
              </div>
            ) : info.excessLamports <= 0 ? (
              <div className="font-mono text-sm text-muted">Nothing to recover. This mint holds only its rent minimum.</div>
            ) : (
              <button onClick={recover} disabled={!!status || !mintKp}
                className="w-full font-display font-semibold text-white bg-sol-gradient rounded-xl py-3.5 text-lg disabled:opacity-50">
                {status || (mintKp ? `Recover ◎ ${fmtSol(net, 4)}` : "Upload the mint keypair to continue")}
              </button>
            )}
          </div>
        </div>
      )}

      {claim && (
        <ClaimSuccessModal lamports={claim.lamports} sig={claim.sig} onClose={() => setClaim(null)} />
      )}
    </div>
  );
}

// ── Open-source CLI: keys never touch a webpage. Point developers at the repo.
function CliRecovery() {
  const [copied, setCopied] = useState(false);
  const cmd = useMemo(() => [
    "git clone https://github.com/gbeni-wealth/unbricksol.git",
    "cd unbricksol/cli && npm install",
    "# read-only check (no keys):",
    "node recover.mjs check --mint <MINT> --rpc <RPC_URL>",
    "# recover locally (simulates unless --execute):",
    "node recover.mjs recover --mint <MINT> \\",
    "  --mint-keypair mint.json --destination <YOUR_WALLET> \\",
    "  --rpc <RPC_URL> --execute",
  ].join("\n"), []);

  function copy() {
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl bg-panel hairline p-5">
      <div className="text-sm text-muted leading-relaxed max-w-2xl">
        The recovery CLI is a single, auditable file. Your keypair is read on your own machine,
        the transaction is built and signed locally, and it only simulates until you pass
        <span className="font-mono text-ink"> --execute</span>. The same 25% fee applies (20% with an affiliate).
      </div>

      <div className="mt-4 relative">
        <pre className="font-mono text-[12px] leading-relaxed bg-panel2 hairline rounded-xl p-4 overflow-x-auto text-ink whitespace-pre">{cmd}</pre>
        <button onClick={copy}
          className="absolute top-3 right-3 font-mono text-[11px] border border-line2 rounded-md px-2 py-1 bg-panel hover:border-sol/50 transition">
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>

      <a href={CLI_URL} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-4 font-display font-semibold text-white bg-sol-gradient rounded-xl px-6 py-3">
        View source &amp; download ↗
      </a>
    </div>
  );
}
