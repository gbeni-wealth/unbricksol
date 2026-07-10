-- SOL Recovery — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
--
-- Design notes:
--  * The real 25% / 20% fee split is enforced ON-CHAIN in the recovery transaction,
--    not by this database. So a spammed row here never moves money — it only affects
--    the vanity leaderboard and the code→wallet lookup.
--  * `affiliates.code` is the primary key and there is NO update/delete policy, so an
--    existing code can never be re-pointed at a different wallet (first-writer-wins).

create table if not exists public.affiliates (
  code       text primary key,
  wallet     text not null,
  created_at timestamptz not null default now()
);
create index if not exists affiliates_wallet_idx on public.affiliates (wallet);

create table if not exists public.claims (
  id                 bigint generated always as identity primary key,
  wallet             text not null,                 -- who recovered (destination)
  mint               text not null,
  recovered_lamports bigint not null check (recovered_lamports >= 0),
  sig                text not null unique,           -- tx signature; dedupes double-records
  affiliate_code     text,
  cluster            text not null default 'mainnet-beta', -- 'mainnet-beta' | 'devnet' (for the explorer link)
  created_at         timestamptz not null default now()
);
create index if not exists claims_wallet_idx     on public.claims (wallet);
create index if not exists claims_created_at_idx on public.claims (created_at desc);

alter table public.affiliates enable row level security;
alter table public.claims     enable row level security;

-- affiliates: anyone may read (to resolve a ?ref= code) and insert (to register),
-- but NOT update or delete — so codes can't be hijacked.
drop policy if exists affiliates_read   on public.affiliates;
drop policy if exists affiliates_insert on public.affiliates;
create policy affiliates_read   on public.affiliates for select using (true);
create policy affiliates_insert on public.affiliates for insert with check (true);

-- claims: anyone may read (leaderboard) and insert (record a recovery).
drop policy if exists claims_read   on public.claims;
drop policy if exists claims_insert on public.claims;
create policy claims_read   on public.claims for select using (true);
create policy claims_insert on public.claims for insert with check (true);
