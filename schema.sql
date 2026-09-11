-- Habitat Maintenance – Supabase Schema
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
create policy "clients_select" on clients for select using (auth.uid() = user_id);
create policy "clients_insert" on clients for insert with check (auth.uid() = user_id);
create policy "clients_update" on clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_delete" on clients for delete using (auth.uid() = user_id);

-- Table agences (créée AVANT missions pour la FK)
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
create policy "agencies_select" on agencies for select using (auth.uid() = user_id);
create policy "agencies_insert" on agencies for insert with check (auth.uid() = user_id);
create policy "agencies_update" on agencies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agencies_delete" on agencies for delete using (auth.uid() = user_id);

create table missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  address text not null,
  type text,
  date date,
  status text default 'À confirmer',
  notes text,
  checklist jsonb default '[]',
  agency_id uuid references agencies(id),
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
  expires_at timestamptz,
  signed_token text unique default gen_random_uuid()::text,
  created_at date default current_date
);
alter table galleries enable row level security;
create policy "galleries_select_own" on galleries for select using (auth.uid() = user_id);
create policy "galleries_insert" on galleries for insert with check (auth.uid() = user_id);
create policy "galleries_update" on galleries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "galleries_delete" on galleries for delete using (auth.uid() = user_id);
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
create policy "invoices_select" on invoices for select using (auth.uid() = user_id);
create policy "invoices_insert" on invoices for insert with check (auth.uid() = user_id);
create policy "invoices_update" on invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_delete" on invoices for delete using (auth.uid() = user_id);

create table if not exists gallery_access_logs (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  action text,
  ip text,
  user_agent text,
  accessed_at timestamptz default now()
);
alter table gallery_access_logs enable row level security;
create policy "gallery_access_logs_owner" on gallery_access_logs for select using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);

create table if not exists gdpr_consents (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  client_email text,
  consented_at timestamptz default now(),
  ip text
);
alter table gdpr_consents enable row level security;
create policy "gdpr_consents_owner" on gdpr_consents for select using (
  exists (select 1 from galleries g where g.id = gallery_id and g.user_id = auth.uid())
);

-- Table profils utilisateurs (SIRET, role, portfolio slug)
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  company_name text,
  siret text,
  address text,
  phone text,
  invoice_prefix text default 'FAC',
  role text default 'user',
  portfolio_slug text unique,
  portfolio_enabled boolean default false,
  bio text,
  zone text,
  logo_url text,
  micro_entrepreneur boolean default false,
  social_links jsonb default '{}',
  created_at timestamptz default now()
);
alter table user_profiles add column if not exists social_links jsonb default '{}';
alter table user_profiles enable row level security;
create policy "profiles_select_own" on user_profiles for select using (auth.uid() = user_id);
create policy "profiles_insert" on user_profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update" on user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_admin_select" on user_profiles for select using (
  exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'admin')
);
create policy "profiles_public_portfolio_read" on user_profiles for select using (portfolio_enabled = true);

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
create policy "testimonials_select_own" on testimonials for select using (auth.uid() = user_id);
create policy "testimonials_insert" on testimonials for insert with check (auth.uid() = user_id);
create policy "testimonials_update" on testimonials for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "testimonials_delete" on testimonials for delete using (auth.uid() = user_id);
create policy "testimonials_public_read" on testimonials for select using (
  exists (select 1 from user_profiles p where p.user_id = testimonials.user_id and p.portfolio_enabled = true)
);

-- Migration: adresse de la propriété sur les galeries (pour affichage public sans FK missions)
alter table galleries add column if not exists property_address text;

-- Bucket de stockage pour les photos de galeries (à exécuter dans le SQL Editor Supabase)
-- insert into storage.buckets (id, name, public) values ('gallery-photos', 'gallery-photos', true) on conflict (id) do nothing;

-- Politiques RLS pour le stockage (storage.objects) — décommenter et exécuter séparément
-- create policy "gallery_photos_storage_upload" on storage.objects for insert to authenticated with check (bucket_id = 'gallery-photos' and name like (auth.uid()::text || '/%'));
-- create policy "gallery_photos_storage_read"   on storage.objects for select using (bucket_id = 'gallery-photos');
-- create policy "gallery_photos_storage_delete" on storage.objects for delete to authenticated using (bucket_id = 'gallery-photos' and name like (auth.uid()::text || '/%'));

-- Photos portfolio (séparées des missions)
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
create policy "portfolio_photos_select_own" on portfolio_photos for select using (auth.uid() = user_id);
create policy "portfolio_photos_insert" on portfolio_photos for insert with check (auth.uid() = user_id);
create policy "portfolio_photos_update" on portfolio_photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "portfolio_photos_delete" on portfolio_photos for delete using (auth.uid() = user_id);
create policy "portfolio_photos_public_read" on portfolio_photos for select using (
  exists (select 1 from user_profiles p where p.user_id = portfolio_photos.user_id and p.portfolio_enabled = true)
);

