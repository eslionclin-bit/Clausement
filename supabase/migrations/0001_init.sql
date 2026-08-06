-- Het Clausement — initieel databaseschema
-- Zie /root briefing: rolgebaseerde rechten (speelster vs. trainer), en de
-- puntenlogica (record-detectie, bonus max 1x per doel-toewijzing) leeft
-- hier in de database, niet in de client — dat is precies het lek dat de
-- migratie van het artifact af moest dichten.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Kern-tabellen
-- ---------------------------------------------------------------

-- Trainer-allowlist: het e-mailadres van een ingelogde gebruiker moet hier
-- in staan om trainersrechten te krijgen. Beheerd via de Supabase-dashboard
-- (of door een bestaande trainer, zie README) — nooit via de app zelf.
create table if not exists trainers (
  email text primary key
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists exercises (
  id text primary key,
  cat text not null,
  station text not null check (station in ('Net', 'Veld', 'Muur', 'Mat', 'Vrij')),
  name text not null,
  metric text not null,
  higher_is_better boolean not null default true,
  description text not null default '',
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists periods (
  id uuid primary key default gen_random_uuid(),
  number int not null,
  start_date date not null,
  end_date date
);
-- er mag maar 1 actieve (nog niet afgesloten) periode tegelijk bestaan
create unique index if not exists periods_one_active on periods ((end_date is null)) where end_date is null;

create table if not exists team_goal (
  id boolean primary key default true check (id),
  target int
);

create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  entered_by text,
  entered_at timestamptz,
  updated_by text,
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists training_scores (
  training_id uuid not null references trainings (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  openingsspel int not null default 0,
  doel int not null default 0,
  doel_raw numeric,
  wedstrijd text not null default '',
  primary key (training_id, player_id)
);

create table if not exists goals (
  player_id uuid primary key references players (id) on delete cascade,
  exercise_id text references exercises (id),
  exercise_name text,
  chosen_at date,
  assignment_id uuid
);

create table if not exists goal_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  exercise_id text,
  exercise_name text,
  chosen_at date,
  assignment_id uuid,
  ended_at date not null default current_date
);

create table if not exists personal_records (
  player_id uuid not null references players (id) on delete cascade,
  exercise_id text not null references exercises (id),
  value numeric not null,
  primary key (player_id, exercise_id)
);

create table if not exists cycle_bonuses (
  player_id uuid not null references players (id) on delete cascade,
  assignment_id uuid not null,
  primary key (player_id, assignment_id)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_name text,
  action text not null check (action in ('aangemaakt', 'gewijzigd', 'verwijderd')),
  training_date date not null,
  summary jsonb not null default '[]'::jsonb,
  previous_summary jsonb
);

-- ---------------------------------------------------------------
-- Rolcontrole
-- ---------------------------------------------------------------
create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from trainers t
    where lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '__none__'))
  );
$$;

create or replace function public.am_i_trainer()
returns boolean
language sql
stable
as $$
  select public.is_trainer();
$$;

revoke all on function public.is_trainer() from public;
grant execute on function public.am_i_trainer() to authenticated;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table trainers enable row level security;
alter table players enable row level security;
alter table exercises enable row level security;
alter table periods enable row level security;
alter table team_goal enable row level security;
alter table trainings enable row level security;
alter table training_scores enable row level security;
alter table goals enable row level security;
alter table goal_history enable row level security;
alter table personal_records enable row level security;
alter table cycle_bonuses enable row level security;
alter table audit_log enable row level security;

-- trainers: nergens direct leesbaar/schrijfbaar; alleen is_trainer() (security
-- definer) mag erin kijken. Beheer via het Supabase-dashboard.

-- players: namen zijn niet gevoelig en moeten al zichtbaar zijn vóórdat er
-- een sessie bestaat (het inlogscherm toont de naamknoppen) — dus ook voor
-- de anonieme rol leesbaar. Alle overige tabellen (scores, records, etc.)
-- blijven wel achter een sessie. Alleen trainer mag toevoegen/verwijderen.
create policy "players_select" on players for select to public using (true);
create policy "players_write" on players for all to authenticated
  using (is_trainer()) with check (is_trainer());

-- exercises: iedereen leest; alleen trainer mag eigen oefeningen (is_custom)
-- toevoegen/wijzigen/verwijderen. De 48 basisoefeningen (is_custom = false)
-- blijven altijd vast, ook voor de trainer.
create policy "exercises_select" on exercises for select to authenticated using (true);
create policy "exercises_write" on exercises for all to authenticated
  using (is_trainer() and is_custom) with check (is_trainer() and is_custom);

-- periodes: iedereen leest; schrijven gaat uitsluitend via de close_period()
-- functie hieronder (geen directe insert/update policy nodig).
create policy "periods_select" on periods for select to authenticated using (true);

-- teamdoel: iedereen leest; alleen trainer stelt het in.
create policy "team_goal_select" on team_goal for select to authenticated using (true);
create policy "team_goal_write" on team_goal for all to authenticated
  using (is_trainer()) with check (is_trainer());

