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
create policy "own" on clients using (auth.uid() = user_id);

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
create policy "own" on missions using (auth.uid() = user_id);

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
create policy "own" on quotes using (auth.uid() = user_id);

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
create policy "own" on galleries using (auth.uid() = user_id);
create policy "public_read" on galleries for select using (ready = true);

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
create policy "owner_all" on gallery_photos using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
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
create policy "own" on subscriptions using (auth.uid() = user_id);
