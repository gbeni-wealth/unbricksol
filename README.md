# UnbrickSOL

The simplest, safest way to recover excess SOL locked in Solana token mint accounts —
the lamports a mint holds above its rent-exempt minimum — using SIMD-0266
`withdraw_excess_lamports`. Non-custodial: every recovery is signed by your own wallet or
your own mint keypair. Live at **[unbricksol.com](https://unbricksol.com)**.

## Two recovery paths

- **Standard (most people).** Connect your wallet and recover the mints it controls.
  No keypair files, no uploads — you just sign.
- **Advanced (developers).** For a mint whose authority has been renounced, recovery
  needs the original mint keypair. You choose the trust model:
  - **Browser recovery** — your keypair is read locally in the browser and never uploaded.
  - **[Open-source CLI](./cli)** — build and sign the transaction on your own machine so
    a key never touches a webpage.

## Tech

Vite + React 18 + TypeScript + Tailwind. Client-rendered SPA over per-route static HTML
that's prerendered at build time (headless Chromium) so search engines and LLMs get real
content. Solana via `@solana/web3.js` + wallet-adapter; leaderboard/affiliates via Supabase.

## Develop

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # http://localhost:4600
```

## Build & deploy

```bash
npm run build          # tsc + vite build + prerender (writes dist/ with static HTML)
```

Production deploys from this repo via Vercel's Git integration. The prerender step needs
headless Chromium: locally it uses Playwright's Chromium, and on Vercel it uses
`@sparticuz/chromium` (see [`scripts/prerender.mjs`](./scripts/prerender.mjs)). Environment
variables (`VITE_*`) are configured in the Vercel project, not committed.

## Fees

Recovery charges 25% of the recovered excess, or 20% when an affiliate code is used
(10% platform / 10% affiliate). The same policy applies in the CLI.
