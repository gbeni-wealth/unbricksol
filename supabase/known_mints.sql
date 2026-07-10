-- Indexed set of known bricked mints, keyed by mint authority. Powers the
-- "connect a wallet -> discover all your recoverable mints" scan, because no free
-- RPC allows getProgramAccounts on the Token program (reverse lookup by authority).
--
-- Discovery is served from this table; current excess is always re-read on-chain,
-- so amounts stay real-time even if this index is a little stale.
--
-- Run once in Supabase -> SQL Editor, then import known_mints.csv via
-- Table Editor -> known_mints -> Import data from CSV.

create table if not exists public.known_mints (
  mint       text primary key,
  authority  text not null,
  symbol     text,
  program    text
);

create index if not exists known_mints_authority_idx
  on public.known_mints (authority);

alter table public.known_mints enable row level security;

-- Public read only. The set is admin-loaded; visitors never write to it.
drop policy if exists known_mints_read on public.known_mints;
create policy known_mints_read on public.known_mints for select using (true);
