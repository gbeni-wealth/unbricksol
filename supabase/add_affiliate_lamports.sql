-- Adds the affiliate's earned fee (in lamports) to each claim, so an affiliate can
-- see their earnings history on the affiliate page.
-- Run once: Supabase Dashboard -> SQL Editor -> paste -> Run.

alter table public.claims
  add column if not exists affiliate_lamports bigint not null default 0;

create index if not exists claims_affiliate_code_idx
  on public.claims (affiliate_code);
