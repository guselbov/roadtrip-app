-- ============================================================================
-- RoadTrip App — Schéma v2 : comptes, rôles et sécurité
-- ============================================================================
-- ATTENTION — DESTRUCTIF : ce script supprime les tables existantes et leurs
-- données. À n'exécuter que sur la base de test (données fictives confirmées).
-- Coller dans Supabase → SQL Editor → Run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Table rase
-- ----------------------------------------------------------------------------
drop table if exists public.photos          cascade;
drop table if exists public.messages        cascade;
drop table if exists public.participations  cascade;
drop table if exists public.participants    cascade;
drop table if exists public.notifications   cascade;
drop table if exists public.trip_members    cascade;
drop table if exists public.stages          cascade;
drop table if exists public.roadtrips       cascade;
drop table if exists public.profiles        cascade;


-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- Identité applicative. Le display_name d'ici est le SEUL nom affiché dans
-- l'app : plus aucun champ texte libre, donc plus d'usurpation possible.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  email        text,
  created_at   timestamptz not null default now()
);

create table public.roadtrips (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  slug        text not null unique,
  code        text not null unique,
  title       text not null check (char_length(trim(title)) between 1 and 80),
  description text,
  date_start  date,
  date_end    date,
  status      text not null default 'planning' check (status in ('planning','live','done')),
  created_at  timestamptz not null default now()
);

create table public.stages (
  id          uuid primary key default gen_random_uuid(),
  roadtrip_id uuid not null references public.roadtrips(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  lat         double precision,
  lng         double precision,
  date_start  date,
  date_end    date,
  order_index integer not null default 0,
  type        text,
  color       text,
  created_at  timestamptz not null default now(),
  check (date_end is null or date_start is null or date_end >= date_start)
);

-- Remplace l'ancienne table `participants`.
-- La contrainte unique tue le bug de doublons : un compte = une place.
create table public.trip_members (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.roadtrips(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member'  check (role   in ('owner','member')),
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  date_start date,
  date_end   date,
  message    text,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id),
  check (date_end is null or date_start is null or date_end >= date_start)
);

-- Une ligne par étape à laquelle le pote participe réellement.
-- date_start/date_end = les jours où il est SUR cette étape (le croisement).
create table public.participations (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.trip_members(id) on delete cascade,
  stage_id   uuid not null references public.stages(id) on delete cascade,
  date_start date not null,
  date_end   date not null,
  created_at timestamptz not null default now(),
  unique (member_id, stage_id),
  check (date_end >= date_start)
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  stage_id   uuid not null references public.stages(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  stage_id     uuid not null references public.stages(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  url          text not null,
  storage_path text,
  created_at   timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  trip_id    uuid references public.roadtrips(id) on delete cascade,
  stage_id   uuid references public.stages(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  type       text not null check (type in ('join_request','join_approved','join_rejected','new_message','new_photo')),
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. Index
-- ----------------------------------------------------------------------------
create index on public.stages         (roadtrip_id, order_index);
create index on public.trip_members   (trip_id, status);
create index on public.trip_members   (user_id);
create index on public.participations (stage_id);
create index on public.participations (member_id);
create index on public.messages       (stage_id, created_at);
create index on public.photos         (stage_id, created_at);
create index on public.notifications  (user_id, read_at, created_at desc);


-- ----------------------------------------------------------------------------
-- 3. Helpers SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- Toutes les vérifications inter-tables passent par ces fonctions. Sans ça,
-- une policy de A qui lit B (dont la policy relit A) part en récursion
-- infinie. SECURITY DEFINER coupe la chaîne.

create or replace function public.is_trip_owner(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from roadtrips r where r.id = p_trip and r.owner_id = auth.uid());
$fn$;

create or replace function public.is_trip_member(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from trip_members m where m.trip_id = p_trip and m.user_id = auth.uid());
$fn$;

create or replace function public.is_approved_member(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from trip_members m
    where m.trip_id = p_trip and m.user_id = auth.uid() and m.status = 'approved'
  );
$fn$;

create or replace function public.stage_trip_id(p_stage uuid)
returns uuid language sql stable security definer set search_path = public as $fn$
  select s.roadtrip_id from stages s where s.id = p_stage;
$fn$;

create or replace function public.member_is_self(p_member uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from trip_members m where m.id = p_member and m.user_id = auth.uid());
$fn$;

create or replace function public.member_trip_id(p_member uuid)
returns uuid language sql stable security definer set search_path = public as $fn$
  select m.trip_id from trip_members m where m.id = p_member;
$fn$;

-- Deux personnes se voient si elles partagent un trip où l'observateur est validé.
create or replace function public.shares_trip_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1
    from trip_members a
    join trip_members b on b.trip_id = a.trip_id
    where a.user_id = auth.uid() and a.status = 'approved'
      and b.user_id = p_user     and b.status in ('approved','pending')
  );
$fn$;


-- ----------------------------------------------------------------------------
-- 4. Accès public sans énumération
-- ----------------------------------------------------------------------------
-- Les détails d'un trip sont visibles de tous — mais uniquement si on connaît
-- le slug ou le code. Avec un `select` public sur roadtrips, n'importe qui
-- pourrait aspirer la liste de tous les trips de tous les utilisateurs.
-- Ces deux fonctions donnent l'accès ciblé sans jamais ouvrir la table.

create or replace function public.get_public_trip(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'id',           r.id,
    'slug',         r.slug,
    'title',        r.title,
    'description',  r.description,
    'date_start',   r.date_start,
    'date_end',     r.date_end,
    'status',       r.status,
    'owner_name',   (select p.display_name from profiles p where p.id = r.owner_id),
    'member_count', (select count(*) from trip_members m where m.trip_id = r.id and m.status = 'approved'),
    'stages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',          s.id,
        'name',        s.name,
        'description', s.description,
        'lat',         s.lat,
        'lng',         s.lng,
        'date_start',  s.date_start,
        'date_end',    s.date_end,
        'order_index', s.order_index,
        'color',       s.color,
        'people', (
          select count(*)
          from participations pa
          join trip_members m2 on m2.id = pa.member_id and m2.status = 'approved'
          where pa.stage_id = s.id
        )
      ) order by s.order_index)
      from stages s where s.roadtrip_id = r.id
    ), '[]'::jsonb)
  )
  from roadtrips r
  where r.slug = p_slug;
