import {
  Connection, PublicKey, SystemProgram, TransactionInstruction,
} from "@solana/web3.js";

export const WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR = 38;
export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export interface FeeRecipient { wallet: PublicKey; bps: number; label: string; }

export interface RecoveryPlan {
  instructions: TransactionInstruction[];
  excessLamports: number;
  feeLamports: number;
  netToDevLamports: number;
  breakdown: { label: string; wallet: string; lamports: number }[];
}

/**
 * Raw WithdrawExcessLamports instruction (p-token / Token-2022, discriminator 38).
 *   0. [writable] source (the mint)
 *   1. [writable] destination
 *   2. [signer]   authority = mint authority, or the mint itself if renounced
 */
export function createWithdrawExcessLamportsIx(p: {
  programId: PublicKey; source: PublicKey; destination: PublicKey; authority: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: p.programId,
    keys: [
      { pubkey: p.source, isSigner: false, isWritable: true },
      { pubkey: p.destination, isSigner: false, isWritable: true },
      { pubkey: p.authority, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR]),
  });
}

/** Build the atomic [withdraw -> fee split(s)] instruction list. */
export async function buildRecoveryPlan(p: {
  connection: Connection; programId: PublicKey; mint: PublicKey;
  destination: PublicKey; authority: PublicKey; feeRecipients: FeeRecipient[];
}): Promise<RecoveryPlan> {
  const info = await p.connection.getAccountInfo(p.mint);
  if (!info) throw new Error("mint not found");
  const rent = await p.connection.getMinimumBalanceForRentExemption(info.data.length);
  const excessLamports = info.lamports - rent;
  if (excessLamports <= 0) throw new Error("no excess lamports to recover");

  const instructions: TransactionInstruction[] = [
    createWithdrawExcessLamportsIx({
      programId: p.programId, source: p.mint, destination: p.destination, authority: p.authority,
    }),
  ];
  const breakdown: RecoveryPlan["breakdown"] = [];
  let feeLamports = 0;
  for (const r of p.feeRecipients) {
    const amt = Math.floor((excessLamports * r.bps) / 10000);
    if (amt <= 0) continue;
    instructions.push(SystemProgram.transfer({
      fromPubkey: p.destination, toPubkey: r.wallet, lamports: amt,
    }));
    feeLamports += amt;
    breakdown.push({ label: r.label, wallet: r.wallet.toBase58(), lamports: amt });
  }
  return {
    instructions, excessLamports, feeLamports,
    netToDevLamports: excessLamports - feeLamports, breakdown,
  };
}
