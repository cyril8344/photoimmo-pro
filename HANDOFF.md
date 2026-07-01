# Handoff — PhotoImmo Pro

> Dernière mise à jour : 2026-06-14
> Repo : `cyril8344/photoimmo-pro` · Branche principale : `main`

---

## 1. Présentation du projet

Application SaaS pour photographes immobiliers indépendants.  
Permet de gérer : clients, missions, devis, factures, galeries de livraison, portfolio public, comptabilité.  
Modèle économique : abonnement mensuel (29 €/mois) ou annuel (249 €/an) avec 14 jours d'essai gratuit.

---

## 2. Stack technique

| Couche | Techno | Notes |
|---|---|---|
| Frontend | React 18 + Babel Standalone | Pas de bundler — tout dans `index.html` |
| Style | Tailwind CSS CDN | Config accent `#f59e0b` (amber-500) |
| PDF | jsPDF CDN | Devis + factures + bilans comptables |
| Backend | Vercel Serverless Functions | Fichiers dans `/api/*.js`, CommonJS |
| Base de données | Supabase (PostgreSQL + Auth + RLS) | Isolation par `user_id` sur toutes les tables |
| Emails | Resend | `/api/notify.js`, expéditeur `notifications@photoimmo.pro` |
| Paiements | Stripe | Checkout + webhook (bodyParser désactivé) |
| Auth | Supabase Auth (email/password) | |

### Mode démo
Si `SUPABASE_URL` / `SUPABASE_ANON_KEY` ne sont pas configurées → `sb = null` → l'app tourne entièrement en `localStorage`, le login accepte n'importe quel email/mot de passe.  
**Ce n'est pas un bug — c'est voulu pour la démo en ligne.**  
Pour activer le vrai multi-compte : ajouter les deux variables dans Vercel → redéployer.

---

## 3. Structure des fichiers

```
photoimmo-pro/
├── index.html            # SPA React complète (~2111 lignes)
├── landing.html          # Page marketing publique (route /)
├── portfolio.html        # Page portfolio publique (/portfolio/[slug])
├── schema.sql            # Schéma Supabase complet — à exécuter dans l'éditeur SQL
├── vercel.json           # Headers sécurité (CSP, HSTS…) + rewrites
├── package.json          # stripe + @supabase/supabase-js
├── .env.example          # Toutes les variables d'env nécessaires
├── FIXES.md              # Historique des corrections de bugs
└── api/
    ├── notify.js         # Emails Resend (8 templates)
    ├── stripe.js         # Création checkout + portail Stripe
    ├── stripe-webhook.js # Webhooks Stripe (bodyParser: false OBLIGATOIRE)
    ├── drive.js          # Google Drive (liste fichiers, liens)
    ├── invite.js         # Admin : invite utilisateur via Supabase Admin + Resend
    ├── admin.js          # Admin : suspend / unsuspend / reset_password
    └── contact.js        # Formulaire contact portfolio → email photographe
```

---

## 4. Variables d'environnement

Toutes les variables sont dans `.env.example`. À configurer dans **Vercel → Settings → Environment Variables**.

```env
# Supabase (https://supabase.com → Settings → API)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...           # clé publique (safe côté client)
SUPABASE_SERVICE_KEY=eyJhbGci...        # clé service — JAMAIS exposée côté client

# Google Drive (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REFRESH_TOKEN=1//xxxx

# Resend (https://resend.com)
RESEND_API_KEY=re_xxxx

# Stripe (https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_PRICE_MONTHLY=price_xxxx         # ID du tarif mensuel dans Stripe
STRIPE_PRICE_YEARLY=price_xxxx          # ID du tarif annuel dans Stripe

# App
APP_URL=https://your-app.vercel.app
PORTFOLIO_BASE_URL=https://your-app.vercel.app
SESSION_TIMEOUT_MINUTES=30
GALLERY_TOKEN_EXPIRY_DAYS=30
```

---

## 5. Routing Vercel

