-- Rivaal-systeem: comparison-gedreven speelsters mogen elkaar uitdagen op
-- een gedeeld Recordboek-doel. Puur een privé weergavelaag bovenop de
-- bestaande, niet-vergelijkende Recordboek-opzet — er verandert niets aan
-- de punten- of bonuslogica in submit_training().
--
-- Let op over "privé tussen de twee" (basisregel 5): dit project heeft geen
-- echte per-speler login (bewust — zie eerdere beslissing), dus elke
-- ingelogde sessie is voor de database een gelijkwaardig teamlid, net als nu
-- al geldt voor trainingen, doelen en persoonlijke records (die zijn nu al
-- voor iedereen leesbaar). Privacy wordt daarom net als de rest van de app
-- op UI-niveau gehouden: elke speler ziet in het scherm alleen haar eigen
-- rivaliteiten. Dat is geen achteruitgang t.o.v. de rest van de app, maar
-- wel iets anders dan een harde databasegarantie — vraag het gerust na als
-- dat niet volstaat.

create table if not exists rivalries (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null references exercises (id),
  player_a uuid not null references players (id) on delete cascade,
  player_a_assignment_id uuid not null,
  player_b uuid not null references players (id) on delete cascade,
  player_b_assignment_id uuid not null,
  proposed_by uuid not null references players (id) on delete cascade,
  status text not null default 'voorgesteld' check (status in ('voorgesteld', 'actief')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint rivalries_distinct_players check (player_a <> player_b)
);

alter table rivalries enable row level security;

-- Zelfde openheid als trainingen/doelen/records: iedereen mag lezen, de UI
-- toont alleen de eigen rivaliteiten. Schrijven gaat uitsluitend via de
-- functies hieronder.
drop policy if exists "rivalries_select" on rivalries;
create policy "rivalries_select" on rivalries for select to authenticated using (true);

-- ---------------------------------------------------------------
-- propose_rivalry: alleen mogelijk als beiden op dit moment hetzelfde doel
-- hebben; slaat de doel-toewijzing van dat moment vast, zodat een latere
-- doelwissel (bij wie dan ook) de rivaliteit automatisch laat vervallen
-- (zie de trigger onderaan).
-- ---------------------------------------------------------------
create or replace function public.propose_rivalry(p_from_player_id uuid, p_to_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from record;
  v_to record;
  v_existing uuid;
  v_id uuid;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;
  if p_from_player_id = p_to_player_id then
    raise exception 'Je kunt geen rivaliteit met jezelf aangaan';
  end if;

  select exercise_id, assignment_id into v_from from goals where player_id = p_from_player_id;
  select exercise_id, assignment_id into v_to from goals where player_id = p_to_player_id;

  if v_from.exercise_id is null or v_to.exercise_id is null then
    raise exception 'Jullie moeten allebei een doel gekozen hebben';
  end if;
  if v_from.exercise_id <> v_to.exercise_id then
    raise exception 'Jullie moeten hetzelfde doel hebben om een rivaliteit aan te gaan';
  end if;

  select id into v_existing from rivalries
    where status in ('voorgesteld', 'actief')
      and (
        (player_a = p_from_player_id and player_b = p_to_player_id
          and player_a_assignment_id = v_from.assignment_id and player_b_assignment_id = v_to.assignment_id)
        or
        (player_a = p_to_player_id and player_b = p_from_player_id
          and player_a_assignment_id = v_to.assignment_id and player_b_assignment_id = v_from.assignment_id)
      )
    limit 1;
  if v_existing is not null then
    raise exception 'Er loopt al een rivaliteit tussen jullie voor dit doel';
  end if;

  insert into rivalries (exercise_id, player_a, player_a_assignment_id, player_b, player_b_assignment_id, proposed_by, status)
    values (v_from.exercise_id, p_from_player_id, v_from.assignment_id, p_to_player_id, v_to.assignment_id, p_from_player_id, 'voorgesteld')
    returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.propose_rivalry(uuid, uuid) from public;
grant execute on function public.propose_rivalry(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- respond_rivalry: de uitgedaagde speler accepteert of wijst af. De
-- voorsteller zelf kan hier niet op reageren (die trekt in via end_rivalry).
-- ---------------------------------------------------------------
create or replace function public.respond_rivalry(p_rivalry_id uuid, p_player_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_riv record;
  v_a_assignment uuid;
  v_b_assignment uuid;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select * into v_riv from rivalries where id = p_rivalry_id;
  if v_riv.id is null then
    raise exception 'Rivaliteit niet gevonden';
  end if;
  if v_riv.status <> 'voorgesteld' then
    raise exception 'Deze rivaliteit staat niet meer open';
  end if;
  if p_player_id <> v_riv.player_a and p_player_id <> v_riv.player_b then
    raise exception 'Dit voorstel is niet voor jou';
  end if;
  if p_player_id = v_riv.proposed_by then
    raise exception 'Je kunt je eigen voorstel niet beantwoorden — trek het in als je van gedachten bent veranderd';
  end if;

  if not p_accept then
    delete from rivalries where id = p_rivalry_id;
    return;
  end if;

  select assignment_id into v_a_assignment from goals where player_id = v_riv.player_a;
  select assignment_id into v_b_assignment from goals where player_id = v_riv.player_b;
  if v_a_assignment is distinct from v_riv.player_a_assignment_id or v_b_assignment is distinct from v_riv.player_b_assignment_id then
    delete from rivalries where id = p_rivalry_id;
    raise exception 'Een van jullie heeft ondertussen een ander doel gekozen — dit voorstel is vervallen';
  end if;

  update rivalries set status = 'actief', accepted_at = now() where id = p_rivalry_id;
end;
$$;

revoke all on function public.respond_rivalry(uuid, uuid, boolean) from public;
grant execute on function public.respond_rivalry(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------
-- end_rivalry: beide betrokkenen kunnen een openstaand voorstel intrekken
-- of een actieve rivaliteit op elk moment vrijwillig beëindigen.
-- ---------------------------------------------------------------
create or replace function public.end_rivalry(p_rivalry_id uuid, p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_riv record;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select * into v_riv from rivalries where id = p_rivalry_id;
  if v_riv.id is null then
    return;
  end if;
  if p_player_id <> v_riv.player_a and p_player_id <> v_riv.player_b then
    raise exception 'Dit is niet jouw rivaliteit';
  end if;

  delete from rivalries where id = p_rivalry_id;
end;
$$;

revoke all on function public.end_rivalry(uuid, uuid) from public;
grant execute on function public.end_rivalry(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- Automatisch vervallen zodra een van beiden een nieuw doel kiest
-- (basisregel 7/8) — ongeacht of dat via set_goal() handmatig gebeurt.
-- ---------------------------------------------------------------
create or replace function public.expire_rivalries_on_goal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from rivalries
    where (player_a = new.player_id and player_a_assignment_id is distinct from new.assignment_id)
       or (player_b = new.player_id and player_b_assignment_id is distinct from new.assignment_id);
  return new;
end;
$$;

drop trigger if exists trg_expire_rivalries_on_goal_change on goals;
create trigger trg_expire_rivalries_on_goal_change
  after insert or update on goals
  for each row
  execute function public.expire_rivalries_on_goal_change();
