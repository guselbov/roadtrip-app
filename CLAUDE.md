# RoadTrip App — Contexte projet pour Claude Code

## Description
Application web permettant de créer et organiser des roadtrips collaboratifs. Le créateur ajoute des étapes, génère un code court, et ses amis rejoignent avec un compte et indiquent leurs disponibilités — l'app calcule automatiquement les chevauchements de dates par étape.

## Stack technique
- **Framework** : Next.js 16.3.1 (App Router, Turbopack)
- **Base de données** : Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Auth** : Supabase Auth, email + mot de passe (8 caractères minimum)
- **Styling** : CSS-in-JS inline + variables CSS (design system vert foncé/kaki)
- **Hébergement** : Vercel
- **Repo** : github.com/guselbov/roadtrip-app
- **URL prod** : roadtrip-app-vercel.vercel.app

## Supabase
- **URL** : https://rzmdjmuiburllzylrvxe.supabase.co
- **Clés** : uniquement via `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local`, et variables d'env Vercel). Ne jamais réintroduire de valeur en dur dans le code.
- **Storage bucket** : trip-photos (lecture publique, écriture authentifiée)
- **Migrations** : `0001_auth_rls.sql` (schéma + RLS), `0002_stages_overlap_and_owner.sql` (chevauchement, présence de l'organisateur, profils orphelins), `0003_activities.sql` (activités proposées et votées)

## Schéma base de données
```sql
-- profiles : identité applicative (id = auth.users.id)
id, display_name, email, created_at
-- display_name est le SEUL nom affiché : aucun champ texte libre d'auteur

-- roadtrips : trips créés
id, owner_id, slug (unique), code (6 chars lisibles ex: SURF26), title,
description, date_start, date_end, status, created_at

-- stages : étapes du trip
id, roadtrip_id, name, description, lat, lng,
date_start, date_end, order_index, type, color, created_at

-- trip_members : appartenance à un trip (remplace l'ancienne table participants)
id, trip_id, user_id, role (owner|member), status (pending|approved|rejected),
date_start, date_end, message, created_at
-- unique(trip_id, user_id) : un compte = une place, pas de doublon possible

-- participations : présence sur UNE étape
id, member_id, stage_id, date_start, date_end, created_at
-- unique(member_id, stage_id) ; les dates sont celles du croisement

-- messages : messagerie par étape
id, stage_id, author_id, content, created_at

-- photos : album photo par étape
id, stage_id, author_id, url, storage_path, created_at

-- notifications : notifications in-app (alimentée par triggers uniquement)
id, user_id, trip_id, stage_id, actor_id, type, payload, read_at, created_at

-- activities : idées proposées par le groupe, rattachées à une étape
id, trip_id, stage_id, author_id, title, description,
scheduled_on, status (proposed|scheduled|rejected), created_at
-- seul l'organisateur peut renseigner scheduled_on/status : trigger guard_activity_update

-- activity_votes : un pouce par personne et par activité
activity_id, user_id, created_at  -- clé primaire composée
```

## Sécurité — règles à ne pas casser
- **RLS activée sur les 8 tables.** Toute vérification inter-tables passe par une fonction `SECURITY DEFINER` (`is_trip_owner`, `is_approved_member`, `stage_trip_id`, `shares_trip_with`…) : une policy qui lit directement une autre table protégée part en récursion.
- **`messages` et `photos` : lecture ET écriture réservées aux membres `approved`.** C'est la règle produit centrale.
- **Aucun accès public direct aux tables.** La page publique d'un trip passe par la fonction `get_public_trip(slug)` et la recherche par code par `find_trip_by_code(code)` — sinon n'importe qui pourrait énumérer tous les trips avec la clé anon.
- **Le contrôle d'accès au dashboard est côté serveur** (`app/dashboard/[slug]/page.tsx` compare `owner_id` à l'utilisateur). Ne jamais le redescendre côté client.
- **`proxy.ts`** rafraîchit la session à chaque navigation et bloque `/dashboard`, `/creer`, `/compte` sans session. Utiliser `getUser()`, jamais `getSession()`, côté serveur.
- Un membre ne peut pas modifier son propre `status` : le trigger `guard_member_update` le refuse.
- `getCurrentProfile()` recrée le profil s'il manque : un compte sans ligne dans `profiles` faisait échouer toutes les écritures sur une violation de clé étrangère.