| URL | Destination |
|---|---|
| `/` | `landing.html` (page marketing) |
| `/app`, `/app/*` | `index.html` (app principale) |
| `/gallery/:token*` | `index.html` (galerie client publique) |
| `/portfolio/:slug*` | `portfolio.html` (portfolio photographe public) |

---

## 6. Base de données Supabase

**Toutes les tables ont RLS activé** avec policies `user_id = auth.uid()`.  
Exécuter `schema.sql` dans **Supabase → SQL Editor** pour créer toutes les tables.

| Table | Colonnes clés |
|---|---|
| `clients` | id, user_id, name, email, phone, agent, agent_email |
| `missions` | id, user_id, client_id, address, type, date, status, notes, checklist, agency_id |
| `quotes` | id, user_id, client_id, mission_id, num, surface, photos, visite, drone, retouche, ht, tva, ttc, status |
| `galleries` | id, user_id, mission_id, token, drive_folder_id, ready, expires_at, signed_token |
| `gallery_photos` | id, gallery_id, drive_file_id, name, thumb_url, full_url, selected |
| `subscriptions` | id, user_id, stripe_customer_id, stripe_subscription_id, status, plan, trial_ends_at |
| `agencies` | id, user_id, name, contacts, preferred_rates, notes |
| `invoices` | id, user_id, quote_id, client_id, mission_id, num, ht, tva, ttc, status, due_date, paid_date, reminders_sent |
| `gallery_access_logs` | id, gallery_id, action, ip, user_agent, accessed_at |
| `gdpr_consents` | id, gallery_id, client_email, consented_at, ip |
| `user_profiles` | id, user_id, company_name, siret, address, phone, invoice_prefix, **role** (admin/user), portfolio_slug, portfolio_enabled, bio, zone, logo_url |
| `testimonials` | id, user_id, client_name, rating, comment, date |
| `portfolio_photos` | id, user_id, mission_id, url, category, caption, display_order |

---

## 7. Pages de l'application

Navigation par état `page` + switch `renderPage()` dans `index.html`.

| Page | id | Description |
|---|---|---|
| Dashboard | `dashboard` | KPIs, pipeline kanban, CA 6 mois, alertes, top agences |
| Clients | `clients` | CRUD + validation email |
| Missions | `missions` | CRUD + filtres par statut |
| Devis | `quotes` | CRUD + packs pré-remplis + export PDF |
| Livraisons | `delivery` | Galeries photos, publication, lien client |
| Agences | `agencies` | CRUD partenaires immobiliers |
| Factures | `invoices` | Création depuis devis, PDF pro (SIRET + mentions légales), email, marquer payé |
| Comptabilité | `accounting` | Bilan mensuel/annuel, graphique 12 mois, export CSV + PDF |
| Mon Portfolio | `portfolio` | Profil SIRET, photos catégorisées, témoignages, toggle public |
| Admin | `admin` | Visible si `role === 'admin'` — gestion utilisateurs, invitations |

---

## 8. Statuts et constantes

```js
// 8 statuts de mission (pipeline complet)
const MISSION_STATUSES = [
  'Prospect', 'Devis envoyé', 'Accepté', 'Shooting',
  'Retouche', 'Livraison', 'Facturé', 'Payé'
];

// Packs préremplis pour les devis
const PACKS = {
  essentiel: { surface:'50-100', photos:20, visite:'non', drone:'non', retouche:'standard' },
  confort:   { surface:'100-200', photos:30, visite:'oui', drone:'non', retouche:'standard' },
  premium:   { surface:'>200', photos:50, visite:'oui', drone:'oui', retouche:'premium' },
};

// Tarifs de base
const TARIFS = {
  surface:  { '<50':200, '50-100':300, '100-200':450, '>200':600 },
  photos:   { 10:0, 20:80, 30:150, 50:280 },
  visite:   { non:0, oui:350 },
  drone:    { non:0, oui:250 },
  retouche: { standard:0, premium:120 },
};

const TVA = 0.20;
```

---

## 9. LocalStorage (mode démo)