-- trainingen & scores: iedereen leest; schrijven gaat uitsluitend via
-- submit_training()/delete_training() zodat record-detectie, bonuslogica en
-- het logboek altijd server-side en consistent gebeuren.
create policy "trainings_select" on trainings for select to authenticated using (true);
create policy "training_scores_select" on training_scores for select to authenticated using (true);

-- doelen & doel-geschiedenis: iedereen leest; schrijven uitsluitend via set_goal().
create policy "goals_select" on goals for select to authenticated using (true);
create policy "goal_history_select" on goal_history for select to authenticated using (true);

-- persoonlijke records & cyclusbonussen: iedereen leest (nodig voor de live
-- preview bij het invoeren); schrijven uitsluitend via submit_training().
create policy "personal_records_select" on personal_records for select to authenticated using (true);
create policy "cycle_bonuses_select" on cycle_bonuses for select to authenticated using (true);

-- logboek: uitsluitend zichtbaar voor de trainer (fraudecontrole); schrijven
-- uitsluitend via submit_training()/delete_training().
create policy "audit_log_select" on audit_log for select to authenticated using (is_trainer());

-- ---------------------------------------------------------------
-- submit_training: training aanmaken/bijwerken, inclusief record-detectie,
-- cyclusbonus (max 1x per doel-toewijzing) en logboekregel.
-- ---------------------------------------------------------------
create or replace function public.submit_training(p_date date, p_entries jsonb, p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_training_id uuid;
  v_prev_summary jsonb;
  v_entry jsonb;
  v_player_id uuid;
  v_openingsspel int;
  v_doel_raw numeric;
  v_wedstrijd text;
  v_exercise_id text;
  v_assignment_id uuid;
  v_higher_is_better boolean;
  v_prev_record numeric;
  v_bonus_used boolean;
  v_doel int;
  v_any_record boolean := false;
  v_summary jsonb := '[]'::jsonb;
  v_action text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select id into v_training_id from trainings where date = p_date;

  if v_training_id is null then
    insert into trainings (date, entered_by, entered_at) values (p_date, p_actor, now())
      returning id into v_training_id;
    v_action := 'aangemaakt';
  else
    select coalesce(jsonb_agg(jsonb_build_object(
        'name', p.name, 'openingsspel', ts.openingsspel, 'doel', ts.doel, 'wedstrijd', ts.wedstrijd
      )), '[]'::jsonb)
      into v_prev_summary
      from training_scores ts join players p on p.id = ts.player_id
      where ts.training_id = v_training_id
        and (ts.openingsspel > 0 or ts.doel > 0 or coalesce(ts.wedstrijd, '') <> '');
    update trainings set updated_by = p_actor, updated_at = now() where id = v_training_id;
    v_action := 'gewijzigd';
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_player_id := (v_entry ->> 'player_id')::uuid;
    v_openingsspel := coalesce((v_entry ->> 'openingsspel')::int, 0);
    v_wedstrijd := coalesce(v_entry ->> 'wedstrijd', '');
    v_doel_raw := nullif(v_entry ->> 'doel_raw', '')::numeric;
    v_doel := 0;
    v_exercise_id := null;
    v_assignment_id := null;

    if v_doel_raw is not null then
      select g.exercise_id, g.assignment_id into v_exercise_id, v_assignment_id
        from goals g where g.player_id = v_player_id;

      if v_exercise_id is not null then
        select e.higher_is_better into v_higher_is_better from exercises e where e.id = v_exercise_id;
        select pr.value into v_prev_record from personal_records pr
          where pr.player_id = v_player_id and pr.exercise_id = v_exercise_id;

        if v_prev_record is null then
          insert into personal_records (player_id, exercise_id, value) values (v_player_id, v_exercise_id, v_doel_raw)
            on conflict (player_id, exercise_id) do update set value = excluded.value;
          v_doel := 1;
        elsif (case when v_higher_is_better then v_doel_raw > v_prev_record else v_doel_raw < v_prev_record end) then
          update personal_records set value = v_doel_raw
            where player_id = v_player_id and exercise_id = v_exercise_id;
          select exists(
            select 1 from cycle_bonuses where player_id = v_player_id and assignment_id = v_assignment_id
          ) into v_bonus_used;
          if v_bonus_used then
            v_doel := 1;
          else
            insert into cycle_bonuses (player_id, assignment_id) values (v_player_id, v_assignment_id)
              on conflict (player_id, assignment_id) do nothing;
            v_doel := 2;
            v_any_record := true;
          end if;
        else
          v_doel := 1;
        end if;
      end if;
    end if;

    insert into training_scores (training_id, player_id, openingsspel, doel, doel_raw, wedstrijd)
      values (v_training_id, v_player_id, v_openingsspel, v_doel, v_doel_raw, v_wedstrijd)
    on conflict (training_id, player_id) do update
      set openingsspel = excluded.openingsspel,
          doel = excluded.doel,
          doel_raw = excluded.doel_raw,
          wedstrijd = excluded.wedstrijd;

    if v_openingsspel > 0 or v_doel > 0 or v_wedstrijd <> '' then
      v_summary := v_summary || jsonb_build_object(
          'name', (select name from players where id = v_player_id),
          'openingsspel', v_openingsspel, 'doel', v_doel, 'wedstrijd', v_wedstrijd
        );
    end if;
  end loop;

  insert into audit_log (by_name, action, training_date, summary, previous_summary)
    values (p_actor, v_action, p_date, v_summary, v_prev_summary);

  return jsonb_build_object('training_id', v_training_id, 'any_record', v_any_record);
end;
$$;

revoke all on function public.submit_training(date, jsonb, text) from public;
grant execute on function public.submit_training(date, jsonb, text) to authenticated;

-- ---------------------------------------------------------------
-- delete_training
-- ---------------------------------------------------------------
create or replace function public.delete_training(p_training_id uuid, p_actor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_summary jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select date into v_date from trainings where id = p_training_id;
  if v_date is null then
    raise exception 'Training niet gevonden';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.name, 'openingsspel', ts.openingsspel, 'doel', ts.doel, 'wedstrijd', ts.wedstrijd
    )), '[]'::jsonb)
    into v_summary
    from training_scores ts join players p on p.id = ts.player_id
    where ts.training_id = p_training_id
      and (ts.openingsspel > 0 or ts.doel > 0 or coalesce(ts.wedstrijd, '') <> '');

  delete from trainings where id = p_training_id;

  insert into audit_log (by_name, action, training_date, summary)
    values (p_actor, 'verwijderd', v_date, v_summary);
