#!/usr/bin/env bash
# One-time setup: push the secrets the GitHub Actions deploy workflow needs.
#
#   • VITE_* build vars are read from your local .env (they're baked into the public
#     bundle anyway, so they're not sensitive — but we keep them out of the workflow file).
#   • VERCEL_TOKEN you paste when prompted; it is never written to disk here.
#
# Run from anywhere:  bash scripts/setup-ci-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

command -v gh >/dev/null || { echo "❌ Install the GitHub CLI (gh) and run 'gh auth login' first." >&2; exit 1; }
[ -f .env ] || { echo "❌ .env not found (needs the VITE_* values)." >&2; exit 1; }

# Load VITE_* from .env without leaking them to the terminal.
set -a; # shellcheck disable=SC1091
source .env
set +a

echo "▶ Pushing VITE_* secrets from .env…"
for v in VITE_RPC VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_PLATFORM_WALLET; do
  val="${!v:-}"
  if [ -z "$val" ]; then echo "  ⚠ $v is empty in .env — skipping"; continue; fi
  gh secret set "$v" --body "$val"
  echo "  ✓ $v"
done

echo
echo "▶ Create a Vercel token: https://vercel.com/account/tokens"
echo "  (Scope it to your 'templavi' team, or Full Account.)"
read -r -s -p "  Paste the Vercel token (input hidden): " VT; echo
[ -n "$VT" ] || { echo "❌ No token entered." >&2; exit 1; }
gh secret set VERCEL_TOKEN --body "$VT"
echo "  ✓ VERCEL_TOKEN"

echo
echo "✅ Secrets set. Trigger a deploy with:  git commit --allow-empty -m 'deploy' && git push"
echo "   or run the workflow from the GitHub Actions tab."
