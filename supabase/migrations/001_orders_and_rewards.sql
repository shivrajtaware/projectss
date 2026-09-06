-- Run this after the initial schema.sql migration.
create table if not exists public.orders (
  order_id text primary key,
  buyer_id uuid references public.profiles(id) on delete set null,
  project_name text not null,
  order_amount numeric not null,
  referral_attribution_id bigint references public.referral_attributions(id) on delete set null,
  status text not null default 'created' check (status in ('created','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.orders enable row level security;

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders for select using (auth.uid() = buyer_id);