end;
$$;

revoke all on function public.delete_training(uuid, text) from public;
grant execute on function public.delete_training(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- set_goal: nieuw Recordboek-doel kiezen, met dezelfde regels als het
-- artifact: geen directe herhaling van je huidige doel, en Net/Veld zijn
-- schaars (maar delen met hetzelfde doel mag altijd).
-- ---------------------------------------------------------------
create or replace function public.set_goal(p_player_id uuid, p_exercise_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise record;
  v_current record;
  v_conflict record;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select id, name, station into v_exercise from exercises where id = p_exercise_id;
  if v_exercise.id is null then
    raise exception 'Oefening bestaat niet';
  end if;

  select exercise_id, exercise_name, chosen_at, assignment_id into v_current
    from goals where player_id = p_player_id;

  if v_current.exercise_id is not null and v_current.exercise_id = p_exercise_id then
    raise exception 'Dit is al je huidige doel — kies dit niet direct opnieuw.';
  end if;

  if v_exercise.station in ('Net', 'Veld') then
    select e.id, e.name into v_conflict
      from goals g join exercises e on e.id = g.exercise_id
      where g.player_id <> p_player_id and e.station = v_exercise.station and e.id <> v_exercise.id
      limit 1;
    if v_conflict.id is not null then
      raise exception '% is al bezet met "%"', v_exercise.station, v_conflict.name;
    end if;
  end if;

  if v_current.exercise_id is not null then
    insert into goal_history (player_id, exercise_id, exercise_name, chosen_at, assignment_id, ended_at)
      values (p_player_id, v_current.exercise_id, v_current.exercise_name, v_current.chosen_at, v_current.assignment_id, current_date);
  end if;

  insert into goals (player_id, exercise_id, exercise_name, chosen_at, assignment_id)
    values (p_player_id, v_exercise.id, v_exercise.name, current_date, gen_random_uuid())
  on conflict (player_id) do update
    set exercise_id = excluded.exercise_id,
        exercise_name = excluded.exercise_name,
        chosen_at = excluded.chosen_at,
        assignment_id = excluded.assignment_id;
end;
$$;

revoke all on function public.set_goal(uuid, text) from public;
grant execute on function public.set_goal(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- close_period: alleen de trainer mag dit; sluit de actieve periode af en
-- opent een nieuwe (het Clausement reset, het Recordboek niet).
-- ---------------------------------------------------------------
create or replace function public.close_period(p_actor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active record;
begin
  if not is_trainer() then
    raise exception 'Alleen de trainer kan een periode afronden';
  end if;

  select id, number into v_active from periods where end_date is null;
  if v_active.id is null then
    raise exception 'Geen actieve periode gevonden';
  end if;

  update periods set end_date = current_date where id = v_active.id;
  insert into periods (number, start_date, end_date) values (v_active.number + 1, current_date, null);
end;
$$;

revoke all on function public.close_period(text) from public;
grant execute on function public.close_period(text) to authenticated;

-- ---------------------------------------------------------------
-- Startdata: eerste periode + lege teamdoel-rij
-- ---------------------------------------------------------------
insert into periods (number, start_date, end_date)
  select 1, current_date, null
  where not exists (select 1 from periods);

insert into team_goal (id, target) values (true, null)
  on conflict (id) do nothing;
