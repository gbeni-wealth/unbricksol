# Deploying UnbrickSOL to Vercel + unbricksol.com

The app is a static Vite build. Production build is verified (`npm run build` → `dist/`).
Deploy = push the build to Vercel, set 3 env vars, point the domain.

## Environment variables (set these in Vercel — they bake into the build)

Vite inlines `VITE_*` vars **at build time**, so Vercel must have them before it builds.
All three are safe to expose in the client (the Supabase key is the public `anon` key by design).

| Name | Value |
|------|-------|
| `VITE_PLATFORM_WALLET` | `28DioNVgK1QiahQY6T5nguVz1Eu22vHhqd6eEPW9nhYQ` |
| `VITE_SUPABASE_URL` | `https://fhffrqgijerfuzgvhpfr.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (the `anon` `public` key from Supabase → Project Settings → API) |

## Option A — Vercel CLI (fastest, no GitHub needed)

From this `app/` directory:

```bash
npm i -g vercel
vercel login
vercel link                      # create/link the project
# add the 3 env vars to Production:
vercel env add VITE_PLATFORM_WALLET production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod                    # build + deploy
```

## Option B — GitHub + Vercel dashboard (gives auto-deploy on push)

1. Push this repo to GitHub.
2. Vercel → **Add New Project** → import the repo.
3. **Root Directory** = `app` (the app lives in a subfolder).
4. Framework = **Vite** (auto-detected). Build `npm run build`, output `dist` (from `vercel.json`).
5. Add the 3 env vars above (Production).
6. Deploy.

## Point unbricksol.com at Vercel

In the Vercel project → **Settings → Domains** → add `unbricksol.com` (and `www.unbricksol.com`).
Vercel shows the exact records; at your domain registrar set:

- **Apex** `unbricksol.com` → `A` record → `76.76.21.21`
- **www** `www.unbricksol.com` → `CNAME` → `cname.vercel-dns.com`

(Or switch the domain to Vercel's nameservers if the registrar supports it — Vercel will list them.)
DNS can take a few minutes to a few hours. Vercel auto-provisions HTTPS once it resolves.

## Post-deploy smoke test
- Load https://unbricksol.com — hero, logo, favicon, sections render.
- Paste a mint (e.g. BOME `ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82`) → live excess shows.
- Connect a real Phantom wallet → the Recover button appears.
- Leaderboard shows the seeded recovery (confirms Supabase env vars baked in).
