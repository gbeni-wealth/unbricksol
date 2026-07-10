#!/usr/bin/env node
/**
 * UnbrickSOL recovery CLI — recover excess SOL from a Solana token mint, entirely on
 * your own machine. One auditable file, no build step.
 *
 * Your keypair is read locally, the transaction is built and signed locally, and it
 * only SIMULATES until you pass --execute. Nothing is ever uploaded.
 *
 * This is the same recovery the website performs (SIMD-0266 `withdraw_excess_lamports`,
 * discriminator 38) and it applies the same fee: 25%, or 20% if you pass --affiliate.
 * It is open source — read it, and if you disagree with the fee you are free to fork it.
 *
 *   check    read-only: show a mint's recoverable SOL + the fee split (no keys needed)
 *   recover  build + sign locally; simulates unless --execute
 *
 * Examples:
 *   node recover.mjs check   --mint <MINT> --rpc <RPC_URL>
 *
 *   # active-authority mint (the authority wallet signs + receives):
 *   node recover.mjs recover --mint <MINT> --rpc <RPC_URL> \
 *     --authority-keypair auth.json --execute
 *
 *   # renounced mint (the mint keypair signs; a funded wallet pays + receives):
 *   node recover.mjs recover --mint <MINT> --rpc <RPC_URL> \
 *     --mint-keypair mint.json --destination-keypair wallet.json --execute
 */
import * as fs from "node:fs";
import { parseArgs } from "node:util";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction, LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR = 38;

// Fee policy — identical to the website.
const PLATFORM_WALLET = new PublicKey("28DioNVgK1QiahQY6T5nguVz1Eu22vHhqd6eEPW9nhYQ");
const BASE_FEE_BPS = 2500;           // 25% with no affiliate
const AFFILIATE_PLATFORM_BPS = 1000; // 10% platform when an affiliate is passed
const AFFILIATE_SHARE_BPS = 1000;    // 10% affiliate
const USD_PER_SOL = 195;

const sol = (n) => (n / LAMPORTS_PER_SOL).toFixed(6);
const usd = (n) => "$" + Math.round((n / LAMPORTS_PER_SOL) * USD_PER_SOL).toLocaleString();
const die = (msg) => { console.error("error:", msg); process.exit(1); };

function loadKeypair(path) {
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
  } catch (e) { die(`could not read keypair ${path}: ${e.message}`); }
}

function feeRecipients(affiliate) {
  if (affiliate) return [
    { wallet: PLATFORM_WALLET, bps: AFFILIATE_PLATFORM_BPS, label: "platform" },
    { wallet: affiliate, bps: AFFILIATE_SHARE_BPS, label: "affiliate" },
  ];
  return [{ wallet: PLATFORM_WALLET, bps: BASE_FEE_BPS, label: "platform" }];
}

function withdrawExcessIx({ programId, source, destination, authority }) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR]),
  });
}

async function readMint(conn, mint) {
  const info = await conn.getAccountInfo(mint);
  if (!info) die(`mint ${mint.toBase58()} not found on-chain`);
  const isMint = info.owner.equals(TOKEN_PROGRAM) || info.owner.equals(TOKEN_2022_PROGRAM);
  if (!isMint) die("that address is not a token mint");
  const programId = info.owner.equals(TOKEN_2022_PROGRAM) ? TOKEN_2022_PROGRAM : TOKEN_PROGRAM;
  const rent = await conn.getMinimumBalanceForRentExemption(info.data.length);
  const excess = Math.max(info.lamports - rent, 0);
  // Mint layout: bytes 0..4 = mintAuthority COption tag (1 = Some), 4..36 = pubkey.
  const tag = info.data.readUInt32LE(0);
  const mintAuthority = tag === 1 ? new PublicKey(info.data.subarray(4, 36)) : null;
  return { programId, programLabel: programId.equals(TOKEN_2022_PROGRAM) ? "Token-2022" : "Token Program",
    rent, excess, mintAuthority };
}

function rpcFrom(v) {
  const u = v || process.env.RPC || process.env.MAINNET_RPC;
  if (!u) die("no RPC endpoint — pass --rpc <url> or set RPC / MAINNET_RPC");
  return u;
}

function printSplit(excess, affiliate) {
  let fee = 0;
  for (const r of feeRecipients(affiliate)) {
    const amt = Math.floor((excess * r.bps) / 10000);
    if (amt <= 0) continue;
    fee += amt;
    console.log(`  fee → ${r.label.padEnd(9)} ${sol(amt)} SOL  (${r.wallet.toBase58()})`);
  }
  console.log(`  you receive        ${sol(excess - fee)} SOL  (≈ ${usd(excess - fee)})`);
  return fee;
}

