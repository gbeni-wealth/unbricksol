-- One-time: add the cluster column, remove the placeholder test rows, and seed
-- the leaderboard with the REAL verifiable devnet recovery (1.008 SOL).
-- Run in Supabase → SQL Editor.

alter table public.claims add column if not exists cluster text not null default 'mainnet-beta';

delete from public.claims     where sig  = 'TESTSIG_devnet_1';
delete from public.affiliates where code = 'REFTEST';

insert into public.claims (wallet, mint, recovered_lamports, sig, cluster)
values (
  'G6dYcCrmiwzEUMCW5mrjVLRZVXw8ixoAhCahJg8rTpSA',
  'EXLngnQeFNE7N2NzRcCRHVD3rz8QxgoGiofBF8FfisYM',
  1008000000,
  '2wrWMjdyd6K5KWQ1LYHwFEhtJEMZ7n6LEVGxDJqMTF6GWdFMxLUednEnkWfSsFGHjxGyHmU8GnC4rUbz7v9AUUhd',
  'devnet'
)
on conflict (sig) do nothing;
