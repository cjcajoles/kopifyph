-- ============================================================================
-- Kopify PH — Supabase schema
-- ============================================================================
-- Run this once in Supabase's SQL Editor (Project → SQL Editor → New query →
-- paste this whole file → Run). Safe to re-run: every statement is guarded.
--
-- What this creates:
--   - profiles      (extends auth.users — tells us if someone is an admin or
--                     an affiliate, and which affiliate code they own)
--   - products      (the 3 packs)
--   - customers     (one row per unique buyer email)
--   - orders        (every checkout — real ones will land here once the
--                     checkout page is wired up)
--   - distributors  (submissions from the "Become a Distributor" form)
--   - vouchers      (promo codes)
--   - affiliates    (public roster info — profiles.affiliate_code links a
--                     login to a row here)
--   - refunds       (refund/cancellation requests, linked to orders)
--
-- Row Level Security (RLS) is turned on for every table. Without it, the
-- publishable ("anon") key you're using in the browser would let anyone read
-- or edit everything. With it: the public storefront can only do the narrow
-- things it needs (create an order, submit a distributor application),
-- and only signed-in admins/affiliates can read the rest.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles — one row per login (admin or affiliate), keyed to Supabase Auth
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'affiliate')),
  full_name text,
  affiliate_code text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_affiliate_code()
returns text
language sql security definer stable
set search_path = public
as $$
  select affiliate_code from public.profiles where id = auth.uid() and role = 'affiliate';
$$;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  price integer not null,
  stock integer not null default 0,
  units_sold integer not null default 0,
  status text not null default 'Published' check (status in ('Published', 'Draft')),
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "Checkout can create/find a customer" on public.customers;
create policy "Checkout can create/find a customer" on public.customers
  for insert to anon, authenticated with check (true);

drop policy if exists "Admins view customers" on public.customers;
create policy "Admins view customers" on public.customers
  for select to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_mobile text,
  pack text not null check (pack in ('1 Box', '3 Boxes', '10 Boxes')),
  boxes integer not null,
  total integer not null,
  status text not null default 'Pending' check (status in ('Pending', 'Paid', 'Shipped', 'Cancelled')),
  payment_method text,
  address_line text,
  region text,
  province text,
  city text,
  barangay text,
  zip_code text,
  affiliate_code text,
  voucher_code text,
  discount integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Checkout can create an order" on public.orders;
create policy "Checkout can create an order" on public.orders
  for insert to anon, authenticated with check (status = 'Pending');

drop policy if exists "Admins view all orders" on public.orders;
create policy "Admins view all orders" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "Affiliates view their referred orders" on public.orders;
create policy "Affiliates view their referred orders" on public.orders
  for select to authenticated using (affiliate_code = public.my_affiliate_code());

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- distributors
-- ----------------------------------------------------------------------------
create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  region text,
  email text not null,
  mobile text not null,
  channel text not null check (channel in ('Lazada', 'Shopee', 'TikTok', 'Offline')),
  applied_at timestamptz not null default now()
);

alter table public.distributors enable row level security;

drop policy if exists "Anyone can submit a distributor application" on public.distributors;
create policy "Anyone can submit a distributor application" on public.distributors
  for insert to anon, authenticated with check (true);

drop policy if exists "Admins view distributors" on public.distributors;
create policy "Admins view distributors" on public.distributors
  for select to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- vouchers
-- ----------------------------------------------------------------------------
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('Percentage', 'Fixed')),
  amount numeric not null,
  min_spend integer not null default 0,
  usage_limit integer not null default 100,
  used_count integer not null default 0,
  valid_from date not null,
  valid_until date not null,
  created_at timestamptz not null default now()
);

alter table public.vouchers enable row level security;

drop policy if exists "Anyone can look up a voucher code" on public.vouchers;
create policy "Anyone can look up a voucher code" on public.vouchers
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage vouchers" on public.vouchers;
create policy "Admins manage vouchers" on public.vouchers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- affiliates — public roster info (separate from profiles, which holds login)
-- ----------------------------------------------------------------------------
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  code text not null unique,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  region text,
  joined_at timestamptz not null default now()
);

alter table public.affiliates enable row level security;

drop policy if exists "Admins manage affiliates" on public.affiliates;
create policy "Admins manage affiliates" on public.affiliates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Affiliates view their own row" on public.affiliates;
create policy "Affiliates view their own row" on public.affiliates
  for select to authenticated using (code = public.my_affiliate_code());

-- ----------------------------------------------------------------------------
-- refunds
-- ----------------------------------------------------------------------------
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  reason text not null,
  amount integer not null,
  status text not null default 'Requested' check (status in ('Requested', 'Approved', 'Refunded', 'Rejected')),
  requested_at timestamptz not null default now()
);

alter table public.refunds enable row level security;

drop policy if exists "Admins manage refunds" on public.refunds;
create policy "Admins manage refunds" on public.refunds
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Seed data — the same 3 packs already live on the site, so Products isn't
-- empty on first load. Everything else (orders, customers, distributors,
-- affiliates, vouchers, refunds) starts empty — the admin dashboard's mock
-- rows were only ever placeholders and won't be migrated in.
-- ============================================================================
insert into public.products (name, subtitle, price, stock, units_sold, status, image_path)
values
  ('1 Box', '10 Sachets Inside', 415, 340, 0, 'Published', './assets/pack-1box.jpg'),
  ('3 Boxes', 'Family Pack', 1145, 128, 0, 'Published', './assets/pack-3boxes.jpg'),
  ('10 Boxes', 'Kopifyholic Bundle', 3940, 22, 0, 'Published', './assets/pack-10boxes.jpg')
on conflict do nothing;
