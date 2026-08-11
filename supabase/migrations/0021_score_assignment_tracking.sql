-- Bug: "beste score" per doel-toewijzing (Standen/Recordboek) en de
-- herberekening bij verwijderen/vroeg-wisselen (recompute_player_records)
-- bepaalden tot nu toe ACHTERAF, via een datumreeks-vergelijking
-- (training.date vs goals.chosen_at/ended_at), bij welke doel-toewijzing
-- een score hoorde. Dat klopt niet meer zodra een score voor een datum
-- wordt ingevoerd/gewijzigd die niet netjes chronologisch aansluit bij
-- wanneer het doel gekozen is (bv. een trainer die een eerdere datum later
-- nog invult) — dan kan een score aan de verkeerde (of geen) toewijzing
-- worden toegerekend, met een te lage "beste score" tot gevolg.
--
-- Fix: leg per score vast bij welke toewijzing (assignment_id + exercise_id)
-- hij hoorde, op het moment van opslaan — dat is exact, in plaats van een
-- datum-gok achteraf. submit_training slaat dit voortaan direct op;
-- recompute_player_records gebruikt het i.p.v. datumreeksen.

alter table training_scores add column if not exists assignment_id uuid;
alter table training_scores add column if not exists exercise_id text references exercises (id);

-- Eenmalige, best-effort terugvulling van bestaande scores met dezelfde
-- datumreeks-logica die hiervoor ook al (impliciet) gebruikt werd — dit legt
-- alleen vast wat de app tot nu toe al aannam. Scores van vóór de vroegst
-- bekende toewijzing van een speler blijven ongekoppeld (assignment_id/
-- exercise_id null) — die telden ook voorheen al niet mee voor een doel.
do $$
declare
  v_player record;
  v_assignment record;
begin
  for v_player in select id from players loop
    for v_assignment in
      select exercise_id, chosen_at, assignment_id, ended_at
        from goal_history where player_id = v_player.id
      union all
      select exercise_id, chosen_at, assignment_id, null::date as ended_at
        from goals where player_id = v_player.id and exercise_id is not null
      order by chosen_at asc
    loop
      update training_scores ts
        set assignment_id = v_assignment.assignment_id,
            exercise_id = v_assignment.exercise_id
        from trainings tr
        where tr.id = ts.training_id
          and ts.player_id = v_player.id
          and ts.doel_raw is not null
          and tr.date >= v_assignment.chosen_at
          and (v_assignment.ended_at is null or tr.date < v_assignment.ended_at);
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- submit_training: zelfde logica als voorheen (0014_team_progress_attempts.sql),
-- legt nu ook assignment_id/exercise_id per score vast.
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

    insert into training_scores (training_id, player_id, openingsspel, doel, doel_raw, wedstrijd, assignment_id, exercise_id)
      values (v_training_id, v_player_id, v_openingsspel, v_doel, v_doel_raw, v_wedstrijd, v_assignment_id, v_exercise_id)
    on conflict (training_id, player_id) do update
      set openingsspel = excluded.openingsspel,
          doel = excluded.doel,
          doel_raw = excluded.doel_raw,
          wedstrijd = excluded.wedstrijd,
          assignment_id = excluded.assignment_id,
          exercise_id = excluded.exercise_id;

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
-- recompute_player_records: groepeert nu op de exact vastgelegde
-- assignment_id/exercise_id per score, in plaats van een datumreeks-gok.
-- Persoonlijke records lopen door tussen toewijzingen van dezelfde oefening
-- (ongewijzigd gedrag, chronologisch op trainingsdatum); de bonus-cap (1x
-- per toewijzing) wordt per assignment_id bijgehouden via een kaart, zodat
-- het ook klopt als scores van verschillende toewijzingen door elkaar heen
-- gedateerd zijn (bv. een backdated invoer terwijl de speler intussen al
-- een nieuw doel heeft).
-- ---------------------------------------------------------------
create or replace function public.recompute_player_records(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_higher_is_better boolean;
  v_best numeric;
  v_bonus_claimed boolean;
  v_exercise_best jsonb := '{}'::jsonb;
  v_bonus_claimed_map jsonb := '{}'::jsonb;
begin
  delete from personal_records where player_id = p_player_id;
  delete from cycle_bonuses where player_id = p_player_id;
  delete from player_improvement_counts where player_id = p_player_id;
  delete from player_attempt_counts where player_id = p_player_id;

  for v_row in
    select ts.training_id, ts.doel_raw, ts.assignment_id, ts.exercise_id
      from training_scores ts
      join trainings tr on tr.id = ts.training_id
      where ts.player_id = p_player_id
        and ts.doel_raw is not null
        and ts.assignment_id is not null
      order by tr.date asc
  loop
    select higher_is_better into v_higher_is_better from exercises where id = v_row.exercise_id;
    if v_higher_is_better is null then
      continue;
    end if;

    insert into player_attempt_counts (player_id, count) values (p_player_id, 1)
      on conflict (player_id) do update set count = player_attempt_counts.count + 1;

    v_best := (v_exercise_best ->> v_row.exercise_id)::numeric;
    v_bonus_claimed := coalesce((v_bonus_claimed_map ->> v_row.assignment_id::text)::boolean, false);

    if v_best is null then
      v_best := v_row.doel_raw;
      update training_scores set doel = 1 where training_id = v_row.training_id and player_id = p_player_id;
    elsif (case when v_higher_is_better then v_row.doel_raw > v_best else v_row.doel_raw < v_best end) then
      v_best := v_row.doel_raw;
      insert into player_improvement_counts (player_id, count) values (p_player_id, 1)
        on conflict (player_id) do update set count = player_improvement_counts.count + 1;
      if v_bonus_claimed then
        update training_scores set doel = 1 where training_id = v_row.training_id and player_id = p_player_id;
      else
        v_bonus_claimed_map := jsonb_set(v_bonus_claimed_map, array[v_row.assignment_id::text], 'true'::jsonb);
        update training_scores set doel = 2 where training_id = v_row.training_id and player_id = p_player_id;
        insert into cycle_bonuses (player_id, assignment_id) values (p_player_id, v_row.assignment_id)
          on conflict (player_id, assignment_id) do nothing;
      end if;
    else
      update training_scores set doel = 1 where training_id = v_row.training_id and player_id = p_player_id;
    end if;

    v_exercise_best := jsonb_set(v_exercise_best, array[v_row.exercise_id], to_jsonb(v_best));
  end loop;

  insert into personal_records (player_id, exercise_id, value)
    select p_player_id, key, value::numeric
      from jsonb_each_text(v_exercise_best)
  on conflict (player_id, exercise_id) do update set value = excluded.value;
end;
$$;

revoke all on function public.recompute_player_records(uuid) from public;
grant execute on function public.recompute_player_records(uuid) to authenticated;

-- Herbereken meteen voor alle spelers, zodat bestaande data de nieuwe,
-- exacte toerekening gebruikt i.p.v. de oude datum-gok.
do $$
declare
  v_player_id uuid;
begin
  for v_player_id in select id from players loop
    perform public.recompute_player_records(v_player_id);
  end loop;
end;
$$;
