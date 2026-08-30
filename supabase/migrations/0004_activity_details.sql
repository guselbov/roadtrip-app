-- ============================================================================
-- RoadTrip App — 0004 : lieu, date, heure, adresse et lien sur les activités
-- ============================================================================
-- Non destructif. Coller dans Supabase → SQL Editor → Run.
--
-- Une proposition porte désormais son créneau et son lieu dès le départ.
-- `scheduled_on` disparaît au profit de `starts_on` : une seule date, celle
-- de l'activité, que l'organisateur peut déplacer quand il la retient.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Nouvelles colonnes
-- ----------------------------------------------------------------------------
alter table public.activities
  add column if not exists place     text,
  add column if not exists address   text,
  add column if not exists url       text,
  add column if not exists starts_on date,
  add column if not exists starts_at time;

-- Reprise des activités déjà programmées, s'il y en a.
update public.activities
   set starts_on = scheduled_on
 where starts_on is null and scheduled_on is not null;

alter table public.activities drop constraint if exists activities_check;
alter table public.activities drop column if exists scheduled_on;

-- Un lien doit être une vraie adresse web : sans ce garde-fou, un `javascript:`
-- glissé dans le champ deviendrait cliquable pour tout le groupe.
alter table public.activities drop constraint if exists activities_url_check;
alter table public.activities add constraint activities_url_check
  check (url is null or url ~* '^https?://[^\s]+$');

alter table public.activities drop constraint if exists activities_place_check;
alter table public.activities add constraint activities_place_check
  check (place is null or char_length(trim(place)) between 1 and 120);

alter table public.activities drop constraint if exists activities_address_check;
alter table public.activities add constraint activities_address_check
  check (address is null or char_length(address) <= 200);

drop index if exists activities_day_idx;
create index if not exists activities_day_idx on public.activities (trip_id, starts_on);


-- ----------------------------------------------------------------------------
-- 2. Qui peut modifier quoi
-- ----------------------------------------------------------------------------
-- L'auteur reste maître de sa proposition tant qu'elle n'est pas retenue.
-- Après, c'est le programme du groupe : seul l'organisateur y touche.
create or replace function public.guard_activity_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_trip_owner(new.trip_id) then
    if new.status is distinct from old.status or new.trip_id is distinct from old.trip_id then
      raise exception 'Seul l''organisateur peut retenir ou refuser une activité';
    end if;
    if old.status <> 'proposed' then
      raise exception 'Cette activité est déjà retenue : seul l''organisateur peut la modifier';
    end if;
  end if;
  return new;
end;
$fn$;


-- ----------------------------------------------------------------------------
-- 3. Policy d'insertion
-- ----------------------------------------------------------------------------
-- La condition portait sur scheduled_on, qui n'existe plus.
drop policy if exists activities_insert on public.activities;
create policy activities_insert on public.activities for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_approved_member(trip_id)
    and status = 'proposed'
  );


-- ----------------------------------------------------------------------------
-- 4. Notification : la date vient de starts_on
-- ----------------------------------------------------------------------------
create or replace function public.notify_activity_scheduled()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'scheduled' and old.status is distinct from 'scheduled' then
    insert into notifications (user_id, trip_id, stage_id, type, actor_id, payload)
    select m.user_id, new.trip_id, new.stage_id, 'activity_scheduled', auth.uid(),
           jsonb_build_object('title', new.title, 'day', new.starts_on)
    from trip_members m
    where m.trip_id = new.trip_id
      and m.status = 'approved'
      and m.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$fn$;
