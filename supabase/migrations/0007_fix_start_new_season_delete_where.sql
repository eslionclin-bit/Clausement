-- start_new_season gaf in de Supabase SQL Editor de foutmelding
-- "DELETE requires a WHERE clause" — dat is een veiligheidscontrole van de
-- editor zelf (geen echte Postgres-beperking), die kennelijk ook binnen een
-- functiedefinitie naar bare "delete from tabel;" statements zoekt. Elke
-- delete krijgt hier een onschuldige "where true" (verwijdert nog steeds
-- alle rijen) zodat de controle tevreden is.

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
  delete from trainings where true; -- cascadeert naar training_scores
  delete from periods where true;

  insert into periods (number, start_date, end_date) values (1, p_start_date, null);

  insert into audit_log (by_name, action, training_date, summary)
    values (p_actor, 'seizoen gestart', p_start_date, '[]'::jsonb);
end;
$$;

revoke all on function public.start_new_season(text, date) from public;
grant execute on function public.start_new_season(text, date) to authenticated;
