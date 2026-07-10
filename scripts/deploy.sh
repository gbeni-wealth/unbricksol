#!/usr/bin/env bash
# Production deploy for UnbrickSOL.
#
# Why this exists (do NOT just run `vercel --prod`):
#  1. Prerendering needs a real headless Chromium, which Vercel's build container
#     can't launch (missing system libs). So we build LOCALLY and deploy the output
#     with `--prebuilt` instead of letting Vercel rebuild.
#  2. A local `vercel build` injects the *pulled* Vercel env, but our env vars are
#     marked "Sensitive" and therefore pull back EMPTY — which silently strips the
#     Helius RPC key, Supabase URL/anon key, etc. from the bundle. So we overwrite the
#     pulled env file with the real values from local `.env` before building.
#
# Requires a populated local `.env` (VITE_RPC, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
# VITE_PLATFORM_WALLET). `.env` is the source of truth for production secrets here.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env not found — production secrets live there. Aborting." >&2
  exit 1
fi

echo "▶ Pulling Vercel project settings…"
vercel pull --yes --environment production

echo "▶ Overriding pulled (empty, Sensitive) env with real values from .env…"
cp .env .vercel/.env.production.local

echo "▶ Building locally (vite + prerender)…"
vercel build --prod

echo "▶ Deploying prebuilt output to production…"
vercel deploy --prebuilt --prod

echo "✅ Deployed. Verify: curl -s https://www.unbricksol.com/ | grep '<title>'"
