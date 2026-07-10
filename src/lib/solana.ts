import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM, TOKEN_2022_PROGRAM } from "./recovery";
import { supabase } from "./supabase";

export const RPC_URL =
  (import.meta as any).env?.VITE_RPC || "https://solana-rpc.publicnode.com";

export const connection = new Connection(RPC_URL, "confirmed");

export const LAMPORTS = 1e9;
export const SOL_USD = 195;

export interface MintInfo {
  programId: PublicKey;
  programLabel: string;
  excessLamports: number;
  mintAuthority: PublicKey | null; // null = renounced
  isMint: boolean;
}

/** Read a mint: recoverable excess + whether authority is active or renounced. */
export async function readMint(mint: PublicKey): Promise<MintInfo> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error("Address not found on-chain");
  const owner = info.owner;
  const isMint = owner.equals(TOKEN_PROGRAM) || owner.equals(TOKEN_2022_PROGRAM);
  if (!isMint) throw new Error("This address is not a token mint");
  const programId = owner.equals(TOKEN_2022_PROGRAM) ? TOKEN_2022_PROGRAM : TOKEN_PROGRAM;
  const rent = await connection.getMinimumBalanceForRentExemption(info.data.length);
  const excessLamports = Math.max(info.lamports - rent, 0);

  // Mint layout: bytes 0..4 = mintAuthority COption (1 = Some), 4..36 = pubkey
  const data = info.data;
  const tag = data.readUInt32LE(0);
  const mintAuthority = tag === 1 ? new PublicKey(data.subarray(4, 36)) : null;

  return {
    programId,
    programLabel: programId.equals(TOKEN_2022_PROGRAM) ? "Token-2022" : "p-token",
    excessLamports,
    mintAuthority,
    isMint: true,
  };
}

export interface ScannedMint {
  mint: string;
  programId: PublicKey;
  programLabel: string;
  excessLamports: number;
}

// Below this we treat the excess as dust and don't bother listing it.
const DUST_LAMPORTS = 1000;

/**
 * Find the mints a wallet is the authority of, and how much excess SOL each holds.
 *
 * Discovery can't be done live on Solana's free RPCs - every provider blocks
 * getProgramAccounts on the Token program (too many accounts). So we look the wallet
 * up in our own indexed set of known bricked mints (Supabase `known_mints`, keyed by
 * authority), then live-verify each candidate on-chain: confirm it's still a mint this
 * wallet controls and read its *current* excess. Discovery is indexed; amounts are real-time.
 *
 * Renounced mints (authority = null) aren't returned - those need the mint-keypair path.
 */
export async function scanWallet(owner: PublicKey): Promise<ScannedMint[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("known_mints")
    .select("mint")
    .eq("authority", owner.toBase58())
    .limit(1000);
  if (error || !data || data.length === 0) return [];

  const rentByLen = new Map<number, number>();
  const rentFor = async (len: number) => {
    let r = rentByLen.get(len);
    if (r === undefined) { r = await connection.getMinimumBalanceForRentExemption(len); rentByLen.set(len, r); }
    return r;
  };

  const pubkeys = data.map((r) => new PublicKey(r.mint));
  const results: ScannedMint[] = [];

  // Live-verify in batches (getMultipleAccountsInfo caps at 100 per call).
  for (let i = 0; i < pubkeys.length; i += 100) {
    const chunk = pubkeys.slice(i, i + 100);
    let infos;
    try { infos = await connection.getMultipleAccountsInfo(chunk); }
    catch { continue; }
    for (let j = 0; j < infos.length; j++) {
      const info = infos[j];
      if (!info) continue;
      const is2022 = info.owner.equals(TOKEN_2022_PROGRAM);
      if (!is2022 && !info.owner.equals(TOKEN_PROGRAM)) continue;
      // Still a mint this wallet controls? (authority COption at bytes 0..4, pubkey 4..36)
      if (info.data.length < 36 || info.data.readUInt32LE(0) !== 1) continue;
      if (!new PublicKey(info.data.subarray(4, 36)).equals(owner)) continue;
      const excess = info.lamports - (await rentFor(info.data.length));
      if (excess > DUST_LAMPORTS) {
        const programId = is2022 ? TOKEN_2022_PROGRAM : TOKEN_PROGRAM;
        results.push({
          mint: chunk[j].toBase58(), programId,
          programLabel: is2022 ? "Token-2022" : "p-token",
          excessLamports: excess,
        });
      }
    }
  }
  return results.sort((a, b) => b.excessLamports - a.excessLamports);
}

export const fmtSol = (lamports: number, dp = 4) =>
  (lamports / LAMPORTS).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const fmtUsd = (lamports: number) =>
  "$" + Math.round((lamports / LAMPORTS) * SOL_USD).toLocaleString();
export const shorten = (s: string, n = 4) => s.slice(0, n) + "…" + s.slice(-n);
