# UnbrickSOL recovery CLI

Recover excess SOL from a Solana token mint **entirely on your own machine** — no
website, no key upload. This is the trust-minimized alternative to the browser flow at
[unbricksol.com](https://unbricksol.com): your keypair is read locally, the transaction
is built and signed locally, and the tool only **simulates** until you pass `--execute`.

It performs the same recovery the website does — SIMD-0266 `withdraw_excess_lamports`
(instruction discriminator `38`) — and applies the same fee: **25%**, or **20%** if you
pass `--affiliate`. It's one auditable file ([`recover.mjs`](./recover.mjs)) with a
single dependency (`@solana/web3.js`). Read it before you run it.

## Install

```bash
git clone https://github.com/gbeni-wealth/unbricksol.git
cd unbricksol/cli
npm install
```

You'll need Node 18+ and an RPC endpoint (`--rpc <url>`, or set `RPC` / `MAINNET_RPC`).

## Check what's recoverable (read-only, no keys)

```bash
node recover.mjs check --mint <MINT> --rpc <RPC_URL>
```

Prints the mint's program, whether its authority is active or renounced, the
rent-exempt minimum that stays locked, the recoverable excess, and the fee split.

## Recover

**Active-authority mint** — the authority wallet signs, pays the network fee, and
receives the SOL:

```bash
node recover.mjs recover --mint <MINT> --rpc <RPC_URL> \
  --authority-keypair auth.json --execute
```

**Renounced mint** — the mint's own keypair signs the withdraw; a separate funded
wallet pays the fee and receives the SOL:

```bash
node recover.mjs recover --mint <MINT> --rpc <RPC_URL> \
  --mint-keypair mint.json --destination-keypair wallet.json --execute
```

Omit `--execute` to simulate first (recommended). Add `--destination <pubkey>` to send
the net SOL somewhere other than the fee payer. Add `--affiliate <payout-pubkey>` for
the 20% (10% platform / 10% affiliate) split.

## Safety

- Your keypair files never leave your machine and are never sent anywhere.
- Without `--execute` the tool simulates and sends nothing.
- Verify the fee wallet and amounts printed before you approve. The recovery is a single
  transaction: withdraw the excess, then transfer the fee.
