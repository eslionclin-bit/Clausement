-- Bug (al aanwezig vóór alle recente wijzigingen): delete_training() haalde
-- een verwijderde training wel uit trainings/training_scores, maar liet
-- personal_records en cycle_bonuses onaangeroerd. Een record of bonus die
-- via een later verwijderde training was verdiend, bleef daardoor als
-- "geestrestant" bestaan en beïnvloedde onterecht latere, echte invoer
-- (zichtbaar geworden bij Anne: haar bonus voor het huidige doel was al
-- "verbruikt" door een testtraining die allang verwijderd was).
--
-- recompute_player_records(player_id) herberekent personal_records,
-- cycle_bonuses, player_improvement_counts én training_scores.doel voor
-- één speler helemaal opnieuw, puur op basis van de nog bestaande
-- doel_raw-waarden (die worden nooit overschreven, dus zijn altijd de
-- brontruth) — chronologisch per doel-toewijzing, met dezelfde vergelijking
-- als submit_training(). Persoonlijke records lopen door over meerdere
-- toewijzingen van dezelfde oefening heen (kies je een oefening later
-- opnieuw, dan tel je verder vanaf je oude record); de bonus-cyclus reset
-- wel per toewijzing.
--
-- delete_training() roept dit voortaan automatisch aan voor iedereen die in
-- de verwijderde training een doel-score had — dit probleem kan dus niet
-- meer terugkomen. Onderaan deze migratie draait het ook één keer voor alle
-- huidige spelers, om bestaande scheefgroei (zoals bij Anne) recht te
-- zetten.

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
-- delete_training: zelfde als voorheen, plus automatisch herstel van de
-- betrokken spelers hun records/bonussen/verbeteringen na het verwijderen.
-- ---------------------------------------------------------------
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
  v_affected_players uuid[];
  v_player_id uuid;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select date, entered_at into v_date, v_entered_at from trainings where id = p_training_id;
  if v_date is null then
    raise exception 'Training niet gevonden';
  end if;

  if not is_trainer() and current_date - v_entered_at::date > 1 then
    raise exception 'Deze training kan niet meer verwijderd worden door een speler — vraag de trainer.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.name, 'openingsspel', ts.openingsspel, 'doel', ts.doel, 'wedstrijd', ts.wedstrijd
    )), '[]'::jsonb)
    into v_summary
    from training_scores ts join players p on p.id = ts.player_id
    where ts.training_id = p_training_id
      and (ts.openingsspel > 0 or ts.doel > 0 or coalesce(ts.wedstrijd, '') <> '');

  select array_agg(distinct player_id) into v_affected_players
    from training_scores where training_id = p_training_id and doel_raw is not null;

  delete from trainings where id = p_training_id;

  insert into audit_log (by_name, action, training_date, summary)
    values (p_actor, 'verwijderd', v_date, v_summary);

  if v_affected_players is not null then
    foreach v_player_id in array v_affected_players loop
      perform public.recompute_player_records(v_player_id);
    end loop;
  end if;
end;
$$;

revoke all on function public.delete_training(uuid, text) from public;
grant execute on function public.delete_training(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- Eenmalig herstel: reken alle huidige spelers opnieuw door, zodat
-- bestaande scheefgroei (zoals bij Anne) meteen recht wordt gezet.
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
