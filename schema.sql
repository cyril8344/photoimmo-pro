-- PhotoImmo Pro – Supabase Schema
-- Run this in your Supabase SQL editor

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  agent text,
  agent_email text,
  created_at date default current_date
);
alter table clients enable row level security;
-- SELECT: only own rows
create policy "clients_select" on clients for select using (auth.uid() = user_id);
-- INSERT: can only insert rows belonging to yourself
create policy "clients_insert" on clients for insert with check (auth.uid() = user_id);
-- UPDATE: can only update own rows
create policy "clients_update" on clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- DELETE: can only delete own rows
create policy "clients_delete" on clients for delete using (auth.uid() = user_id);

create table missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  address text not null,
  type text,
  date date,
  status text default 'À confirmer',
  notes text,
  created_at date default current_date
);
alter table missions enable row level security;
create policy "missions_select" on missions for select using (auth.uid() = user_id);
create policy "missions_insert" on missions for insert with check (auth.uid() = user_id);
create policy "missions_update" on missions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "missions_delete" on missions for delete using (auth.uid() = user_id);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  mission_id uuid references missions(id),
  num text,
  surface text,
  photos int,
  visite text,
  drone text,
  retouche text,
  ht numeric,
  tva numeric,
  ttc numeric,
  status text default 'En attente',
  created_at date default current_date
);
alter table quotes enable row level security;
create policy "quotes_select" on quotes for select using (auth.uid() = user_id);
create policy "quotes_insert" on quotes for insert with check (auth.uid() = user_id);
create policy "quotes_update" on quotes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quotes_delete" on quotes for delete using (auth.uid() = user_id);

create table galleries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mission_id uuid references missions(id) on delete cascade,
  token text unique default gen_random_uuid()::text,
  drive_folder_id text,
  ready boolean default false,
  created_at date default current_date
);
alter table galleries enable row level security;
-- Owner can do everything
create policy "galleries_select_own" on galleries for select using (auth.uid() = user_id);
create policy "galleries_insert" on galleries for insert with check (auth.uid() = user_id);
create policy "galleries_update" on galleries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "galleries_delete" on galleries for delete using (auth.uid() = user_id);
-- Public can read published galleries (token-based access from client gallery page)
create policy "galleries_public_read" on galleries for select using (ready = true);

create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  drive_file_id text,
  name text,
  thumb_url text,
  full_url text,
  selected boolean default false
);
alter table gallery_photos enable row level security;
-- Owner can manage photos in their galleries
create policy "gallery_photos_owner_select" on gallery_photos for select using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);
create policy "gallery_photos_owner_insert" on gallery_photos for insert with check (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);
create policy "gallery_photos_owner_update" on gallery_photos for update using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
) with check (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);
create policy "gallery_photos_owner_delete" on gallery_photos for delete using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);
-- Public can view photos in published galleries
create policy "gallery_photos_public_read" on gallery_photos for select using (
  exists (select 1 from galleries g where g.id = gallery_id and g.ready = true)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'trialing',
  plan text default 'monthly',
  trial_ends_at timestamptz default now() + interval '14 days',
  created_at timestamptz default now()
);
alter table subscriptions enable row level security;
create policy "subscriptions_select" on subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_insert" on subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions_update" on subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_delete" on subscriptions for delete using (auth.uid() = user_id);

-- Nouvelles tables et colonnes pour la v2

-- Colonne checklist pré-mission sur missions
alter table missions add column if not exists checklist jsonb default '[]';
alter table missions add column if not exists agency_id uuid references agencies(id);

-- Table agences
create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  contacts jsonb default '[]',
  preferred_rates jsonb default '{}',
  notes text,
  created_at date default current_date
);
alter table agencies enable row level security;
create policy if not exists "agencies_select" on agencies for select using (auth.uid() = user_id);
create policy if not exists "agencies_insert" on agencies for insert with check (auth.uid() = user_id);
create policy if not exists "agencies_update" on agencies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "agencies_delete" on agencies for delete using (auth.uid() = user_id);

