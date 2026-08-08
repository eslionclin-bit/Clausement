-- Doel wisselen wordt een harde blokkade i.p.v. vrijblijvend advies: een
-- speler mag pas van doel wisselen nadat ze het huidige doel minstens 4x
-- geoefend heeft (score ingevoerd) — anders zou wisselen zelf een
-- sluiproute worden om makkelijk aan het "+1 punt voor eerste score bij een
-- nieuw doel" te komen. De trainer is hiervan uitgezonderd (legitieme
-- uitzonderingen: blessure, verkeerd gekozen doel) — is_trainer() bypast de
-- telling volledig. Alle overige regels (geen directe herhaling, Net/Veld
-- schaarste) blijven voor iedereen gelden, ook de trainer.

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
  v_aantal int;
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
      raise exception 'Je kunt pas wisselen na 4x oefenen — dit voorkomt dat wisselen zelf een sluiproute naar extra punten wordt. (% van de 4x)', v_aantal;
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
end;
$$;

revoke all on function public.set_goal(uuid, text) from public;
grant execute on function public.set_goal(uuid, text) to authenticated;
