# RoadTrip App — Contexte projet pour Claude Code

## Description
Application web permettant de créer et organiser des roadtrips collaboratifs. Le créateur ajoute des étapes, génère un lien/code unique, et ses amis peuvent rejoindre et indiquer leurs disponibilités avec calcul automatique des chevauchements de dates.

## Stack technique
- **Framework** : Next.js 16.3.1 (App Router, Turbopack)
- **Base de données** : Supabase (PostgreSQL + Realtime + Storage)
- **Styling** : CSS-in-JS avec variables CSS (design system vert foncé/kaki)
- **Hébergement** : Vercel
- **Repo** : github.com/guselbov/roadtrip-app
- **URL prod** : roadtrip-app-vercel.vercel.app

## Supabase
- **URL** : https://rzmdjmuiburllzylrvxe.supabase.co
- **Clé anon** : sb_publishable_7WkLFBfiAjFG8jXbs_WDmA_SAUcJekb
- **Storage bucket** : trip-photos (public)

## Schéma base de données
```sql
-- roadtrips : trips créés
id, slug (unique), code (6 chars lisible ex: SURF26), title, description,
creator_email, date_start, date_end, status, created_at

-- stages : étapes du trip
id, roadtrip_id, name, description, lat, lng,
date_start, date_end, order_index, type, color, created_at

-- participants : potes inscrits
id, roadtrip_id, name, email, token (UUID unique), created_at

-- participations : inscription à une étape
id, participant_id, stage_id, date_start, date_end,
overlap_start, overlap_end, status (pending/approved/rejected), message, created_at

-- messages : messagerie par étape
id, stage_id, author, content, created_at

-- photos : album photo par étape
id, stage_id, participant_name, url, created_at
```

## Structure des fichiersapp/
page.tsx # Onboarding : créer ou rejoindre un trip
trip/[slug]/
page.tsx # Page publique du trip
JoinSection.tsx # Formulaire participation (bottom sheet)
ShareButton.tsx # Bouton partage natif
AdminSwitch.tsx # Bouton accès admin avec mot de passe
StagesSection.tsx # Gestion étapes (admin uniquement)
dashboard/[slug]/
page.tsx # Dashboard admin
DashboardClient.tsx # Logique dashboard (participations, étapes, messages)
CopyCodeButton.tsx # Bouton copier le code
stage/[stageId]/
page.tsx # Page étape (messagerie + album)
StageClient.tsx # Messagerie realtime + album photo
participant/[token]/
page.tsx # Page personnelle du pote (ses étapes confirmées)
lib/
supabase.ts # Client Supabase (valeurs hardcodées)
## Flows utilisateur
1. **Créateur** : / → "Je crée un trip" → formulaire → /dashboard/[slug]
2. **Participant** : / → "Je rejoins un trip" → entre code (ex: SURF26) → /trip/[slug]
3. **Participation** : /trip/[slug] → "Je viens !" → bottom sheet → dates → chevauchements calculés → pending
4. **Validation** : /dashboard/[slug] → onglet Participations → Valider → pote confirmé
5. **Lien pote** : dashboard → "Copier son lien" → /participant/[token] → ses étapes + messagerie
6. **Messagerie** : /stage/[stageId] → choisir son prénom → messages realtime + photos

## Décisions techniques importantes
- Les fichiers sont écrits via PowerShell avec [System.IO.File]::WriteAllText() car le Bloc-notes Windows corrompt les guillemets
- Next.js 16 : params doit être await-é (params: Promise<{ slug: string }>)
- Leaflet doit être importé en dynamic avec { ssr: false }
- Mot de passe admin : sudouest2026 (hardcodé dans AdminSwitch.tsx)
- Realtime Supabase activé sur tables messages et photos
- Géocodage via OSM Nominatim (gratuit, pas de clé API)

## Design system
- Fond principal : #0e1409 (vert très foncé)
- Fond carte : #141a0e
- Vert principal : #2d4a1e
- Accent vert clair : #8fb840
- Texte : #e8e4d9
- Texte muet : #7a8a6a
- Style : mobile-first, bordures arrondies, pas de Tailwind (CSS-in-JS inline)

## Ce qui reste à faire
- [ ] Déploiement complet sur Vercel avec toutes les nouvelles pages
- [ ] Notifications (badge quand nouvelle participation en attente)
- [ ] Page profil pote plus riche
- [ ] Carte Leaflet sur la page publique
- [ ] Tests e2e
- [ ] PWA (manifest, service worker)
