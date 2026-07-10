import { Connection, TransactionSignature } from "@solana/web3.js";

/**
 * Confirm a transaction and throw unless it actually landed *successfully*.
 *
 * `connection.confirmTransaction` resolves as soon as the signature reaches the
 * requested commitment — including for a transaction that landed but REVERTED
 * on-chain (its result carries a non-null `err`). Recording such a tx as a
 * successful recovery is how failed attempts ended up on the leaderboard. So we
 * must inspect the returned `err`, not just the fact that it resolved.
 *
 * A slow RPC can also time out `confirmTransaction` even when the tx lands, so
 * on failure we fall back to a signature-status lookup to tell "reverted" and
 * "genuinely not landed" apart.
 *
 * Returns normally only when the tx is confirmed/finalized with no error.
 */
export async function confirmOrThrow(
  connection: Connection,
  signature: TransactionSignature,
): Promise<void> {
  let confirmErr: unknown = null;
  try {
    const res = await connection.confirmTransaction(signature, "confirmed");
    if (res.value?.err) {
      throw new Error(`Transaction reverted on-chain: ${JSON.stringify(res.value.err)}`);
    }
    return; // confirmed with no error — the only success path
  } catch (e) {
    confirmErr = e;
  }

  // We got here because confirmTransaction either timed out or reported an
  // on-chain error. Resolve which by checking the signature status directly.
  const st = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
  const v = st.value;
  if (v?.err) {
    throw new Error(`Transaction reverted on-chain: ${JSON.stringify(v.err)}`);
  }
  const landed =
    v && (v.confirmationStatus === "confirmed" || v.confirmationStatus === "finalized");
  if (!landed) throw confirmErr; // genuinely not landed / RPC couldn't confirm
  // landed cleanly with no error — success
}
