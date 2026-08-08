-- Doel wisselen was een harde blokkade (0009_goal_switch_cooldown.sql):
-- pas na 4x oefenen mocht een speler zelf wisselen. Dat wordt nu een
-- zachte straf i.p.v. een blokkade: spelers mogen altijd wisselen, maar
-- wisselen ze vóór 4x oefenen, dan vervallen hun scores én hun
-- persoonlijk record van het huidige doel — alsof ze er nooit aan
-- begonnen waren. De trainer blijft hiervan uitgezonderd (net als
-- voorheen bij de 4x-blokkade).
--
-- Vervallen scores worden geregeld door de doel_raw-waarden van de
-- lopende toewijzing op null te zetten (en de bijbehorende doel-punten op
-- 0), en daarna recompute_player_records() te laten herberekenen — dat
-- rekent dan vanzelf verder vanaf het record van vóór deze cyclus, net
-- zoals bij het repareren van een verwijderde training.

create or replace function public.set_goal(p_player_id uuid, p_exercise_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise record;
  v_current record;
  v_conflict record;
  v_aantal int;
  v_vervallen boolean := false;
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

  if v_current.exercise_id is not null and not is_trainer() then
    select count(*) into v_aantal
      from training_scores ts
      join trainings tr on tr.id = ts.training_id
      where ts.player_id = p_player_id
        and ts.doel_raw is not null
        and tr.date >= v_current.chosen_at;

    if v_aantal < 4 then
      v_vervallen := true;
      update training_scores set doel_raw = null, doel = 0
        where player_id = p_player_id
          and doel_raw is not null
          and training_id in (select id from trainings where date >= v_current.chosen_at);
    end if;
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

  if v_vervallen then
    perform public.recompute_player_records(p_player_id);
  end if;

  return jsonb_build_object('vervallen', v_vervallen);
end;
$$;

revoke all on function public.set_goal(uuid, text) from public;
grant execute on function public.set_goal(uuid, text) to authenticated;
