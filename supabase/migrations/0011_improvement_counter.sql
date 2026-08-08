-- Verbeteringen-teller per speler, en het teamdoel ("SAMEN") voortaan
-- gevuld door deze teller op te tellen over het hele team i.p.v. de som
-- van alle doel-punten. Elke recordverbetering telt mee, niet alleen de
-- eerste per doel-cyclus (die al een bonuspunt oplevert) — de teller loopt
-- dus los van de bestaande punten-/bonuslogica, die ongewijzigd blijft.

create table if not exists player_improvement_counts (
  player_id uuid primary key references players (id) on delete cascade,
  count int not null default 0
);

alter table player_improvement_counts enable row level security;

drop policy if exists "player_improvement_counts_select" on player_improvement_counts;
create policy "player_improvement_counts_select" on player_improvement_counts
  for select to authenticated using (true);

-- ---------------------------------------------------------------
-- submit_training: zelfde logica als voorheen (0010_edit_window_two_days.sql,
-- de meest recente versie — inclusief het 2-daagse bewerk-venster), met één
-- toevoeging in de "verbeterd"-tak — ophogen ongeacht of de cyclus-bonus
-- die keer al gebruikt was.
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
-- start_new_season: zelfde als voorheen, met de nieuwe teller er ook bij
-- gewist (anders overleeft die een nieuw seizoen terwijl al het andere op
-- nul begint).
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
  delete from trainings where true; -- cascadeert naar training_scores
  delete from periods where true;

  insert into periods (number, start_date, end_date) values (1, p_start_date, null);

  insert into audit_log (by_name, action, training_date, summary)
    values (p_actor, 'seizoen gestart', p_start_date, '[]'::jsonb);
end;
$$;

revoke all on function public.start_new_season(text, date) from public;
grant execute on function public.start_new_season(text, date) to authenticated;
