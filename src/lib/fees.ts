import { PublicKey } from "@solana/web3.js";
import type { FeeRecipient } from "./recovery";
import { supabase } from "./supabase";

export const BASE_FEE_BPS = 2500;           // 25% no code
export const AFFILIATE_PLATFORM_BPS = 1000; // 10% platform when code used
export const AFFILIATE_SHARE_BPS = 1000;    // 10% affiliate

/** Platform fee wallet, overridable via VITE_PLATFORM_WALLET. */
export const PLATFORM_WALLET =
  (import.meta as any).env?.VITE_PLATFORM_WALLET ||
  "28DioNVgK1QiahQY6T5nguVz1Eu22vHhqd6eEPW9nhYQ"; // platform fee wallet

// Always-available demo code; real codes live in Supabase (+ a localStorage cache).
const SEED_AFFILIATES: Record<string, string> = {
  DEMO10: "3FwcGkKfkB1Ejmz1iQ5tbeNDXgBKeLX2XSEAGcbBas7c",
};

export interface Affiliate { code: string; wallet: string; createdAt: number; }

const LS_KEY = "sol_recovery_affiliates";

function localStore(): Record<string, Affiliate> {
  return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
}
function cacheLocal(a: Affiliate) {
  const s = localStore();
  s[a.code] = a;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function localAll(): Record<string, string> {
  const out: Record<string, string> = { ...SEED_AFFILIATES };
  for (const a of Object.values(localStore())) out[a.code] = a.wallet;
  return out;
}

function makeCode(wallet: string): string {
  return "REF" + wallet.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Register (or fetch) the affiliate code for a payout wallet. Global via Supabase. */
export async function registerAffiliate(wallet: string): Promise<Affiliate> {
  const code = makeCode(wallet);
  const aff: Affiliate = { code, wallet, createdAt: Date.now() };

  if (supabase) {
    // Reuse an existing row for this wallet if present.
    const found = await supabase
      .from("affiliates").select("code,wallet,created_at").eq("wallet", wallet).limit(1);
    const row = found.data?.[0];
    if (row) {
      const a = { code: row.code, wallet: row.wallet, createdAt: Date.parse(row.created_at) };
      cacheLocal(a);
      return a;
    }
    // First-writer-wins: a PK conflict just means the code already exists.
    await supabase.from("affiliates").insert({ code, wallet });
  }

  cacheLocal(aff);
  return aff;
}

/** Resolve a ?ref= code to its payout wallet. Checks seed/local cache, then Supabase. */
export async function resolveAffiliate(code?: string | null): Promise<PublicKey | null> {
  if (!code) return null;
  const c = code.trim().toUpperCase();

  let wallet: string | undefined = localAll()[c];
  if (!wallet && supabase) {
    const { data } = await supabase.from("affiliates").select("wallet").eq("code", c).limit(1);
    wallet = data?.[0]?.wallet;
  }
  try { return wallet ? new PublicKey(wallet) : null; } catch { return null; }
}

export function feeRecipientsFor(affiliate: PublicKey | null): FeeRecipient[] {
  const platform = new PublicKey(PLATFORM_WALLET);
  if (affiliate) {
    return [
      { wallet: platform, bps: AFFILIATE_PLATFORM_BPS, label: "platform" },
      { wallet: affiliate, bps: AFFILIATE_SHARE_BPS, label: "affiliate" },
    ];
  }
  return [{ wallet: platform, bps: BASE_FEE_BPS, label: "platform" }];
}

export function totalFeeBps(affiliate: PublicKey | null): number {
  return affiliate ? AFFILIATE_PLATFORM_BPS + AFFILIATE_SHARE_BPS : BASE_FEE_BPS;
}