$fn$;

create or replace function public.find_trip_by_code(p_code text)
returns text language sql stable security definer set search_path = public as $fn$
  select r.slug from roadtrips r where r.code = upper(trim(p_code));
$fn$;

grant execute on function public.get_public_trip(text)   to anon, authenticated;
grant execute on function public.find_trip_by_code(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Triggers métier
-- ----------------------------------------------------------------------------

-- Un profil naît avec le compte.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Le créateur est membre `owner` / `approved` de son propre trip : tout le
-- reste de l'app raisonne uniquement en termes de trip_members.
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.trip_members (trip_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'approved')
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$fn$;

create trigger on_roadtrip_created
  after insert on public.roadtrips
  for each row execute function public.add_owner_as_member();

-- Un membre peut corriger ses dates, jamais son propre statut.
create or replace function public.guard_member_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_trip_owner(new.trip_id) then
    if new.status is distinct from old.status or new.role is distinct from old.role then
      raise exception 'Seul l''organisateur peut modifier le statut ou le role';
    end if;
  end if;
  return new;
end;
$fn$;

create trigger trg_guard_member_update
  before update on public.trip_members
  for each row execute function public.guard_member_update();


-- ---- Notifications in-app --------------------------------------------------

create or replace function public.notify_join_request()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_owner uuid;
begin
  if new.role = 'owner' then return new; end if;
  select owner_id into v_owner from roadtrips where id = new.trip_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into notifications (user_id, trip_id, type, actor_id)
    values (v_owner, new.trip_id, 'join_request', new.user_id);
  end if;
  return new;
end;
$fn$;

create trigger trg_notify_join_request
  after insert on public.trip_members
  for each row execute function public.notify_join_request();

create or replace function public.notify_member_status()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    insert into notifications (user_id, trip_id, type, actor_id)
    values (new.user_id, new.trip_id, 'join_' || new.status, auth.uid());
  end if;
  return new;
end;
$fn$;

create trigger trg_notify_member_status
  after update on public.trip_members
  for each row execute function public.notify_member_status();

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_trip uuid;
begin
  select roadtrip_id into v_trip from stages where id = new.stage_id;
  insert into notifications (user_id, trip_id, stage_id, type, actor_id)
  select m.user_id, v_trip, new.stage_id, 'new_message', new.author_id
  from trip_members m
  where m.trip_id = v_trip and m.status = 'approved' and m.user_id <> new.author_id;
  return new;
end;
$fn$;

create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

create or replace function public.notify_new_photo()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_trip uuid;
begin
  select roadtrip_id into v_trip from stages where id = new.stage_id;
  insert into notifications (user_id, trip_id, stage_id, type, actor_id)
  select m.user_id, v_trip, new.stage_id, 'new_photo', new.author_id
  from trip_members m
  where m.trip_id = v_trip and m.status = 'approved' and m.user_id <> new.author_id;
  return new;
end;
$fn$;

create trigger trg_notify_new_photo
  after insert on public.photos
  for each row execute function public.notify_new_photo();


-- ----------------------------------------------------------------------------
-- 6. RLS
-- ----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.roadtrips      enable row level security;
alter table public.stages         enable row level security;
alter table public.trip_members   enable row level security;
alter table public.participations enable row level security;
alter table public.messages       enable row level security;
alter table public.photos         enable row level security;
alter table public.notifications  enable row level security;

-- profiles : soi-même, et les gens avec qui on partage un trip
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_trip_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- roadtrips : membres et organisateur. Le grand public passe par get_public_trip().
create policy roadtrips_select on public.roadtrips for select to authenticated
  using (owner_id = auth.uid() or public.is_trip_member(id));
create policy roadtrips_insert on public.roadtrips for insert to authenticated
  with check (owner_id = auth.uid());
create policy roadtrips_update on public.roadtrips for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy roadtrips_delete on public.roadtrips for delete to authenticated
  using (owner_id = auth.uid());

-- stages : lecture pour les membres, écriture pour l'organisateur seul
create policy stages_select on public.stages for select to authenticated
  using (public.is_trip_member(roadtrip_id));
create policy stages_write on public.stages for all to authenticated
  using (public.is_trip_owner(roadtrip_id))
  with check (public.is_trip_owner(roadtrip_id));

-- trip_members : on s'inscrit soi-même en 'pending', l'organisateur valide
create policy members_select on public.trip_members for select to authenticated
  using (user_id = auth.uid() or public.is_trip_owner(trip_id) or public.is_approved_member(trip_id));
create policy members_insert_self on public.trip_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and status = 'pending');
create policy members_update_self on public.trip_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_update_owner on public.trip_members for update to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));
create policy members_delete on public.trip_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner') or public.is_trip_owner(trip_id));