| Clé | Contenu |
|---|---|
| `pii_clients` | tableau de clients |
| `pii_missions` | tableau de missions |
| `pii_quotes` | tableau de devis |
| `pii_galleries` | tableau de galeries |
| `pii_invoices` | tableau de factures |
| `pii_agencies` | tableau d'agences |
| `pii_profile` | `{ company_name, siret, address, phone, invoice_prefix, role, portfolio_slug, portfolio_enabled, bio, zone }` |
| `pii_portfolio_photos` | photos portfolio |
| `pii_testimonials` | témoignages |
| `pii_seeded` | `true` quand le seed démo a été exécuté |

**Astuce admin en mode démo :** ouvrir la console navigateur et taper :
```js
localStorage.setItem('pii_profile', JSON.stringify({...JSON.parse(localStorage.getItem('pii_profile')||'{}'), role:'admin'}))
```
Puis recharger → l'onglet "Admin" apparaît dans la sidebar.

---

## 10. Emails disponibles (`api/notify.js`)

Appel : `POST /api/notify` → body `{ type, to, data }`

| type | Déclenchement |
|---|---|
| `gallery_ready` | Galerie publiée → email au client avec lien |
| `mission_reminder` | Rappel mission au photographe |
| `shooting_reminder` | Rappel shooting au client (J-1) |
| `quote_sent` | Envoi devis au client |
| `quote_followup` | Relance devis sans réponse +48h |
| `gallery_not_downloaded` | Photos non consultées après 7 jours |
| `invoice_sent` | Envoi facture au client |
| `invoice_reminder` | Relance facture impayée |

---

## 11. Points critiques à ne pas casser

1. **`api/stripe-webhook.js`** — `bodyParser: false` DOIT être attaché à la fonction nommée :
   ```js
   async function handler(req, res) { ... }
   handler.config = { api: { bodyParser: false } };
   module.exports = handler;
   ```
   Si on fait `module.exports.config = ...` avant `module.exports = handler`, la config est écrasée.

2. **`api/drive.js`** — la query Google Drive doit encoder la phrase complète :
   ```js
   const query = encodeURIComponent(`'${folder_id}' in parents`);
   ```
   Pas juste `encodeURIComponent(folder_id)`.

3. **Mode démo** — `useState(false)` pour `authed` (pas `useState(!sb)`), sinon le login est bypassé à l'initialisation.

4. **`SUPABASE_SERVICE_KEY`** — jamais exposée côté client. Uniquement dans les fonctions serverless (`api/invite.js`, `api/admin.js`, `api/stripe-webhook.js`).

---

## 12. Mise en production — checklist

- [ ] Créer un projet Supabase → exécuter `schema.sql` dans l'éditeur SQL
- [ ] Copier `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_KEY` dans Vercel
- [ ] Créer compte Resend → vérifier le domaine DNS → copier `RESEND_API_KEY`
- [ ] Créer compte Stripe → créer 2 produits (mensuel 29€ / annuel 249€) → copier les `price_id` et `STRIPE_SECRET_KEY`
- [ ] Configurer le webhook Stripe → endpoint `/api/stripe-webhook` → copier `STRIPE_WEBHOOK_SECRET`
- [ ] Définir `APP_URL` = URL de production dans Vercel
- [ ] (Optionnel) Configurer Google Drive API pour les galeries

---

## 12b. Étapes manuelles restantes (à faire dans cet ordre)

### 1. Supabase Storage — bucket gallery-photos
**Où :** Supabase → Storage → "New bucket"
- Nom : `gallery-photos` · Public : ✓
- Puis dans Supabase → SQL Editor, décommenter et exécuter les 4 lignes de policies Storage à la fin de `schema.sql` :
  ```sql
  insert into storage.buckets (id, name, public) values ('gallery-photos', 'gallery-photos', true) on conflict (id) do nothing;
  create policy "gallery_photos_storage_upload" on storage.objects for insert to authenticated with check (bucket_id = 'gallery-photos' and name like (auth.uid()::text || '/%'));
  create policy "gallery_photos_storage_read"   on storage.objects for select using (bucket_id = 'gallery-photos');
  create policy "gallery_photos_storage_delete" on storage.objects for delete to authenticated using (bucket_id = 'gallery-photos' and name like (auth.uid()::text || '/%'));
  ```

