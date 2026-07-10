// record-claim — verify a recovery transaction ON-CHAIN before writing a
// leaderboard row.
//
// This is the ONLY path allowed to insert into `claims`: anonymous insert is
// revoked via RLS (see supabase/schema.sql), and this function writes with the
// service role. Every row is therefore provably backed by a real, successful
// transaction in which the platform fee wallet actually received SOL and the
// claimed wallet was the fee payer. Fabricating a row is economically
// impossible — it would require genuinely paying the platform fee on-chain.
//
// The client sends only { sig, wallet, mint, affiliateCode, cluster }. The
// recovered amount and affiliate payout are DERIVED from the transaction's
// pre/post balances here — never trusted from the client.
//
// Deploy:  supabase functions deploy record-claim
// Secrets: supabase secrets set RPC_URL=<server-side RPC> \
//                               PLATFORM_WALLET=<fee wallet>
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const RPC_URL = Deno.env.get("RPC_URL")!;
const PLATFORM_WALLET =
  Deno.env.get("PLATFORM_WALLET") ?? "28DioNVgK1QiahQY6T5nguVz1Eu22vHhqd6eEPW9nhYQ";

async function rpc(method: string, params: unknown[]): Promise<any> {
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`RPC ${method}: ${JSON.stringify(j.error)}`);
  return j.result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let input: any;
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const sig = String(input.sig ?? "").trim();
  const wallet = String(input.wallet ?? "").trim();
  const mint = String(input.mint ?? "").trim();
  const affiliateCode = input.affiliateCode
    ? String(input.affiliateCode).trim().toUpperCase()
    : null;
  const cluster = input.cluster === "devnet" ? "devnet" : "mainnet-beta";
  if (!sig || !wallet) return json({ error: "sig and wallet are required" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotent: already-recorded sig succeeds without re-verifying.
  {
    const { data } = await admin.from("claims").select("id").eq("sig", sig).maybeSingle();
    if (data) return json({ ok: true, status: "already-recorded" });
  }

  // 1. Fetch the tx; require it landed AND succeeded.
  let tx: any;
  try {
    tx = await rpc("getTransaction", [
      sig,
      { maxSupportedTransactionVersion: 0, encoding: "json" },
    ]);
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
  if (!tx) return json({ error: "transaction not found" }, 422);
  if (tx.meta?.err) {
    return json({ error: "transaction failed on-chain", detail: tx.meta.err }, 422);
  }

  // 2. Full account list aligned with pre/postBalances (static + any v0 loaded).
  const msg = tx.transaction.message;
  const keys: string[] = [
    ...(msg.accountKeys ?? []),
    ...(tx.meta?.loadedAddresses?.writable ?? []),
    ...(tx.meta?.loadedAddresses?.readonly ?? []),
  ];
  const pre: number[] = tx.meta.preBalances;
  const post: number[] = tx.meta.postBalances;

  // 3. The claimed wallet must be the fee payer (index 0). Every recovery flow
  //    sets feePayer = the recovering/destination wallet, so this binds the row
  //    to the actual beneficiary and blocks claiming someone else's recovery.
  if (keys[0] !== wallet) {
    return json({ error: "wallet is not the transaction fee payer" }, 422);
  }

  // 4. Anti-forgery core: the platform wallet must have RECEIVED a fee here.
  const platIdx = keys.indexOf(PLATFORM_WALLET);
  if (platIdx < 0) return json({ error: "transaction did not pay the platform fee" }, 422);
  if (post[platIdx] - pre[platIdx] <= 0) {
    return json({ error: "no platform fee received" }, 422);
  }

  // 5. Recovered amount = the fee payer's net on-chain gain (already net of fees).
  const recovered = post[0] - pre[0];
  if (recovered <= 0) return json({ error: "wallet did not gain SOL" }, 422);

  // 6. Affiliate payout (optional) — derived from chain, resolved server-side.
  let affiliateLamports = 0;
  let storedAffiliateCode: string | null = null;
  if (affiliateCode) {
    const { data: aff } = await admin
      .from("affiliates")
      .select("wallet")
      .eq("code", affiliateCode)
      .maybeSingle();
    if (aff?.wallet) {
      const affIdx = keys.indexOf(aff.wallet);
      if (affIdx >= 0 && post[affIdx] - pre[affIdx] > 0) {
        affiliateLamports = post[affIdx] - pre[affIdx];
        storedAffiliateCode = affiliateCode;
      }
    }
  }

  // 7. Insert with the service role (bypasses RLS). Unique(sig) guards races.
  const { error } = await admin.from("claims").insert({
    wallet,
    mint,
    recovered_lamports: recovered,
    sig,
    affiliate_code: storedAffiliateCode,
    cluster,
    affiliate_lamports: affiliateLamports,
  });
  if (error) {
    if ((error as any).code === "23505") return json({ ok: true, status: "already-recorded" });
    return json({ error: error.message }, 500);
  }

  return json({
    ok: true,
    status: "recorded",
    recovered_lamports: recovered,
    affiliate_lamports: affiliateLamports,
  });
});
