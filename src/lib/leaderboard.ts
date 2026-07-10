import { supabase } from "./supabase";

export type Cluster = "mainnet-beta" | "devnet";

export interface Claim {
  wallet: string; mint: string; recoveredLamports: number;
  sig: string; at: number; affiliateCode?: string | null; cluster?: Cluster;
  affiliateLamports?: number;
}
export interface AffiliateEarning {
  mint: string; recoveredLamports: number; affiliateLamports: number;
  sig: string; at: number; cluster: Cluster;
}
export interface LeaderRow {
  wallet: string; lamports: number; claims: number; sig: string; cluster: Cluster;
}

const LS = "sol_recovery_claims";

// Real claims land on whatever network the app's RPC points at (mainnet in prod).
const APP_CLUSTER: Cluster =
  ((import.meta as any).env?.VITE_RPC || "").includes("devnet") ? "devnet" : "mainnet-beta";

function getLocal(): Claim[] {
  return JSON.parse(localStorage.getItem(LS) || "[]");
}

/**
 * Record a successful recovery.
 *
 * The global row is written by the `record-claim` Edge Function, which re-verifies
 * the transaction on-chain and inserts with the service role. The public anon key
 * can no longer insert into `claims` directly (RLS), so a fabricated row is
 * impossible — and the amount/affiliate payout are derived from the tx server-side,
 * not trusted from here (so `recoveredLamports`/`affiliateLamports` below only feed
 * the local cache). A recording failure must never break the recovery UX (the
 * on-chain recovery already succeeded), so errors are swallowed.
 */
export async function recordClaim(c: Claim) {
  const cluster = c.cluster ?? APP_CLUSTER;
  const all = getLocal();
  all.push({ ...c, cluster });
  localStorage.setItem(LS, JSON.stringify(all));

  if (!supabase) return;
  try {
    const { error } = await supabase.functions.invoke("record-claim", {
      body: {
        sig: c.sig, wallet: c.wallet, mint: c.mint,
        affiliateCode: c.affiliateCode ?? null, cluster,
      },
    });
    if (error) console.warn("record-claim rejected (recovery still succeeded):", error);
  } catch (e) {
    console.warn("record-claim failed (recovery still succeeded):", e);
  }
}

/** Every recovery that paid a fee to this affiliate code (their earnings history). */
export async function affiliateEarnings(code: string): Promise<AffiliateEarning[]> {
  if (!supabase || !code) return [];
  const { data, error } = await supabase
    .from("claims")
    .select("mint,recovered_lamports,affiliate_lamports,sig,created_at,cluster")
    .eq("affiliate_code", code)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return data.map((r) => ({
    mint: r.mint,
    recoveredLamports: Number(r.recovered_lamports),
    affiliateLamports: Number(r.affiliate_lamports ?? 0),
    sig: r.sig,
    at: Date.parse(r.created_at),
    cluster: (r.cluster as Cluster) ?? "mainnet-beta",
  }));
}

function aggregate(claims: Claim[]): LeaderRow[] {
  const by: Record<string, LeaderRow> = {};
  for (const c of claims) {
    const e = by[c.wallet] ||
      { wallet: c.wallet, lamports: 0, claims: 0, sig: c.sig, cluster: c.cluster ?? "mainnet-beta" };
    e.lamports += c.recoveredLamports; e.claims += 1;
    e.sig = c.sig; e.cluster = c.cluster ?? "mainnet-beta";
    by[c.wallet] = e;
  }
  return Object.values(by).sort((a, b) => b.lamports - a.lamports);
}

/** Global leaderboard from Supabase; falls back to localStorage when unconfigured. */
export async function leaderboard(): Promise<LeaderRow[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("claims")
      .select("wallet,recovered_lamports,sig,created_at,cluster")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!error && data) {
      return aggregate(data.map((r) => ({
        wallet: r.wallet, mint: "", recoveredLamports: Number(r.recovered_lamports),
        sig: r.sig, at: Date.parse(r.created_at), cluster: (r.cluster as Cluster) ?? "mainnet-beta",
      })));
    }
  }
  return aggregate(getLocal());
}

/** Explorer link that resolves on the correct network. */
export function txUrl(sig: string, cluster: Cluster): string {
  return cluster === "devnet"
    ? `https://solscan.io/tx/${sig}?cluster=devnet`
    : `https://solscan.io/tx/${sig}`;
}
