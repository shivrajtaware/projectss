-- Run once in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  referral_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id bigint generated always as identity primary key,
  referral_code text not null,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(referrer_id, referred_user_id)
);

create table if not exists public.referral_rewards (
  id bigint generated always as identity primary key,
  attribution_id bigint not null references public.referral_attributions(id) on delete cascade,
  order_id text not null unique,
  order_amount numeric not null,
  reward_amount numeric not null,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.orders enable row level security;

create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users create own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users read own attributions" on public.referral_attributions for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);
create policy "users read own rewards" on public.referral_rewards for select using (exists (select 1 from public.referral_attributions a where a.id = attribution_id and a.referrer_id = auth.uid()));
create policy "users read own orders" on public.orders for select using (auth.uid() = buyer_id);

create or replace function public.new_referral_code() returns text language plpgsql as $$
declare candidate text;
begin
  loop
    candidate := 'PV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  return candidate;
end; $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, referral_code) values (new.id, new.email, public.new_referral_code());
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