-- participations : chacun gère les siennes, l'organisateur voit tout
create policy participations_select on public.participations for select to authenticated
  using (
    public.member_is_self(member_id)
    or public.is_trip_owner(public.member_trip_id(member_id))
    or public.is_approved_member(public.member_trip_id(member_id))
  );
create policy participations_write on public.participations for all to authenticated
  using (public.member_is_self(member_id) or public.is_trip_owner(public.member_trip_id(member_id)))
  with check (public.member_is_self(member_id) or public.is_trip_owner(public.member_trip_id(member_id)));

-- messages : réservés aux membres VALIDÉS. C'est la règle clé.
create policy messages_select on public.messages for select to authenticated
  using (public.is_approved_member(public.stage_trip_id(stage_id)));
create policy messages_insert on public.messages for insert to authenticated
  with check (author_id = auth.uid() and public.is_approved_member(public.stage_trip_id(stage_id)));
create policy messages_delete on public.messages for delete to authenticated
  using (author_id = auth.uid() or public.is_trip_owner(public.stage_trip_id(stage_id)));

-- photos : même règle
create policy photos_select on public.photos for select to authenticated
  using (public.is_approved_member(public.stage_trip_id(stage_id)));
create policy photos_insert on public.photos for insert to authenticated
  with check (author_id = auth.uid() and public.is_approved_member(public.stage_trip_id(stage_id)));
create policy photos_delete on public.photos for delete to authenticated
  using (author_id = auth.uid() or public.is_trip_owner(public.stage_trip_id(stage_id)));

-- notifications : strictement privées. Aucune insertion cliente : triggers seuls.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 7. Realtime
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.trip_members;


-- ----------------------------------------------------------------------------
-- 8. Storage — bucket trip-photos
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do update set public = true;

drop policy if exists trip_photos_read   on storage.objects;
drop policy if exists trip_photos_upload on storage.objects;
drop policy if exists trip_photos_delete on storage.objects;

create policy trip_photos_read on storage.objects for select
  using (bucket_id = 'trip-photos');
create policy trip_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and owner = auth.uid());
create policy trip_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and owner = auth.uid());
