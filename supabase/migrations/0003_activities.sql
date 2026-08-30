-- ============================================================================
-- RoadTrip App — 0003 : activités proposées et votées
-- ============================================================================
-- Non destructif. Coller dans Supabase → SQL Editor → Run.
--
-- Une activité naît rattachée à une étape, sans date. Le groupe vote d'un
-- pouce. L'organisateur retient celles qu'il veut et les cale sur une journée.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table if not exists public.activities (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.roadtrips(id) on delete cascade,
  stage_id     uuid references public.stages(id) on delete set null,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 80),
  description  text check (description is null or char_length(description) <= 500),
  scheduled_on date,
  status       text not null default 'proposed' check (status in ('proposed','scheduled','rejected')),
  created_at   timestamptz not null default now(),
  -- Une activité programmée porte forcément une date, et inversement.
  check ((status = 'scheduled') = (scheduled_on is not null))
);

create table if not exists public.activity_votes (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index if not exists activities_trip_idx     on public.activities (trip_id, status);
create index if not exists activities_stage_idx    on public.activities (stage_id);
create index if not exists activities_day_idx      on public.activities (trip_id, scheduled_on);
create index if not exists activity_votes_act_idx  on public.activity_votes (activity_id);


-- ----------------------------------------------------------------------------
-- 2. Helper
-- ----------------------------------------------------------------------------
create or replace function public.activity_trip_id(p_activity uuid)
returns uuid language sql stable security definer set search_path = public as $fn$
  select a.trip_id from activities a where a.id = p_activity;
$fn$;


-- ----------------------------------------------------------------------------
-- 3. Seul l'organisateur programme
-- ----------------------------------------------------------------------------
-- L'auteur peut corriger son intitulé, pas décider que son idée est retenue.
create or replace function public.guard_activity_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_trip_owner(new.trip_id) then
    if new.status is distinct from old.status
       or new.scheduled_on is distinct from old.scheduled_on
       or new.trip_id is distinct from old.trip_id then
      raise exception 'Seul l''organisateur peut programmer une activité';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_guard_activity_update on public.activities;
create trigger trg_guard_activity_update
  before update on public.activities
  for each row execute function public.guard_activity_update();


-- ----------------------------------------------------------------------------
-- 4. Notifications
-- ----------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'join_request','join_approved','join_rejected',
    'new_message','new_photo',
    'new_activity','activity_scheduled'
  ));

create or replace function public.notify_new_activity()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_owner uuid;
begin
  select owner_id into v_owner from roadtrips where id = new.trip_id;
  if v_owner is not null and v_owner <> new.author_id then
    insert into notifications (user_id, trip_id, stage_id, type, actor_id, payload)
    values (v_owner, new.trip_id, new.stage_id, 'new_activity', new.author_id,
            jsonb_build_object('title', new.title));
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_notify_new_activity on public.activities;
create trigger trg_notify_new_activity
  after insert on public.activities
  for each row execute function public.notify_new_activity();

-- Une idée retenue : on prévient tout le monde sauf celui qui l'a retenue.
create or replace function public.notify_activity_scheduled()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'scheduled' and old.status is distinct from 'scheduled' then
    insert into notifications (user_id, trip_id, stage_id, type, actor_id, payload)
    select m.user_id, new.trip_id, new.stage_id, 'activity_scheduled', auth.uid(),
           jsonb_build_object('title', new.title, 'day', new.scheduled_on)
    from trip_members m
    where m.trip_id = new.trip_id
      and m.status = 'approved'
      and m.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_notify_activity_scheduled on public.activities;
create trigger trg_notify_activity_scheduled
  after update on public.activities
  for each row execute function public.notify_activity_scheduled();


-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
alter table public.activities     enable row level security;
alter table public.activity_votes enable row level security;

drop policy if exists activities_select on public.activities;
drop policy if exists activities_insert on public.activities;
drop policy if exists activities_update on public.activities;
drop policy if exists activities_delete on public.activities;

-- Comme la messagerie : réservé aux membres validés.
create policy activities_select on public.activities for select to authenticated
  using (public.is_approved_member(trip_id));

create policy activities_insert on public.activities for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_approved_member(trip_id)
    and status = 'proposed'
    and scheduled_on is null
  );

create policy activities_update on public.activities for update to authenticated
  using (author_id = auth.uid() or public.is_trip_owner(trip_id))
  with check (author_id = auth.uid() or public.is_trip_owner(trip_id));

create policy activities_delete on public.activities for delete to authenticated
  using (author_id = auth.uid() or public.is_trip_owner(trip_id));

drop policy if exists activity_votes_select on public.activity_votes;
drop policy if exists activity_votes_insert on public.activity_votes;
drop policy if exists activity_votes_delete on public.activity_votes;

create policy activity_votes_select on public.activity_votes for select to authenticated
  using (public.is_approved_member(public.activity_trip_id(activity_id)));

create policy activity_votes_insert on public.activity_votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_approved_member(public.activity_trip_id(activity_id))
  );

create policy activity_votes_delete on public.activity_votes for delete to authenticated
  using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 6. Realtime
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.activity_votes;
