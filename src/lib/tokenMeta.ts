import { PublicKey } from "@solana/web3.js";
import { connection } from "./solana";

// Metaplex Token Metadata program (mainnet). Nearly every SPL token — classic
// and Token-2022 — has a metadata PDA here at [b"metadata", program, mint].
// Returns null when a mint has no Metaplex metadata (rare, but valid on-chain).
const MPL_METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export interface TokenMeta { name: string; symbol: string; }

export async function readTokenMeta(mint: PublicKey): Promise<TokenMeta | null> {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), MPL_METADATA_PROGRAM.toBuffer(), mint.toBuffer()],
    MPL_METADATA_PROGRAM,
  );
  const info = await connection.getAccountInfo(pda);
  if (!info || info.data.length < 66) return null;
  const data = info.data;

  // Metaplex v1 layout: key(1) + updateAuthority(32) + mint(32) then Borsh
  // strings: u32 length + bytes. Metaplex reserves fixed max widths (name 32,
  // symbol 10, uri 200) padded with \0 in-place, so trim trailing nulls.
  let off = 65;
  const readStr = (): string => {
    if (off + 4 > data.length) return "";
    const len = data.readUInt32LE(off); off += 4;
    if (len === 0 || len > 512 || off + len > data.length) return "";
    const s = data.subarray(off, off + len).toString("utf8").replace(/\0+$/, "").trim();
    off += len;
    return s;
  };
  const name = readStr();
  const symbol = readStr();
  if (!name && !symbol) return null;
  return { name, symbol };
}