-- Migration: tarifs personnalisés par photographe
alter table user_profiles add column if not exists custom_tarifs jsonb default '{}';

-- Migration: forfait déplacement sur les devis
alter table quotes add column if not exists deplacement numeric default 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : rattrapage du passage de la photographie à la maintenance
--
-- L'app écrivait ces champs alors que les colonnes n'existaient pas. Supabase
-- rejetait alors l'écriture entière : le profil et les devis ne survivaient que
-- dans le localStorage du navigateur. À exécuter dans le SQL Editor Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

-- Profil : coordonnées et mentions légales obligatoires d'un artisan
alter table user_profiles add column if not exists email text;
alter table user_profiles add column if not exists tva_number text;
alter table user_profiles add column if not exists rm_number text;
alter table user_profiles add column if not exists insurance_name text;
alter table user_profiles add column if not exists insurance_contract text;
alter table user_profiles add column if not exists insurance_coverage text;
alter table user_profiles add column if not exists mediator_name text;
alter table user_profiles add column if not exists mediator_url text;
alter table user_profiles add column if not exists withdrawal_right boolean default false;

-- Devis : lignes détaillées, remplaçant le gabarit figé de la photographie
alter table quotes add column if not exists type_service text;
alter table quotes add column if not exists description text;
alter table quotes add column if not exists lines jsonb default '[]';
alter table quotes add column if not exists penalites boolean default false;
alter table quotes add column if not exists accept_token text;

-- Devis : champs de l'ancien mode horaire/forfait, conservés pour que les devis
-- déjà enregistrés restent lisibles (quoteLines() les reconstruit en lignes).
alter table quotes add column if not exists mode text;
alter table quotes add column if not exists heures numeric;
alter table quotes add column if not exists taux_horaire numeric;
alter table quotes add column if not exists forfait_ht numeric;
alter table quotes add column if not exists fournitures numeric;
alter table quotes add column if not exists marge_fournitures numeric;
alter table quotes add column if not exists fournitures_vente numeric;
alter table quotes add column if not exists urgence numeric default 0;

-- Colonnes héritées de la photographie, désormais inutilisées.
-- Décommenter pour nettoyer une fois la migration vérifiée.
-- alter table quotes drop column if exists surface;
-- alter table quotes drop column if exists photos;
-- alter table quotes drop column if exists visite;
-- alter table quotes drop column if exists drone;
-- alter table quotes drop column if exists retouche;

-- Le catalogue d'articles est pour l'instant purement local (pii_articles).
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ref text,
  designation text not null,
  unit text default 'u',
  pu_achat numeric default 0,
  pu_ht numeric default 0,
  tva_rate numeric default 20,
  created_at timestamptz default now()
);
alter table articles enable row level security;
-- create policy n'est pas idempotent : on retire d'abord pour que la migration
-- puisse être rejouée sans erreur.
drop policy if exists "articles_select" on articles;
drop policy if exists "articles_insert" on articles;
drop policy if exists "articles_update" on articles;
drop policy if exists "articles_delete" on articles;
create policy "articles_select" on articles for select using (auth.uid() = user_id);
create policy "articles_insert" on articles for insert with check (auth.uid() = user_id);
create policy "articles_update" on articles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "articles_delete" on articles for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Correctif : récursion infinie sur user_profiles (PostgreSQL 42P17)
--
-- "profiles_admin_select" se vérifiait en interrogeant user_profiles, la table
-- qu'elle protège elle-même — chaque lecture publique de la vitrine (qui doit
-- évaluer TOUTES les politiques SELECT de la table) déclenchait une boucle
-- infinie. Le contournement standard Supabase/Postgres : sortir la vérification
-- dans une fonction SECURITY DEFINER, qui s'exécute avec les droits du
-- propriétaire (contourne RLS) plutôt que ceux de l'appelant.
-- https://supabase.com/docs/guides/database/postgres/row-level-security#avoiding-recursive-rls-policies
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from user_profiles where user_id = uid and role = 'admin');
$$;

drop policy if exists "profiles_admin_select" on user_profiles;
create policy "profiles_admin_select" on user_profiles for select using (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : mentions obligatoires des devis et factures
--
-- La forme juridique doit figurer sur les devis comme sur les factures, et un
-- devis adressé à un particulier doit indiquer la date ou le délai d'exécution
-- des travaux (art. L.111-1 du code de la consommation).
-- ─────────────────────────────────────────────────────────────────────────────
alter table user_profiles add column if not exists legal_form text;
-- Moyens de paiement : obligatoires sur un devis de dépannage, réparation ou
-- entretien du bâtiment (arrêté du 24 janvier 2017).
alter table user_profiles add column if not exists payment_methods text;
alter table quotes add column if not exists date_debut date;
alter table quotes add column if not exists date_fin date;