-- Table factures
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  quote_id uuid references quotes(id),
  client_id uuid references clients(id) on delete cascade,
  mission_id uuid references missions(id),
  num text not null,
  ht numeric,
  tva numeric,
  ttc numeric,
  status text default 'En attente',
  due_date date,
  paid_date date,
  reminders_sent int default 0,
  created_at date default current_date
);
alter table invoices enable row level security;
create policy if not exists "invoices_select" on invoices for select using (auth.uid() = user_id);
create policy if not exists "invoices_insert" on invoices for insert with check (auth.uid() = user_id);
create policy if not exists "invoices_update" on invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "invoices_delete" on invoices for delete using (auth.uid() = user_id);

-- Table logs d'accès galerie
create table if not exists gallery_access_logs (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  action text,
  ip text,
  user_agent text,
  accessed_at timestamptz default now()
);
alter table gallery_access_logs enable row level security;
create policy if not exists "gallery_access_logs_owner" on gallery_access_logs for select using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);

-- Table consentements RGPD
create table if not exists gdpr_consents (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  client_email text,
  consented_at timestamptz default now(),
  ip text
);
alter table gdpr_consents enable row level security;
create policy if not exists "gdpr_consents_owner" on gdpr_consents for select using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);

-- Colonne expiration token galerie
alter table galleries add column if not exists expires_at timestamptz;
alter table galleries add column if not exists signed_token text unique default gen_random_uuid()::text;

-- Nouvelles tables pour la v3

-- Table profils utilisateurs (SIRET, role, portfolio slug)
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  company_name text,
  siret text,
  address text,
  phone text,
  invoice_prefix text default 'FAC',
  role text default 'user', -- 'user' | 'admin'
  portfolio_slug text unique,
  portfolio_enabled boolean default false,
  bio text,
  zone text,
  logo_url text,
  micro_entrepreneur boolean default false,
  created_at timestamptz default now()
);
alter table user_profiles enable row level security;
create policy if not exists "profiles_select_own" on user_profiles for select using (auth.uid() = user_id);
create policy if not exists "profiles_insert" on user_profiles for insert with check (auth.uid() = user_id);
create policy if not exists "profiles_update" on user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Admin can view all profiles (for admin panel)
create policy if not exists "profiles_admin_select" on user_profiles for select using (
  exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'admin')
);
-- Public can read profiles for enabled portfolios (by slug lookup)
create policy if not exists "profiles_public_portfolio_read" on user_profiles for select using (portfolio_enabled = true);

-- Table témoignages portfolio
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_name text not null,
  rating int default 5,
  comment text,
  date date default current_date
);
alter table testimonials enable row level security;
create policy if not exists "testimonials_select_own" on testimonials for select using (auth.uid() = user_id);
create policy if not exists "testimonials_insert" on testimonials for insert with check (auth.uid() = user_id);
create policy if not exists "testimonials_update" on testimonials for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "testimonials_delete" on testimonials for delete using (auth.uid() = user_id);
-- Public read for portfolio
create policy if not exists "testimonials_public_read" on testimonials for select using (
  exists (select 1 from user_profiles p where p.user_id = testimonials.user_id and p.portfolio_enabled = true)
);

-- Portfolio photos (séparées des missions)
create table if not exists portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mission_id uuid references missions(id),
  url text,
  category text default 'Appartements',
  caption text,
  display_order int default 0,
  created_at date default current_date
);
alter table portfolio_photos enable row level security;
create policy if not exists "portfolio_photos_select_own" on portfolio_photos for select using (auth.uid() = user_id);
create policy if not exists "portfolio_photos_insert" on portfolio_photos for insert with check (auth.uid() = user_id);
create policy if not exists "portfolio_photos_update" on portfolio_photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "portfolio_photos_delete" on portfolio_photos for delete using (auth.uid() = user_id);
-- Public read for enabled portfolios
create policy if not exists "portfolio_photos_public_read" on portfolio_photos for select using (
  exists (select 1 from user_profiles p where p.user_id = portfolio_photos.user_id and p.portfolio_enabled = true)
);