### 2. Migration SQL — adresse du bien sur les galeries
**Où :** Supabase → SQL Editor (déjà inclus dans `schema.sql`) :
```sql
alter table galleries add column if not exists property_address text;
```

### 3. Stripe — passer en mode live
**Où :** [dashboard.stripe.com](https://dashboard.stripe.com) → basculer sur "Live"
1. Copier `sk_live_xxx` → Vercel → `STRIPE_SECRET_KEY`
2. Créer 2 produits live : "PhotoImmo Pro Mensuel" 29€ + "PhotoImmo Pro Annuel" 249€
3. Copier les 2 `price_live_xxx` → Vercel → `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`
4. Webhook : ajouter l'endpoint `https://votre-domaine.fr/api/stripe-webhook` → copier `whsec_xxx` → Vercel → `STRIPE_WEBHOOK_SECRET`

### 4. Resend — domaine custom pour les emails
**Où :** [resend.com](https://resend.com) → Domains → "Add domain"
1. Entrer votre domaine (ex: `photoimmo.pro`)
2. Ajouter les enregistrements DNS indiqués (TXT + DKIM) chez votre registrar
3. Cliquer "Verify" dans Resend
4. Mettre `EMAIL_FROM` dans Vercel → ex: `hello@photoimmo.pro`

### 5. Domaine custom — achat + pointage vers Vercel
**Où acheter :** OVH / Namecheap / Gandi (~10–15€/an pour un `.fr`)
**Pointage :**
1. Chez le registrar : ajouter un enregistrement `CNAME` → `cname.vercel-dns.com`
2. Dans Vercel → Settings → Domains → "Add domain" → entrer votre domaine
3. Vercel vérifie le DNS (quelques minutes à 24h)
4. Mettre à jour `APP_URL` + `PORTFOLIO_BASE_URL` dans Vercel avec le vrai domaine → redéployer

---

## 13. Coûts réels

| Service | Plan gratuit | Limite | Payant si dépassé |
|---|---|---|---|
| Vercel | Hobby (gratuit) | 100 GB/mois | Pro : 20$/mois |
| Supabase | Free | 500 MB, 50k MAU | Pro : 25$/mois |
| Resend | Gratuit | 3 000 emails/mois | Pro : 20$/mois |
| Stripe | Gratuit | — | 1,5% + 0,25€/transaction |

**Coût de démarrage : 0€/mois** (hors domaine ~10€/an si vous voulez envoyer des emails depuis votre propre domaine).  
Pas besoin d'entreprise pour commencer. Pour encaisser des paiements Stripe légalement en France : statut **auto-entrepreneur** suffit (gratuit, inscripton sur autoentrepreneur.urssaf.fr).

---

## 14. Historique des PRs mergées

| PR | Contenu |
|---|---|
| #1 | Fichiers initiaux (6 fichiers de base) |
| #2 | Stripe, multi-compte, landing page marketing |
| #3 | Audit automatique — corrections bugs et sécurité |
| #4 | Mode démo entièrement fonctionnel |
| #5 | v2 : Dashboard KPIs, Agences, Factures, Pipeline kanban, headers sécurité |
| #6 | v3 : PDF facture pro, Comptabilité, Admin panel, Portfolio public |

---

## 15. Valeur marchande estimée

| Scenario | Prix estimé |
|---|---|
| Code source seul (sans clients) | 3 000 – 6 000 € |
| Avec 5–10 clients payants (MRR ~150€) | 5 000 – 15 000 € |
| Avec 30+ clients (MRR ~900€) | 25 000 – 50 000 € |

Plateforme recommandée pour la revente : **Acquire.com** (ex-MicroAcquire).
