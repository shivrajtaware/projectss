create table if not exists public.purchase_requests (
  id bigint generated always as identity primary key,
  project_id text not null,
  project_name text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  status text not null default 'New' check (status in ('New','Contacted','Closed')),
  created_at timestamptz not null default now()
);
alter table public.purchase_requests enable row level security;