## Structure des fichiers
```
proxy.ts                        # Session + garde des routes protégées
lib/
  supabase/client.ts            # Client navigateur
  supabase/server.ts            # Client Server Components / routes
  supabase/middleware.ts        # updateSession(), utilisé par proxy.ts
  auth.ts                       # getCurrentProfile(), authUrl()
  dates.ts                      # computeOverlaps() — cœur du calcul de croisement
  types.ts, ui.ts               # Types partagés, design tokens
components/
  Landing.tsx, CodeEntry.tsx    # Accueil déconnecté, saisie du code
  TopBar.tsx, NotificationBell.tsx
  JoinFlow.tsx                  # Dates → étapes pré-cochées → demande
  StagePanel.tsx                # Discussion + album + activités + aperçu photo
  DayPanel.tsx                  # Panneau latéral d'une journée du planning
  ActivityList.tsx              # Liste votable + formulaire de proposition
  SessionSync.tsx               # Recharge quand le compte connecté change
  TripMap.tsx, ShareButton.tsx
app/
  page.tsx                      # Landing si déconnecté, "Mes trips" sinon
  auth/                         # Connexion / inscription / mot de passe oublié
  auth/callback/                # Échange du code des liens mail contre une session
  auth/reset/                   # Choix d'un nouveau mot de passe
  creer/                        # Création de trip
  compte/                       # Profil, déconnexion
  trip/[slug]/                  # Page publique du trip
  dashboard/[slug]/             # Organisateur : MembersTab, StagesTab, PlanningTab
  stage/[stageId]/              # Messagerie realtime + album (membres validés)
  api/geocode/                  # Proxy Nominatim (User-Agent exigé côté serveur)
```

## Flows utilisateur
1. **Créateur** : / → "Créer mon trip" → inscription → /creer → /dashboard/[slug] → ajoute les étapes → partage le code
2. **Participant** : / → entre le code → /trip/[slug] (détails visibles sans compte) → "Je viens" → inscription → dates → étapes pré-cochées, il décoche → demande en `pending`
3. **Validation** : l'organisateur reçoit une notif in-app → onglet Potes → Valider → le pote passe `approved`
4. **Accès débloqué** : le pote validé ouvre chaque étape → messagerie realtime + album photo
5. **Planning** : onglet Planning du dashboard, ouvert par défaut → frise jour par jour
6. **Étapes** : sur écran large, deux colonnes — étapes modifiables à gauche, discussion et album de l'étape choisie à droite. Sous 1024 px, on navigue vers `/stage/[id]`.
7. **Ses dates** : organisateur comme pote validé peuvent (re)déclarer leurs dates depuis la page du trip — même écran `JoinFlow`, en mode édition

## Décisions techniques importantes
- Next.js 16 : `params` et `searchParams` sont des Promises (`await` obligatoire)
- Convention `proxy.ts` (l'ancienne `middleware.ts` est dépréciée en Next 16)
- Leaflet est chargé par `import()` dans un `useEffect` (la lib touche `window` au chargement)
- Le lint embarque les règles du compilateur React : pas de `setState` synchrone dans un effet, pas d'accès à une fonction déclarée plus bas. Charger l'état initial côté serveur et le passer en prop.
- **Étapes : `[arrivée, départ)`.** Le jour de départ reste libre pour l'étape suivante — Biarritz 28→29 puis Bayonne 29→31 est valide, les deux sur 28→29 ne l'est pas. Vérifié côté client (`stageSpan`/`spansOverlap`) *et* par le trigger `check_stage_overlap`, qui renvoie un message préfixé `CHEVAUCHEMENT|`.
- **Les canaux Realtime portent un suffixe aléatoire par instance** : deux composants abonnés au même sujet feraient échouer le second `.on()` après `subscribe()`.
- **L'organisateur est inscrit d'office sur chaque étape créée** (trigger `add_owner_participation`) et peut se retirer depuis l'onglet Étapes.
- **Ne jamais utiliser `toISOString()` pour produire une date YYYY-MM-DD** : il convertit en UTC et décale d'un jour toute date à minuit heure française. Passer par `iso()` de `lib/dates.ts`, qui lit les composantes locales.
- Tuiles de carte : fond sombre **Esri** (`World_Dark_Gray_Base`), gratuit et sans clé. Les tuiles CARTO exigent une clé API depuis 2024.
- Géocodage via OSM Nominatim, proxifié par `/api/geocode` (User-Agent impossible à définir depuis le navigateur, et évite l'abus côté client)
- Les fichiers sont écrits en UTF-8 ; ne jamais éditer `.env.local` avec le Bloc-notes Windows (il l'enregistre en UTF-16 et Next l'ignore silencieusement)

## Design system
- Fond principal : #0e1409 · Fond carte : #141a0e · Carte 2 : #1a2212
- Vert principal : #2d4a1e · Accent : #8fb840
- Texte : #e8e4d9 · Muet : #7a8a6a · Estompé : #4a5a3a
- Mobile-first, bordures arrondies, pas de Tailwind. Tokens dans `lib/ui.ts`.
- Les `<input>` font 16px minimum : en dessous, iOS zoome automatiquement au focus.

## Ce qui reste à faire
- [ ] Notifications email (Resend) en complément des notifs in-app
- [ ] Décider de la confirmation d'email à l'inscription (désactivée aujourd'hui : n'importe qui peut s'inscrire avec l'adresse d'un autre)
- [ ] Changement de mot de passe depuis `/compte` (aujourd'hui uniquement via « mot de passe oublié »)
- [ ] Co-organisateurs (le schéma `trip_members.role` est déjà prêt)
- [ ] Croisement pote ↔ pote (« toi et Théo à Biarritz du 15 au 17 »)
- [ ] Activités visibles sur la page publique du trip (aujourd'hui réservées aux membres validés)
- [ ] Tests e2e
- [ ] PWA (manifest, service worker)
