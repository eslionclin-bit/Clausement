-- Eigen Recordboek-oefeningen mochten tot nu toe door elke speelster worden
-- gewijzigd (0004_beheer_updates.sql), alleen verwijderen was al
-- trainer-only (0017_exercise_delete_trainer_only.sql). Dat wordt nu: alleen
-- de maker (of de trainer) mag een eigen oefening nog wijzigen.
--
-- Zelfde kanttekening als bij het rivaal-systeem (zie
-- 0008_rivalries.sql): dit project heeft bewust geen echte per-speler login,
-- dus "maker" wordt hier vastgelegd en gecontroleerd via de client-opgegeven
-- naam (created_by/p_actor) — hetzelfde vertrouwensniveau als submit_training,
-- set_goal en het rivaal-systeem, niet een harde databasegarantie zoals bij
-- de trainer (die wél een echt e-mailadres heeft).
--
-- Bestaande eigen oefeningen hebben geen bekende maker (created_by is null)
-- — die blijven, net als nu, voor iedereen wijzigbaar totdat ze voor het
-- eerst via update_custom_exercise() bewerkt worden (waarna created_by wél
-- vastligt). Geen harde breuk voor bestaande data.

alter table exercises add column if not exists created_by text;

-- Schrijven gaat voortaan uitsluitend via de functies hieronder, net als
-- bij trainingen/doelen/rivaliteiten — geen directe insert/update policy
-- meer nodig. exercises_delete (trainer-only) blijft ongewijzigd staan.
drop policy if exists "exercises_insert" on exercises;
drop policy if exists "exercises_update" on exercises;

create or replace function public.add_custom_exercise(
  p_actor text,
  p_cat text,
  p_station text,
  p_name text,
  p_metric text,
  p_higher_is_better boolean,
  p_desc text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := 'custom-' || gen_random_uuid();
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  insert into exercises (id, cat, station, name, metric, higher_is_better, description, is_custom, created_by)
    values (v_id, p_cat, p_station, p_name, p_metric, p_higher_is_better, p_desc, true, p_actor);

  return v_id;
end;
$$;

revoke all on function public.add_custom_exercise(text, text, text, text, text, boolean, text) from public;
grant execute on function public.add_custom_exercise(text, text, text, text, text, boolean, text) to authenticated;

create or replace function public.update_custom_exercise(
  p_id text,
  p_actor text,
  p_cat text,
  p_station text,
  p_name text,
  p_metric text,
  p_higher_is_better boolean,
  p_desc text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Niet ingelogd';
  end if;

  select is_custom, created_by into v_row from exercises where id = p_id;
  if v_row.is_custom is null then
    raise exception 'Oefening niet gevonden';
  end if;
  if not v_row.is_custom then
    raise exception 'Basisoefeningen kunnen niet gewijzigd worden';
  end if;
  if v_row.created_by is not null and v_row.created_by <> p_actor and not is_trainer() then
    raise exception 'Alleen de speelster die deze oefening heeft aangemaakt (of de trainer) mag hem wijzigen';
  end if;

  update exercises set
      cat = p_cat,
      station = p_station,
      name = p_name,
      metric = p_metric,
      higher_is_better = p_higher_is_better,
      description = p_desc
    where id = p_id;
end;
$$;

revoke all on function public.update_custom_exercise(text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.update_custom_exercise(text, text, text, text, text, text, boolean, text) to authenticated;
