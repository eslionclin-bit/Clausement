-- Teamdoel/SAMEN moet voortaan gevuld worden door élke poging (elke keer
-- dat iemand een score op haar doel invoert) plús élke verbetering — los
-- van de eenmalige bonus-cap per doel-cyclus die alleen voor de individuele
-- doel-punten geldt. Nieuwe tabel player_attempt_counts telt dat apart bij.

create table if not exists player_attempt_counts (
  player_id uuid primary key references players (id) on delete cascade,
  count int not null default 0
);

alter table player_attempt_counts enable row level security;

drop policy if exists "player_attempt_counts_select" on player_attempt_counts;
create policy "player_attempt_counts_select" on player_attempt_counts
  for select to authenticated using (true);

-- ---------------------------------------------------------------
-- submit_training: zelfde logica als voorheen (0011_improvement_counter.sql),
-- met één toevoeging — elke geldige poging (een doel gekozen én een score
-- ingevoerd) telt mee in player_attempt_counts, ongeacht of het een
-- verbetering is.
-- ---------------------------------------------------------------
create or replace function public.submit_training(p_date date, p_entries jsonb, p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_training_id uuid;
  v_entered_at timestamptz;
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

  if p_date > current_date then
    raise exception 'Je kunt geen training voor een datum in de toekomst invoeren.';
  end if;

  select id, entered_at into v_training_id, v_entered_at from trainings where date = p_date;

  if v_training_id is null then
    insert into trainings (date, entered_by, entered_at) values (p_date, p_actor, now())
      returning id into v_training_id;
    v_action := 'aangemaakt';
  else
    if not is_trainer() and current_date - v_entered_at::date > 1 then
      raise exception 'Deze training kan niet meer gewijzigd worden door een speler — vraag de trainer.';
    end if;

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
        insert into player_attempt_counts (player_id, count) values (v_player_id, 1)
          on conflict (player_id) do update set count = player_attempt_counts.count + 1;

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

          insert into player_improvement_counts (player_id, count) values (v_player_id, 1)
            on conflict (player_id) do update set count = player_improvement_counts.count + 1;

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
-- recompute_player_records: zelfde herberekening als voorheen
-- (0013_recompute_records_on_delete.sql), nu met player_attempt_counts
-- erbij — elke verwerkte poging telt, ongeacht of het een verbetering is.
-- ---------------------------------------------------------------
create or replace function public.recompute_player_records(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_entry record;
  v_higher_is_better boolean;
  v_best numeric;
  v_bonus_claimed boolean;
  v_exercise_best jsonb := '{}'::jsonb;
begin
  delete from personal_records where player_id = p_player_id;
  delete from cycle_bonuses where player_id = p_player_id;
  delete from player_improvement_counts where player_id = p_player_id;
  delete from player_attempt_counts where player_id = p_player_id;

  for v_assignment in
    select exercise_id, chosen_at, assignment_id, ended_at
      from goal_history where player_id = p_player_id
    union all
    select exercise_id, chosen_at, assignment_id, null::date as ended_at
      from goals where player_id = p_player_id and exercise_id is not null
    order by chosen_at asc
  loop
    select higher_is_better into v_higher_is_better from exercises where id = v_assignment.exercise_id;
    if v_higher_is_better is null then
      continue;
    end if;

    v_best := (v_exercise_best ->> v_assignment.exercise_id)::numeric;
    v_bonus_claimed := false;

    for v_entry in
      select ts.training_id, ts.doel_raw
        from training_scores ts
        join trainings tr on tr.id = ts.training_id
        where ts.player_id = p_player_id
          and ts.doel_raw is not null
          and tr.date >= v_assignment.chosen_at
          and (v_assignment.ended_at is null or tr.date < v_assignment.ended_at)
        order by tr.date asc
    loop
      insert into player_attempt_counts (player_id, count) values (p_player_id, 1)
        on conflict (player_id) do update set count = player_attempt_counts.count + 1;

      if v_best is null then
        v_best := v_entry.doel_raw;
        update training_scores set doel = 1 where training_id = v_entry.training_id and player_id = p_player_id;
      elsif (case when v_higher_is_better then v_entry.doel_raw > v_best else v_entry.doel_raw < v_best end) then
        v_best := v_entry.doel_raw;
        if v_bonus_claimed then
          update training_scores set doel = 1 where training_id = v_entry.training_id and player_id = p_player_id;
        else
          v_bonus_claimed := true;
          update training_scores set doel = 2 where training_id = v_entry.training_id and player_id = p_player_id;
        end if;
        insert into player_improvement_counts (player_id, count) values (p_player_id, 1)
          on conflict (player_id) do update set count = player_improvement_counts.count + 1;
      else
        update training_scores set doel = 1 where training_id = v_entry.training_id and player_id = p_player_id;
      end if;
    end loop;

    v_exercise_best := jsonb_set(v_exercise_best, array[v_assignment.exercise_id], to_jsonb(v_best));

    if v_bonus_claimed then
      insert into cycle_bonuses (player_id, assignment_id) values (p_player_id, v_assignment.assignment_id)
        on conflict (player_id, assignment_id) do nothing;
    end if;
  end loop;

  insert into personal_records (player_id, exercise_id, value)
    select p_player_id, key, value::numeric
      from jsonb_each_text(v_exercise_best)
  on conflict (player_id, exercise_id) do update set value = excluded.value;
end;
$$;

revoke all on function public.recompute_player_records(uuid) from public;
grant execute on function public.recompute_player_records(uuid) to authenticated;

-- ---------------------------------------------------------------
-- start_new_season: zelfde als voorheen, met player_attempt_counts erbij
-- gewist.
-- ---------------------------------------------------------------
create or replace function public.start_new_season(p_actor text, p_start_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_trainer() then
    raise exception 'Alleen de trainer kan een nieuw seizoen starten';
  end if;

  delete from cycle_bonuses where true;
  delete from personal_records where true;
  delete from goal_history where true;
  delete from goals where true;
  delete from player_improvement_counts where true;
  delete from player_attempt_counts where true;
  delete from trainings where true; -- cascadeert naar training_scores
  delete from periods where true;

  insert into periods (number, start_date, end_date) values (1, p_start_date, null);

  insert into audit_log (by_name, action, training_date, summary)
    values (p_actor, 'seizoen gestart', p_start_date, '[]'::jsonb);
end;
$$;

revoke all on function public.start_new_season(text, date) from public;
grant execute on function public.start_new_season(text, date) to authenticated;

-- ---------------------------------------------------------------
-- Eenmalig: vul player_attempt_counts met terugwerkende kracht voor alle
-- huidige spelers (recompute_player_records doet dit voortaan altijd mee).
-- ---------------------------------------------------------------
do $$
declare
  v_player_id uuid;
begin
  for v_player_id in select id from players loop
    perform public.recompute_player_records(v_player_id);
  end loop;
end;
$$;
