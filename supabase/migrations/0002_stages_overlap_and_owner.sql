-- ============================================================================
-- RoadTrip App — 0002 : chevauchement d'étapes et présence de l'organisateur
-- ============================================================================
-- Non destructif. Coller dans Supabase → SQL Editor → Run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Deux étapes ne peuvent pas occuper les mêmes jours
-- ----------------------------------------------------------------------------
-- Convention : date_end est le jour du DÉPART, il reste donc libre pour
-- l'étape suivante. Biarritz 28→29 puis Bayonne 29→31 est valide ; les deux
-- sur 28→29 ne l'est pas. En intervalle : [date_start, date_end).
--
-- greatest(date_end, date_start + 1) donne son épaisseur à une étape d'un seul
-- jour (28→28), qui serait sinon un intervalle vide n'entrant en conflit avec
-- rien.

create or replace function public.stage_span(p_start date, p_end date)
returns daterange language sql immutable as $fn$
  select daterange(p_start, greatest(p_end, p_start + 1), '[)');
$fn$;

create or replace function public.check_stage_overlap()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_other record;
begin
  if new.date_start is null or new.date_end is null then
    return new;
  end if;

  select s.name, s.date_start, s.date_end
    into v_other
  from stages s
  where s.roadtrip_id = new.roadtrip_id
    and s.id is distinct from new.id
    and s.date_start is not null
    and s.date_end is not null
    and public.stage_span(s.date_start, s.date_end)
        && public.stage_span(new.date_start, new.date_end)
  order by s.date_start
  limit 1;

  if found then
    -- Le préfixe permet au client de reconnaître ce cas et de le reformuler.
    raise exception 'CHEVAUCHEMENT|%|%|%', v_other.name, v_other.date_start, v_other.date_end;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_check_stage_overlap on public.stages;
create trigger trg_check_stage_overlap
  before insert or update of date_start, date_end, roadtrip_id on public.stages
  for each row execute function public.check_stage_overlap();


-- ----------------------------------------------------------------------------
-- 2. L'organisateur participe d'office aux étapes qu'il crée
-- ----------------------------------------------------------------------------
-- Il organise, donc il est du voyage par défaut. Il peut se retirer d'une
-- étape ensuite : on ne le remet jamais d'office sur une étape existante.

create or replace function public.add_owner_participation()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_member uuid;
begin
  if new.date_start is null or new.date_end is null then
    return new;
  end if;

  select m.id into v_member
  from trip_members m
  where m.trip_id = new.roadtrip_id and m.role = 'owner'
  limit 1;

  if v_member is null then
    return new;
  end if;

  insert into participations (member_id, stage_id, date_start, date_end)
  values (v_member, new.id, new.date_start, new.date_end)
  on conflict (member_id, stage_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists trg_add_owner_participation on public.stages;
create trigger trg_add_owner_participation
  after insert on public.stages
  for each row execute function public.add_owner_participation();

-- Une étape créée sans dates n'a pas pu inscrire l'organisateur : on rattrape
-- au moment où les dates apparaissent, sans écraser un retrait volontaire.
create or replace function public.sync_owner_participation()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_member uuid;
begin
  select m.id into v_member
  from trip_members m
  where m.trip_id = new.roadtrip_id and m.role = 'owner'
  limit 1;

  if v_member is null or new.date_start is null or new.date_end is null then
    return new;
  end if;

  if old.date_start is null or old.date_end is null then
    insert into participations (member_id, stage_id, date_start, date_end)
    values (v_member, new.id, new.date_start, new.date_end)
    on conflict (member_id, stage_id) do nothing;
  else
    -- Les dates de l'étape bougent : celles de l'organisateur suivent.
    update participations
       set date_start = new.date_start, date_end = new.date_end
     where member_id = v_member and stage_id = new.id;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_sync_owner_participation on public.stages;
create trigger trg_sync_owner_participation
  after update of date_start, date_end on public.stages
  for each row execute function public.sync_owner_participation();


-- ----------------------------------------------------------------------------
-- 3. Rattrapage sur les trips existants
-- ----------------------------------------------------------------------------
insert into participations (member_id, stage_id, date_start, date_end)
select m.id, s.id, s.date_start, s.date_end
from stages s
join trip_members m on m.trip_id = s.roadtrip_id and m.role = 'owner'
where s.date_start is not null
  and s.date_end is not null
on conflict (member_id, stage_id) do nothing;


-- ----------------------------------------------------------------------------
-- 4. Comptes sans profil
-- ----------------------------------------------------------------------------
-- Le trigger handle_new_user ne s'applique qu'aux nouvelles inscriptions. Un
-- compte cree avant, ou survivant a une migration rejouee, se retrouve sans
-- ligne dans profiles : toutes ses ecritures echouent alors sur une violation
-- de cle etrangere. On rattrape les orphelins.
insert into public.profiles (id, display_name, email)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    split_part(u.email, '@', 1),
    'Voyageur'
  ),
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
