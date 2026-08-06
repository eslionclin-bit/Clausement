-- Bewerk-venster voor ingevoerde scores: spelers mogen een bestaande
-- training alleen nog wijzigen/verwijderen op dezelfde kalenderdag als de
-- oorspronkelijke invoer (trainings.entered_at). Daarna alleen de trainer,
-- ongeacht hoe lang geleden. Nieuwe invoer (nog niet bestaande datum) blijft
-- onbeperkt voor iedereen — dat is het duo-principe (de tellende partner
-- voert vaak de score van de ander in).
--
-- Vervangt submit_training/delete_training uit 0001_init.sql met exact
-- dezelfde logica, plus deze ene extra check.

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

  select id, entered_at into v_training_id, v_entered_at from trainings where date = p_date;

  if v_training_id is null then
    insert into trainings (date, entered_by, entered_at) values (p_date, p_actor, now())
      returning id into v_training_id;
    v_action := 'aangemaakt';
  else
    if not is_trainer() and v_entered_at::date <> current_date then
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

create or replace function public.delete_training(p_training_id uuid, p_actor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_entered_at timestamptz;
  v_summary jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select date, entered_at into v_date, v_entered_at from trainings where id = p_training_id;
  if v_date is null then
    raise exception 'Training niet gevonden';
  end if;

  if not is_trainer() and v_entered_at::date <> current_date then
    raise exception 'Deze training kan niet meer verwijderd worden door een speler — vraag de trainer.';
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

revoke all on function public.submit_training(date, jsonb, text) from public;
grant execute on function public.submit_training(date, jsonb, text) to authenticated;
revoke all on function public.delete_training(uuid, text) from public;
grant execute on function public.delete_training(uuid, text) to authenticated;