async function cmdCheck(opts) {
  const conn = new Connection(rpcFrom(opts.rpc), "confirmed");
  const mint = new PublicKey(opts.mint);
  const affiliate = opts.affiliate ? new PublicKey(opts.affiliate) : null;
  const m = await readMint(conn, mint);
  console.log(`\nMint      : ${mint.toBase58()}`);
  console.log(`Program   : ${m.programLabel}`);
  console.log(`Authority : ${m.mintAuthority ? m.mintAuthority.toBase58() : "renounced (needs --mint-keypair)"}`);
  console.log(`Rent-lock : ${sol(m.rent)} SOL (stays on the mint)`);
  console.log(`Excess    : ${sol(m.excess)} SOL  (≈ ${usd(m.excess)})`);
  if (m.excess <= 0) { console.log("\nNothing to recover — this mint holds only its rent minimum.\n"); return; }
  console.log("\nIf you recover:");
  printSplit(m.excess, affiliate);
  console.log();
}

async function cmdRecover(opts) {
  const conn = new Connection(rpcFrom(opts.rpc), "confirmed");
  const mint = new PublicKey(opts.mint);
  const affiliate = opts.affiliate ? new PublicKey(opts.affiliate) : null;
  const m = await readMint(conn, mint);
  if (m.excess <= 0) die("no excess lamports to recover (mint holds only its rent minimum)");

  // Work out who signs the withdraw (the authority) and who pays fees + receives the SOL
  // (the destination). The destination must sign because it funds the fee transfers.
  let authorityPubkey, destinationPubkey, feePayer, extraSigners = [];

  if (opts["mint-keypair"]) {
    // Renounced mint: the mint account itself is the authority, signed by its keypair.
    const mintKp = loadKeypair(opts["mint-keypair"]);
    if (!mintKp.publicKey.equals(mint)) die("--mint-keypair does not match --mint");
    if (!opts["destination-keypair"]) die("renounced recovery needs --destination-keypair (a funded wallet that pays fees and receives the SOL)");
    const destKp = loadKeypair(opts["destination-keypair"]);
    authorityPubkey = mint;
    destinationPubkey = destKp.publicKey;
    feePayer = destKp;
    extraSigners = [mintKp];
  } else if (opts["authority-keypair"]) {
    // Active-authority mint: the authority wallet signs, pays, and receives by default.
    const authKp = loadKeypair(opts["authority-keypair"]);
    if (!m.mintAuthority) die("this mint is renounced — use --mint-keypair instead of --authority-keypair");
    if (!authKp.publicKey.equals(m.mintAuthority)) die(`--authority-keypair is not the mint authority (${m.mintAuthority.toBase58()})`);
    authorityPubkey = authKp.publicKey;
    destinationPubkey = authKp.publicKey;
    feePayer = authKp;
  } else {
    die("pass --authority-keypair (active mint) or --mint-keypair + --destination-keypair (renounced mint)");
  }

  // Optional: send the net SOL to a different address than the fee payer.
  if (opts.destination) destinationPubkey = new PublicKey(opts.destination);

  const tx = new Transaction().add(
    withdrawExcessIx({ programId: m.programId, source: mint, destination: destinationPubkey, authority: authorityPubkey }),
  );
  for (const r of feeRecipients(affiliate)) {
    const amt = Math.floor((m.excess * r.bps) / 10000);
    if (amt <= 0) continue;
    tx.add(SystemProgram.transfer({ fromPubkey: destinationPubkey, toPubkey: r.wallet, lamports: amt }));
  }
  tx.feePayer = feePayer.publicKey;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;

  console.log(`\nMint        : ${mint.toBase58()}  (${m.programLabel})`);
  console.log(`Excess      : ${sol(m.excess)} SOL  (≈ ${usd(m.excess)})`);
  console.log(`Destination : ${destinationPubkey.toBase58()}`);
  console.log(`Fee payer   : ${feePayer.publicKey.toBase58()}`);
  printSplit(m.excess, affiliate);

  const signers = [feePayer, ...extraSigners].filter(
    (kp, i, a) => a.findIndex((k) => k.publicKey.equals(kp.publicKey)) === i);

  if (!opts.execute) {
    tx.sign(...signers);
    const sim = await conn.simulateTransaction(tx);
    if (sim.value.err) die(`simulation failed: ${JSON.stringify(sim.value.err)}\n${(sim.value.logs || []).join("\n")}`);
    console.log("\n✓ Simulation succeeded. Re-run with --execute to send it for real.\n");
    return;
  }

  console.log("\nSending…");
  const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
  console.log(`\n✅ Recovered.  https://solscan.io/tx/${sig}\n`);
}

async function main() {
  const cmd = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      mint: { type: "string" },
      rpc: { type: "string" },
      affiliate: { type: "string" },
      "authority-keypair": { type: "string" },
      "mint-keypair": { type: "string" },
      "destination-keypair": { type: "string" },
      destination: { type: "string" },
      execute: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (cmd === "check") {
    if (!values.mint) die("check needs --mint <MINT>");
    await cmdCheck(values);
  } else if (cmd === "recover") {
    if (!values.mint) die("recover needs --mint <MINT>");
    await cmdRecover(values);
  } else {
    console.log("usage: node recover.mjs <check|recover> --mint <MINT> --rpc <RPC_URL> [options]");
    console.log("see the header of this file for full examples.");
    process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => die(e.message || String(e)));
