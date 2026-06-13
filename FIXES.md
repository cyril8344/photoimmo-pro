# PhotoImmo Pro — Audit automatique : corrections bugs et sécurité

Date : 2026-06-13  
Auditeur : Claude Code (claude-sonnet-4-6)

---

## Fichiers modifiés

### 1. `api/stripe-webhook.js` — CRITIQUE

**Problème : `module.exports.config` écrasé par `module.exports = function`**

Le code original faisait :
```js
module.exports.config = { api: { bodyParser: false } };
// ... puis plus bas :
module.exports = async function handler(req, res) { ... };
```

Assigner `module.exports = async function ...` **écrase complètement** la propriété `.config` préalablement définie. Résultat : Vercel parsait le body JSON automatiquement, détruisant la signature Stripe et rendant **toute vérification de webhook impossible** (erreur 400 systématique sur toutes les requêtes Stripe).

**Correction :** Déclaration de la fonction comme `async function handler(...)`, puis attachement de `handler.config = { api: { bodyParser: false } }` sur la référence de fonction, et enfin `module.exports = handler`. Ainsi la config est une propriété de la fonction exportée et ne peut pas être écrasée.

---

### 2. `api/drive.js` — Bug d'encodage URL

**Problème : encodage incorrect de la query Google Drive API**

Le code original construisait l'URL ainsi :
```js
`https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(folder_id)}'+in+parents&...`
```

`encodeURIComponent` était appliqué uniquement sur `folder_id`, laissant `+in+parents` non encodé comme partie de la valeur du paramètre `q`. L'API Drive recevait une syntaxe invalide et retournait une erreur.

**Correction :** L'expression complète `'folderId' in parents` est maintenant encodée en une seule fois :
```js
const query = encodeURIComponent(`'${folder_id}' in parents`);
`...?q=${query}&...`
```

---

### 3. `api/notify.js` — Gestion d'erreur incomplète

**Problème : message d'erreur générique en cas d'exception**

Le bloc `catch` retournait systématiquement `{ error: 'Erreur envoi email' }`, masquant la cause réelle (timeout réseau, clé API invalide, quota Resend dépassé, etc.).

**Correction :** Le message d'erreur réel est maintenant transmis :
```js
return res.status(500).json({ error: err.message || 'Erreur envoi email' });
```

---

### 4. `schema.sql` — Politique RLS manquante (DELETE sur `subscriptions`)

**Problème : absence de policy DELETE sur la table `subscriptions`**

Toutes les autres tables (clients, missions, quotes, galleries, gallery_photos) avaient leurs quatre policies RLS (SELECT, INSERT, UPDATE, DELETE). La table `subscriptions` n'avait pas de policy DELETE, rendant la suppression d'abonnement impossible pour l'utilisateur propriétaire (et potentiellement laissant des enregistrements orphelins si un compte est supprimé via une cascade manuelle).

**Correction :** Ajout de :
```sql
create policy "subscriptions_delete" on subscriptions for delete using (auth.uid() = user_id);
```

---

### 5. `index.html` — `loadSubscription` non appelée lors du `SIGNED_IN` via `onAuthStateChange`

**Problème : abonnement non chargé lors d'une reconnexion automatique via token refresh**

Le callback `onAuthStateChange` restaurait la session de l'utilisateur (`setUser`, `setAuthed`) mais n'appelait jamais `loadSubscription`. Si un utilisateur revenait sur l'app avec un token de session valide (refresh automatique), l'état `subscription` restait `null`, forçant l'affichage de l'écran "Chargement…" indéfiniment ou menant à l'affichage incorrect de `UpgradeModal`.

Note : `getSession()` (utilisé juste au-dessus) appelle bien `loadSubscription` — mais `onAuthStateChange` couvre les cas de token refresh en cours de session où `getSession` n'est plus réexécuté.

**Correction :**
```js
const{data:{subscription:authSub}}=sb.auth.onAuthStateChange(async(event,session)=>{
  if(session){
    setUser(session.user);
    setAuthed(true);
    if(event==='SIGNED_IN') await loadSubscription(session.user.id);
  }
  else{setUser(null);setAuthed(false);setSubscription(null);}
});
```
Le check `event==='SIGNED_IN'` évite d'appeler `loadSubscription` sur chaque event Supabase (TOKEN_REFRESHED, etc.) qui déclenche aussi ce callback avec une session valide.

---

### 6. `vercel.json` — Suppression de la règle no-op `/api/:path*`

**Problème : rewrite inutile et potentiellement confusant**

La règle `{ "source": "/api/:path*", "destination": "/api/:path*" }` redirige les routes API vers elles-mêmes. Vercel résout automatiquement les fonctions serverless dans `/api/` sans avoir besoin de rewrite. Cette règle est un no-op mais ajoute du bruit et pourrait interférer avec des futures configurations.

**Correction :** Suppression de cette règle. Les autres règles (ordre conservé) couvrent correctement tous les cas :
1. `/app` → `index.html`
2. `/app/(.*)` → `index.html`
3. `/gallery/:token*` → `index.html`
4. `/` → `landing.html`

---

## Résumé

| Fichier | Sévérité | Nature |
|---|---|---|
| `api/stripe-webhook.js` | CRITIQUE | La vérification de signature Stripe était complètement cassée |
| `api/drive.js` | HAUTE | Encodage URL incorrect, requête Drive API invalide |
| `schema.sql` | MOYENNE | Policy RLS DELETE manquante sur `subscriptions` |
| `index.html` | MOYENNE | `loadSubscription` non appelée sur reconnexion automatique |
| `api/notify.js` | FAIBLE | Message d'erreur masqué en cas d'exception |
| `vercel.json` | FAIBLE | Règle de rewrite no-op supprimée |

---

## Non-problèmes vérifiés

- **`api/stripe.js`** : `require('@supabase/supabase-js')` est en tête de fichier (pas dans un bloc conditionnel) — correct.
- **`package.json`** : `stripe` et `@supabase/supabase-js` sont bien listés comme dépendances — correct.
- **`index.html` `loadSubscription` closure** : La fonction est définie comme `const` dans le corps du composant `App`, avant la ligne `return` qui référence `onLogin`. Elle est accessible dans le callback `onLogin` — correct, pas de bug de scope.
- **`landing.html`** : Aucune balise `<img>` sans `alt`, structure HTML valide, pas de balises non fermées.
- **`vercel.json`** : Ordre des règles déjà correct (spécifique → générique).
- **`schema.sql`** : Toutes les autres tables avaient leurs 4 policies RLS. Les types de données sont corrects. Pas de référence à des tables inexistantes.
